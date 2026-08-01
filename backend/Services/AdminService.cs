using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.DTOs.Admin;
using Auto_Wash.DTOs.Reward;
using Auto_Wash.Helpers;

namespace Auto_Wash.Services
{
    public class AdminService
    {
        private readonly AutoWashDbContext _context;
        private readonly LoyaltyTierService _loyaltyTierService;
        private readonly ILogger<AdminService> _logger;

        public AdminService(AutoWashDbContext context, LoyaltyTierService loyaltyTierService, ILogger<AdminService> logger)
        {
            _context = context;
            _loyaltyTierService = loyaltyTierService;
            _logger = logger;
        }

        public async Task<object> GetDashboardStatsAsync(DateTime? fromDate = null, DateTime? toDate = null, string groupBy = "day")
        {
            var today = DateTime.Today;

            // ── Phase 3: Date Filtering & Timezone Normalization ──
            var periodTo = (toDate?.Date) ?? today;
            var periodFrom = (fromDate?.Date) ?? periodTo.AddDays(-6);
            if (periodFrom > periodTo) periodFrom = periodTo;
            var periodEndEx = periodTo.AddDays(1); // inclusive of full end date

            // ── 1. Today's Summary (Strictly for today using event timestamps) ──
            int bookingsToday = await _context.Bookings
                .CountAsync(b => b.ScheduledAt.Date == today);

            int completedToday = await _context.Bookings
                .CountAsync(b => b.Status == BookingStatus.Completed
                              && ((b.CompletedAt.HasValue && b.CompletedAt.Value.Date == today)
                                  || (b.Payment != null && b.Payment.PaidAt.HasValue && b.Payment.PaidAt.Value.Date == today)));

            int cancelledToday = await _context.Bookings
                .CountAsync(b => b.Status == BookingStatus.Cancelled
                              && b.CancelledAt.HasValue && b.CancelledAt.Value.Date == today);

            int noShowToday = await _context.Bookings
                .CountAsync(b => b.Status == BookingStatus.NoShow
                              && ((b.NoShowAt.HasValue && b.NoShowAt.Value.Date == today)
                                  || (b.ScheduledAt.Date == today)));

            long netRevenueToday = await _context.Payments
                .Where(p => p.Status == (int)PaymentStatus.Paid && p.PaidAt != null && p.PaidAt.Value.Date == today)
                .SumAsync(p => (long)p.Amount);

            var todaySummary = new
            {
                bookingsToday,
                completedToday,
                cancelledToday,
                noShowToday,
                netRevenueToday
            };

            // ── 2. Unified Period Revenue Dataset (Paid Payments + Completed Bookings) ──
            var paidPayments = await _context.Payments
                .AsNoTracking()
                .Include(p => p.Booking)
                .Where(p => p.Status == (int)PaymentStatus.Paid && p.PaidAt != null
                         && p.PaidAt.Value >= periodFrom && p.PaidAt.Value < periodEndEx)
                .ToListAsync();

            var paidBookingIds = paidPayments.Select(p => p.BookingId).ToHashSet();

            var extraCompletedBookings = await _context.Bookings
                .AsNoTracking()
                .Include(b => b.Payment)
                .Where(b => b.Status == BookingStatus.Completed
                         && !paidBookingIds.Contains(b.BookingId)
                         && ((b.CompletedAt != null && b.CompletedAt >= periodFrom && b.CompletedAt < periodEndEx)
                             || (b.CreatedAt >= periodFrom && b.CreatedAt < periodEndEx)))
                .ToListAsync();

            // Integrity guard: reconcile per-row gross so the invariant Gross >= Net always holds
            // even when a booking record is corrupt (e.g. FinalPrice/Amount stored higher than
            // BasePrice with no matching discount). GrossPrice = max(BasePrice, Amount + discounts).
            var periodPayRows = paidPayments.Select(p =>
            {
                int amount = p.Amount > 0 ? p.Amount : (p.Booking != null ? p.Booking.FinalPrice : 0);
                int basePrice = p.Booking != null ? p.Booking.BasePrice : p.Amount;
                int promoDiscount = p.Booking != null ? p.Booking.PromoDiscount : 0;
                int tierDiscount = p.Booking != null ? p.Booking.TierDiscount : 0;
                int pointsDiscount = p.Booking != null ? p.Booking.PointsDiscount : 0;
                return new
                {
                    PaymentId = p.PaymentId,
                    BookingId = p.BookingId,
                    Amount = amount,
                    PaymentMethod = p.PaymentMethod,
                    PaidAt = p.PaidAt ?? p.CreatedAt,
                    CustomerId = p.Booking != null ? (int?)p.Booking.CustomerId : null,
                    BasePrice = basePrice,
                    GrossPrice = Math.Max(basePrice, amount + promoDiscount + tierDiscount + pointsDiscount),
                    PromoDiscount = promoDiscount,
                    TierDiscount = tierDiscount,
                    PointsDiscount = pointsDiscount,
                    FinalPrice = p.Booking != null ? p.Booking.FinalPrice : p.Amount,
                    PointsEarned = p.Booking != null ? p.Booking.PointsEarned : 0
                };
            }).ToList();

            foreach (var b in extraCompletedBookings)
            {
                periodPayRows.Add(new
                {
                    PaymentId = b.Payment?.PaymentId ?? -b.BookingId,
                    BookingId = b.BookingId,
                    Amount = b.FinalPrice,
                    PaymentMethod = b.Payment != null ? b.Payment.PaymentMethod : 1,
                    PaidAt = b.CompletedAt ?? b.Payment?.PaidAt ?? b.CreatedAt,
                    CustomerId = (int?)b.CustomerId,
                    BasePrice = b.BasePrice,
                    GrossPrice = Math.Max(b.BasePrice, b.FinalPrice + b.PromoDiscount + b.TierDiscount + b.PointsDiscount),
                    PromoDiscount = b.PromoDiscount,
                    TierDiscount = b.TierDiscount,
                    PointsDiscount = b.PointsDiscount,
                    FinalPrice = b.FinalPrice,
                    PointsEarned = b.PointsEarned
                });
            }

            // Surface corrupt rows (BasePrice understated vs Amount+discounts) so admins can fix the data.
            var inconsistentRows = periodPayRows
                .Where(r => r.GrossPrice > r.BasePrice)
                .Select(r => $"BookingId={r.BookingId} (BasePrice={r.BasePrice}, Amount={r.Amount}, Discounts={r.PromoDiscount + r.TierDiscount + r.PointsDiscount})")
                .ToList();
            if (inconsistentRows.Count > 0)
            {
                _logger.LogWarning(
                    "[DASHBOARD INTEGRITY] {Count} booking(s) have Net > pre-discount price — data likely corrupt. Reconciled Gross to keep Gross >= Net. Rows: {Rows}",
                    inconsistentRows.Count, string.Join("; ", inconsistentRows));
            }

            long grossRevenue = periodPayRows.Sum(r => (long)r.GrossPrice);
            long voucherDiscount = periodPayRows.Sum(r => (long)r.PromoDiscount);
            long loyaltyDiscount = periodPayRows.Sum(r => (long)(r.TierDiscount + r.PointsDiscount));
            long netRevenue = periodPayRows.Sum(r => (long)r.Amount);
            int paidTransactions = periodPayRows.Count;

            var revenueOverview = new
            {
                grossRevenue,
                voucherDiscount,
                loyaltyDiscount,
                netRevenue,
                paidTransactions
            };

            // ── 3. Revenue Trend Chart (Grouped by Day, Week, Month) ──
            var chartBuckets = new List<object>();
            var normGroupBy = (groupBy ?? "day").Trim().ToLowerInvariant();

            if (normGroupBy == "month")
            {
                var groupedByMonth = periodPayRows
                    .GroupBy(r => new { r.PaidAt.Year, r.PaidAt.Month })
                    .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month);

                foreach (var g in groupedByMonth)
                {
                    var dt = new DateTime(g.Key.Year, g.Key.Month, 1);
                    var label = dt.ToString("MMM yyyy", System.Globalization.CultureInfo.InvariantCulture); // e.g. "Jul 2026"
                    chartBuckets.Add(new
                    {
                        label,
                        date = $"{g.Key.Year}-{g.Key.Month:D2}-01",
                        grossRevenue = g.Sum(x => (long)x.GrossPrice),
                        voucherDiscount = g.Sum(x => (long)x.PromoDiscount),
                        loyaltyDiscount = g.Sum(x => (long)(x.TierDiscount + x.PointsDiscount)),
                        netRevenue = g.Sum(x => (long)x.Amount),
                        transactionCount = g.Count()
                    });
                }
            }
            else if (normGroupBy == "week")
            {
                var groupedByWeek = periodPayRows
                    .GroupBy(r => new {
                        Year = System.Globalization.ISOWeek.GetYear(r.PaidAt),
                        Week = System.Globalization.ISOWeek.GetWeekOfYear(r.PaidAt)
                    })
                    .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Week);

                foreach (var g in groupedByWeek)
                {
                    chartBuckets.Add(new
                    {
                        label = $"Week {g.Key.Week}", // e.g. "Week 28", "Week 29"
                        date = $"{g.Key.Year}-W{g.Key.Week:D2}",
                        grossRevenue = g.Sum(x => (long)x.GrossPrice),
                        voucherDiscount = g.Sum(x => (long)x.PromoDiscount),
                        loyaltyDiscount = g.Sum(x => (long)(x.TierDiscount + x.PointsDiscount)),
                        netRevenue = g.Sum(x => (long)x.Amount),
                        transactionCount = g.Count()
                    });
                }
            }
            else // "day" default
            {
                var spanDays = (periodEndEx - periodFrom).Days;
                var revenueByDayDict = periodPayRows
                    .GroupBy(r => r.PaidAt.Date)
                    .ToDictionary(g => g.Key, g => g.ToList());

                if (spanDays > 0 && spanDays <= 90)
                {
                    for (int i = 0; i < spanDays; i++)
                    {
                        var d = periodFrom.AddDays(i);
                        revenueByDayDict.TryGetValue(d, out var dayRows);
                        dayRows ??= new();

                        chartBuckets.Add(new
                        {
                            label = d.ToString("dd/MM"),
                            date = d.ToString("yyyy-MM-dd"),
                            grossRevenue = dayRows.Sum(x => (long)x.GrossPrice),
                            voucherDiscount = dayRows.Sum(x => (long)x.PromoDiscount),
                            loyaltyDiscount = dayRows.Sum(x => (long)(x.TierDiscount + x.PointsDiscount)),
                            netRevenue = dayRows.Sum(x => (long)x.Amount),
                            transactionCount = dayRows.Count
                        });
                    }
                }
                else
                {
                    foreach (var kv in revenueByDayDict.OrderBy(x => x.Key))
                    {
                        chartBuckets.Add(new
                        {
                            label = kv.Key.ToString("dd/MM"),
                            date = kv.Key.ToString("yyyy-MM-dd"),
                            grossRevenue = kv.Value.Sum(x => (long)x.GrossPrice),
                            voucherDiscount = kv.Value.Sum(x => (long)x.PromoDiscount),
                            loyaltyDiscount = kv.Value.Sum(x => (long)(x.TierDiscount + x.PointsDiscount)),
                            netRevenue = kv.Value.Sum(x => (long)x.Amount),
                            transactionCount = kv.Value.Count
                        });
                    }
                }
            }

            // ── 4. Payment Method Breakdown (Enum-driven) ──
            var paymentMethodBreakdown = periodPayRows
                .GroupBy(r => r.PaymentMethod)
                .Select(g => {
                    long totalAmt = g.Sum(x => (long)x.Amount);
                    double pct = netRevenue > 0 ? Math.Round((double)totalAmt / netRevenue * 100, 1) : 0;
                    return new
                    {
                        methodId = g.Key,
                        methodName = GetPaymentMethodName(g.Key),
                        totalAmount = totalAmt,
                        transactionCount = g.Count(),
                        percentageShare = pct
                    };
                })
                .OrderByDescending(x => x.totalAmount)
                .ToList();

            // ── 5. Voucher Analytics (RewardRedemptions Primary Source) ──
            int totalVouchersRedeemed = await _context.RewardRedemptions
                .CountAsync(r => r.RedeemedAt >= periodFrom && r.RedeemedAt < periodEndEx);

            int totalVouchersUsed = await _context.RewardRedemptions
                .CountAsync(r => (r.Status == RedemptionStatus.Used || r.UsedAt != null)
                              && ((r.UsedAt != null && r.UsedAt.Value >= periodFrom && r.UsedAt.Value < periodEndEx)
                                  || (r.RedeemedAt >= periodFrom && r.RedeemedAt < periodEndEx)));

            long totalDiscountValue = voucherDiscount;
            double voucherUsageRate = totalVouchersRedeemed > 0
                ? Math.Round((double)totalVouchersUsed / totalVouchersRedeemed * 100, 1)
                : 0.0;

            var voucherAnalytics = new
            {
                totalRedeemed = totalVouchersRedeemed,
                totalUsed = totalVouchersUsed,
                totalDiscountValue,
                voucherUsageRate
            };

            // ── 6. Customer Analytics (Customers & Bookings Primary Source) ──
            int totalCustomers = await _context.Customers.CountAsync();
            int newCustomers = await _context.Customers
                .CountAsync(c => c.JoinedAt >= periodFrom && c.JoinedAt < periodEndEx);

            var servedCustomerIds = await _context.Bookings
                .Where(b => b.Status == BookingStatus.Completed
                         && ((b.CompletedAt != null && b.CompletedAt >= periodFrom && b.CompletedAt < periodEndEx)
                             || (b.Payment != null && b.Payment.PaidAt != null && b.Payment.PaidAt >= periodFrom && b.Payment.PaidAt < periodEndEx)))
                .Select(b => b.CustomerId)
                .Distinct()
                .ToListAsync();

            int returningCustomersCount = await _context.Customers
                .CountAsync(c => servedCustomerIds.Contains(c.CustomerId) && c.TotalVisits > 1);

            double customerRetentionRate = servedCustomerIds.Count > 0
                ? Math.Round((double)returningCustomersCount / servedCustomerIds.Count * 100, 1)
                : 0.0;

            var customerAnalytics = new
            {
                totalCustomers,
                newCustomers,
                returningCustomers = returningCustomersCount,
                retentionRate = customerRetentionRate
            };

            // ── 7. Loyalty Analytics (LoyaltyTransactions Primary Source) ──
            int totalLoyaltyMembers = totalCustomers;

            long pointsIssued = await _context.LoyaltyTransactions
                .Where(lt => lt.TransactionType == LoyaltyTransactionType.Earn && lt.CreatedAt >= periodFrom && lt.CreatedAt < periodEndEx)
                .SumAsync(lt => (long)lt.Points);

            long pointsRedeemed = await _context.LoyaltyTransactions
                .Where(lt => lt.TransactionType == LoyaltyTransactionType.Redeem && lt.CreatedAt >= periodFrom && lt.CreatedAt < periodEndEx)
                .SumAsync(lt => (long)lt.Points);

            var tierDistributionData = await _context.Customers
                .GroupBy(c => c.Tier.TierName)
                .Select(g => new { TierName = g.Key, Count = g.Count() })
                .ToListAsync();

            var tierDist = new Dictionary<string, int> { { "Platinum", 0 }, { "Gold", 0 }, { "Silver", 0 }, { "Member", 0 } };
            foreach (var item in tierDistributionData)
            {
                var name = item.TierName;
                if (name.Contains("Platinum", StringComparison.OrdinalIgnoreCase)) tierDist["Platinum"] = item.Count;
                else if (name.Contains("Gold", StringComparison.OrdinalIgnoreCase)) tierDist["Gold"] = item.Count;
                else if (name.Contains("Silver", StringComparison.OrdinalIgnoreCase)) tierDist["Silver"] = item.Count;
                else tierDist["Member"] = item.Count;
            }

            var loyaltyAnalytics = new
            {
                totalLoyaltyMembers,
                pointsIssued,
                pointsRedeemed,
                tierDistribution = tierDist
            };

            // ── 8. Backward Compatibility & Baseline Legacy Fields ──
            var totalBookings = await _context.Bookings.CountAsync();
            var revenue7Days = netRevenue;
            var prevTotalRevenue = netRevenue;
            var monthlyRevenue = netRevenue;

            var period = new
            {
                fromDate = periodFrom.ToString("yyyy-MM-dd"),
                toDate = periodTo.ToString("yyyy-MM-dd"),
                netRevenue,
                grossRevenue,
                totalDiscount = voucherDiscount + loyaltyDiscount,
                paidCount = paidTransactions,
                bookingCount = periodPayRows.Count,
                completedCount = paidTransactions,
                pointsGranted = pointsIssued,
                voucherUsedCount = totalVouchersUsed,
                avgStars = 5.0,
                dailyRevenue = chartBuckets
            };

            return new
            {
                todaySummary,
                revenueOverview,
                revenueChart = chartBuckets,
                paymentMethodBreakdown,
                voucherAnalytics,
                customerAnalytics,
                loyaltyAnalytics,

                // Legacy baseline fields
                totalCustomers,
                totalBookings,
                revenue7Days,
                totalRevenue = netRevenue,
                prevTotalRevenue,
                monthlyRevenue,
                tierDistribution = tierDist,
                period
            };
        }

        private static string GetPaymentMethodName(int method) => method switch
        {
            (int)PaymentMethod.Cash => "Tiền mặt",
            (int)PaymentMethod.VNPay => "VNPay",
            (int)PaymentMethod.PayOS => "PayOS",
            (int)PaymentMethod.Free => "Miễn phí",
            _ => "Khác"
        };

        public async Task<object> GetLoyaltyConfigAsync()
        {
            var config = await _context.LoyaltyConfigs.FirstOrDefaultAsync() ?? new LoyaltyConfig();
            var tiers = await _context.Tiers.OrderBy(t => t.SortOrder).ToListAsync();

            return new
            {
                pointsPerThousandVND = config.PointsPerThousandVND,
                pointExpiryMonths = config.PointExpiryMonths,
                tierReviewDayOfMonth = config.TierReviewDayOfMonth,
                rankingWindowYears = config.RankingWindowYears,
                tiers = tiers.Select(t => new {
                    tierId = t.TierId,
                    tierName = t.TierName,
                    minRankingBalance = t.MinRankingBalance,
                    pointMultiplier = t.PointMultiplier,
                    discountPercent = t.DiscountPercent,
                    bookingWindowDays = t.BookingWindowDays
                })
            };
        }

        public async Task<bool> SaveLoyaltyConfigAsync(SaveLoyaltyConfigRequestDto request, int? updatedByAccountId)
        {
            var config = await _context.LoyaltyConfigs.FirstOrDefaultAsync();
            if (config == null)
            {
                config = new LoyaltyConfig { ConfigId = 1 };
                _context.LoyaltyConfigs.Add(config);
            }
            config.PointsPerThousandVND = request.PointsPerThousandVND;
            config.PointExpiryMonths = request.PointExpiryMonths;
            config.TierReviewDayOfMonth = request.TierReviewDayOfMonth;
            config.RankingWindowYears = request.RankingWindowYears;
            config.UpdatedAt = DateTime.Now;
            config.UpdatedBy = updatedByAccountId;

            if (request.TierUpdates != null)
            {
                foreach (var tu in request.TierUpdates)
                {
                    var tier = await _context.Tiers.FindAsync(tu.TierId);
                    if (tier != null)
                    {
                        tier.PointMultiplier = tu.PointMultiplier;
                        tier.DiscountPercent = tu.DiscountPercent;
                        tier.BookingWindowDays = tu.BookingWindowDays;
                    }
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<object>> GetTierReviewAsync()
        {
            var tiers = await _context.Tiers.OrderBy(t => t.MinRankingBalance).ToListAsync();
            if (!tiers.Any()) return new List<object>();

            var customers = await _context.Customers
                .Include(c => c.Account)
                .Include(c => c.Tier)
                .Take(100)
                .ToListAsync();

            var results = customers.Select(c => {
                var pts = c.RankingBalance;
                var newTier = tiers.Where(t => t.MinRankingBalance <= pts)
                    .OrderByDescending(t => t.MinRankingBalance)
                    .FirstOrDefault() ?? tiers.First();

                var dir = newTier.TierId > c.TierId ? "up"
                        : newTier.TierId < c.TierId ? "down"
                        : "stable";

                var reason = dir == "up"
                    ? $"Đạt ngưỡng {newTier.MinRankingBalance:N0} VNĐ tích lũy"
                    : dir == "down"
                    ? $"Dưới ngưỡng {c.Tier.MinRankingBalance:N0} VNĐ tích lũy"
                    : "Đang trong ngưỡng hạng hiện tại";

                return new {
                    name = c.Account.FullName,
                    currentTier = c.Tier.TierName,
                    rankingBalance = pts,
                    predictedTier = newTier.TierName,
                    direction = dir,
                    reason
                };
            })
            .OrderBy(r => r.direction == "stable" ? 1 : 0)
            .ThenBy(r => r.name)
            .Cast<object>()
            .ToList();

            return results;
        }

        public async Task<(int upgrades, int downgrades)> RunTierReviewAsync()
        {
            var customers = await _context.Customers
                .Include(c => c.Account)
                .ToListAsync();

            int downgrades = 0;
            var now = DateTime.Now;

            // Manual admin trigger of the semi-annual retention review (doc §5, §9):
            // each customer is kept or demoted based on their tier's MaintainBalance.
            // Upgrades happen in real time at checkout, not here.
            foreach (var c in customers)
            {
                if (await _loyaltyTierService.ReviewTierRetentionAsync(c, now))
                    downgrades++;
            }

            await _context.SaveChangesAsync();
            return (0, downgrades);
        }

        // ── Service Management API ─────────────────────────────────────

        public async Task<List<object>> GetAdminServicesAsync()
        {
            var list = await _context.Services.OrderBy(s => s.ServiceId).ToListAsync();
            return list.Select(s => new {
                id = s.ServiceId.ToString(),
                name = s.ServiceName,
                description = s.Description ?? "",
                category = s.IsAddOn ? "Dịch vụ đi kèm" : "Dịch vụ chính",
                price = s.BasePrice,
                estimatedMinutes = s.EstimatedMinutes,
                isActive = s.IsActive,
                isFeatured = s.IsFeatured,
                status = s.IsActive ? "Active" : "Inactive"
            }).Cast<object>().ToList();
        }

        public async Task<bool> SaveServiceAsync(SaveServiceRequestDto dto)
        {
            Service? service = null;
            if (!string.IsNullOrEmpty(dto.Id) && int.TryParse(dto.Id, out int id))
            {
                service = await _context.Services.FindAsync(id);
            }

            bool isNew = false;
            if (service == null)
            {
                service = new Service();
                isNew = true;
            }

            service.ServiceName = dto.Name.Trim();
            service.Description = dto.Description?.Trim();
            service.IsAddOn = dto.Category == "Dịch vụ đi kèm";
            service.Category = service.IsAddOn ? ServiceCategory.AddOn : ServiceCategory.Basic;
            service.BasePrice = dto.Price;
            service.EstimatedMinutes = dto.EstimatedMinutes;
            service.IsActive = dto.IsActive;
            service.IsFeatured = dto.IsFeatured;

            if (isNew)
            {
                _context.Services.Add(service);
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ToggleServiceStatusAsync(int serviceId)
        {
            var service = await _context.Services.FindAsync(serviceId);
            if (service == null) return false;

            service.IsActive = !service.IsActive;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteServiceAsync(int serviceId)
        {
            var service = await _context.Services.FindAsync(serviceId);
            if (service == null) return false;

            var isUsed = await _context.BookingServices.AnyAsync(bs => bs.ServiceId == serviceId);
            if (isUsed)
            {
                throw new InvalidOperationException("Không thể xóa dịch vụ này vì đã có lịch đặt sử dụng dịch vụ. Bạn có thể chọn ẩn dịch vụ đi thay thế.");
            }

            _context.Services.Remove(service);
            await _context.SaveChangesAsync();
            return true;
        }

        // ── Customer Management API ────────────────────────────────────

        public async Task<List<object>> GetCustomersAsync(string? search = null)
        {
            var query = _context.Customers
                .Include(c => c.Account)
                .Include(c => c.Tier)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchTrim = search.Trim().ToLower();
                query = query.Where(c => c.Account.FullName.ToLower().Contains(searchTrim) 
                                      || (c.Account.Phone != null && c.Account.Phone.Contains(searchTrim))
                                      || (c.Account.Email != null && c.Account.Email.ToLower().Contains(searchTrim))
                                      || c.MembershipCode.ToLower().Contains(searchTrim));
            }

            var list = await query.ToListAsync();

            var activeVouchersCounts = await _context.RewardRedemptions
                .Where(r => r.Status == RedemptionStatus.Active)
                .GroupBy(r => r.CustomerId)
                .Select(g => new { CustomerId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CustomerId, x => x.Count);

            return list.Select(c => {
                activeVouchersCounts.TryGetValue(c.CustomerId, out int activeVouchersCount);
                return new {
                    id = c.CustomerId.ToString(),
                    name = c.Account.FullName,
                    phone = c.Account.Phone ?? "",
                    email = c.Account.Email ?? "",
                    tier = c.Tier.TierName,
                    points = c.PointBalance,
                    joined = c.JoinedAt.ToString("dd/MM/yyyy"),
                    spend = c.TotalSpend,
                    totalWashes = c.TotalVisits,
                    activeVouchersCount = activeVouchersCount,
                    lastActive = c.LastVisitAt.HasValue ? c.LastVisitAt.Value.ToString("dd/MM/yyyy") : "Chưa có"
                };
            }).Cast<object>().ToList();
        }

        public async Task<object?> GetCustomerDetailAsync(int customerId)
        {
            var c = await _context.Customers
                .Include(c => c.Account)
                .Include(c => c.Tier)
                .FirstOrDefaultAsync(x => x.CustomerId == customerId);
            if (c == null) return null;

            var vehicles = await _context.Vehicles
                .Where(v => v.CustomerId == customerId)
                .Select(v => new {
                    plate = v.LicensePlate,
                    brand = v.Brand,
                    model = v.Model,
                    vehicleClass = v.VehicleClass
                })
                .ToListAsync();

            var history = await _context.Bookings
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .Where(b => b.CustomerId == customerId)
                .OrderByDescending(b => b.ScheduledAt)
                .Select(b => new {
                    date = b.ScheduledAt.ToString("dd/MM/yyyy"),
                    service = b.BookingServices.Where(bs => !bs.Service.IsAddOn).Select(bs => bs.Service.ServiceName).FirstOrDefault() ?? "Rửa xe",
                    price = b.FinalPrice,
                    status = b.Status == BookingStatus.Completed ? "Completed" : b.Status == BookingStatus.Cancelled ? "Cancelled" : "In Progress"
                })
                .ToListAsync();

            var vouchers = await _context.RewardRedemptions
                .Include(r => r.Reward)
                .Where(r => r.CustomerId == customerId && r.Status == RedemptionStatus.Active)
                .Select(r => new {
                    code = r.Reward.RewardId.ToString(),
                    title = r.Reward.RewardName,
                    status = r.Status
                })
                .ToListAsync();

            return new {
                id = c.CustomerId.ToString(),
                name = c.Account.FullName,
                phone = c.Account.Phone ?? "",
                email = c.Account.Email ?? "",
                tier = c.Tier.TierName,
                points = c.PointBalance,
                joined = c.JoinedAt.ToString("dd/MM/yyyy"),
                spend = c.TotalSpend,
                totalWashes = c.TotalVisits,
                activeVouchersCount = vouchers.Count,
                lastActive = c.LastVisitAt.HasValue ? c.LastVisitAt.Value.ToString("dd/MM/yyyy") : "Chưa có",
                vehicles,
                history,
                vouchers
            };
        }

        public async Task<bool> AdjustCustomerPointsAsync(int customerId, int pointsChange, string reason, int? staffAccountId)
        {
            var customer = await _context.Customers
                .Include(c => c.Account)
                .Include(c => c.Tier)
                .FirstOrDefaultAsync(c => c.CustomerId == customerId);
            if (customer == null) return false;

            customer.PointBalance = Math.Max(0, customer.PointBalance + pointsChange);
            if (pointsChange > 0)
            {
                customer.LifetimePoints += pointsChange;
            }

            _context.LoyaltyTransactions.Add(new LoyaltyTransaction
            {
                CustomerId = customerId,
                Points = pointsChange,
                TransactionType = pointsChange >= 0 ? LoyaltyTransactionType.Earn : LoyaltyTransactionType.Redeem,
                Note = reason.Trim(),
                CreatedAt = DateTime.Now
            });

            _context.Notifications.Add(new Notification
            {
                CustomerId = customerId,
                Title = "Thay đổi số dư điểm",
                Message = $"Tài khoản của bạn đã được {(pointsChange > 0 ? "cộng" : "trừ")} {Math.Abs(pointsChange)} điểm Loyalty. Lý do: {reason.Trim()}",
                Type = "Points",
                IsRead = false,
                CreatedAt = DateTime.Now
            });

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<object>> GetAvailableVouchersAsync()
        {
            var list = await _context.Rewards.Where(r => r.IsActive).ToListAsync();
            return list.Select(r => new {
                code = r.RewardId.ToString(),
                title = r.RewardName
            }).Cast<object>().ToList();
        }

        public async Task<bool> AssignVoucherAsync(int customerId, int rewardId)
        {
            var customer = await _context.Customers.FindAsync(customerId);
            var reward = await _context.Rewards.FindAsync(rewardId);
            if (customer == null || reward == null) return false;

            var redemption = new RewardRedemption
            {
                CustomerId = customerId,
                RewardId = rewardId,
                Status = RedemptionStatus.Active,
                ExpiresAt = DateTime.Now.AddDays(reward.ValidDays),
                RedeemedAt = DateTime.Now
            };

            _context.RewardRedemptions.Add(redemption);

            _context.Notifications.Add(new Notification
            {
                CustomerId = customerId,
                Title = "Bạn nhận được voucher mới",
                Message = $"Admin đã gán tặng cho bạn voucher: {reward.RewardName}.",
                Type = "Voucher",
                IsRead = false,
                CreatedAt = DateTime.Now
            });

            await _context.SaveChangesAsync();

            // Set unique voucher code after ID is generated
            string codePrefix = reward.RewardType == "PhysicalGift" ? "AW-GIFT-" : "AW-RED-";
            redemption.VoucherCode = $"{codePrefix}{redemption.RedemptionId}";
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<(bool success, string message)> ClaimPhysicalGiftAsync(string voucherCode, int staffAccountId, string? staffNotes)
        {
            var code = voucherCode.Trim();
            var redemption = await _context.RewardRedemptions
                .Include(r => r.Reward)
                .FirstOrDefaultAsync(r => r.VoucherCode != null && r.VoucherCode.ToLower() == code.ToLower());

            if (redemption == null)
            {
                return (false, "Không tìm thấy mã nhận quà này.");
            }

            if (redemption.Reward.RewardType != "PhysicalGift")
            {
                return (false, "Mã này không phải là quà tặng vật lý.");
            }

            if (redemption.Status == RedemptionStatus.Claimed || redemption.Status == RedemptionStatus.Used)
            {
                return (false, "Mã quà tặng này đã được nhận trước đó.");
            }

            if (redemption.Status == RedemptionStatus.Expired || redemption.ExpiresAt < DateTime.Now)
            {
                if (redemption.Status != RedemptionStatus.Expired)
                {
                    redemption.Status = RedemptionStatus.Expired;
                    await _context.SaveChangesAsync();
                }
                return (false, "Mã quà tặng này đã hết hạn nhận quà.");
            }

            if (redemption.Status == RedemptionStatus.Cancelled)
            {
                return (false, "Mã quà tặng này đã bị hủy.");
            }

            if (redemption.Status != RedemptionStatus.Active)
            {
                return (false, "Trạng thái mã quà tặng không hợp lệ để nhận quà.");
            }

            // Perform claim
            redemption.Status = RedemptionStatus.Claimed;
            redemption.UsedAt = DateTime.Now;
            redemption.HandledByAccountId = staffAccountId;
            redemption.StaffNotes = staffNotes?.Trim();

            // Create notification for customer
            _context.Notifications.Add(new Notification
            {
                CustomerId = redemption.CustomerId,
                Title = "Đã nhận quà tặng thành công",
                Message = $"Bạn đã nhận thành công quà tặng '{redemption.Reward.RewardName}' tại cửa hàng AutoWash.",
                Type = "Gift",
                IsRead = false,
                CreatedAt = DateTime.Now
            });

            await _context.SaveChangesAsync();
            return (true, $"Nhận quà '{redemption.Reward.RewardName}' thành công!");
        }

        // ── Voucher & Rewards Management APIs ──────────────────────────

        public async Task<List<RewardDetailDto>> GetAdminRewardsAsync(string? search = null, string? type = null, string? status = null)
        {
            var query = _context.Rewards
                .Include(r => r.Service)
                .Include(r => r.MinTier)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(r => r.RewardName.ToLower().Contains(s) || (r.Description != null && r.Description.ToLower().Contains(s)));
            }

            if (!string.IsNullOrWhiteSpace(type) && type != "All")
            {
                if (type == "Voucher")
                {
                    query = query.Where(r => r.RewardType == "DiscountPercent" || r.RewardType == "DiscountFixed");
                }
                else if (type == "FreeService")
                {
                    query = query.Where(r => r.RewardType == "FreeService" || r.RewardType == "Free_Wash");
                }
                else
                {
                    query = query.Where(r => r.RewardType == type);
                }
            }

            var now = DateTime.Now;
            if (!string.IsNullOrWhiteSpace(status) && status != "All")
            {
                if (status == "Active")
                {
                    query = query.Where(r => r.IsActive && (!r.EndDate.HasValue || r.EndDate.Value >= now));
                }
                else if (status == "Disabled")
                {
                    query = query.Where(r => !r.IsActive);
                }
                else if (status == "Expired")
                {
                    query = query.Where(r => r.EndDate.HasValue && r.EndDate.Value < now);
                }
            }

            var list = await query.OrderByDescending(r => r.RewardId).ToListAsync();

            return list.Select(r => new RewardDetailDto
            {
                RewardId = r.RewardId,
                RewardName = r.RewardName,
                Description = r.Description,
                PointCost = r.PointCost,
                RewardType = r.RewardType,
                DiscountValue = r.DiscountValue,
                ServiceId = r.ServiceId,
                ServiceName = r.Service?.ServiceName,
                MinTierId = r.MinTierId,
                MinTierName = r.MinTier?.TierName,
                ValidDays = r.ValidDays,
                StockLimit = r.StockLimit,
                RedeemedCount = r.RedeemedCount,
                MaxRedemptionsPerCustomer = r.MaxRedemptionsPerCustomer,
                IsActive = r.IsActive,
                IsAutomaticReward = r.IsAutomaticReward,
                ImageUrl = r.ImageUrl,
                StartDate = r.StartDate,
                EndDate = r.EndDate
            }).ToList();
        }

        public async Task<(bool success, string message, int rewardId)> CreateRewardAsync(CreateRewardRequestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.RewardName))
                return (false, "Tên phần thưởng không được để trống.", 0);

            if (dto.PointCost < 0)
                return (false, "Điểm quy đổi không được là số âm.", 0);

            var reward = new Reward
            {
                RewardName = dto.RewardName.Trim(),
                Description = dto.Description?.Trim(),
                PointCost = dto.PointCost,
                RewardType = dto.RewardType.Trim(),
                DiscountValue = dto.DiscountValue,
                ServiceId = dto.ServiceId,
                MinTierId = dto.MinTierId,
                ValidDays = dto.ValidDays > 0 ? dto.ValidDays : 30,
                StockLimit = dto.StockLimit,
                ImageUrl = dto.ImageUrl?.Trim(),
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                IsActive = dto.IsActive
            };

            _context.Rewards.Add(reward);
            await _context.SaveChangesAsync();

            return (true, "Tạo phần thưởng thành công!", reward.RewardId);
        }

        public async Task<(bool success, string message)> UpdateRewardAsync(int rewardId, UpdateRewardRequestDto dto)
        {
            var reward = await _context.Rewards.FindAsync(rewardId);
            if (reward == null) return (false, "Không tìm thấy phần thưởng.");

            if (string.IsNullOrWhiteSpace(dto.RewardName))
                return (false, "Tên phần thưởng không được để trống.");

            reward.RewardName = dto.RewardName.Trim();
            reward.Description = dto.Description?.Trim();
            reward.PointCost = dto.PointCost;
            reward.DiscountValue = dto.DiscountValue;
            reward.ServiceId = dto.ServiceId;
            reward.MinTierId = dto.MinTierId;
            reward.ValidDays = dto.ValidDays > 0 ? dto.ValidDays : 30;
            reward.StockLimit = dto.StockLimit;
            reward.ImageUrl = dto.ImageUrl?.Trim();
            reward.StartDate = dto.StartDate;
            reward.EndDate = dto.EndDate;
            reward.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();
            return (true, "Cập nhật phần thưởng thành công!");
        }

        public async Task<bool> ToggleRewardStatusAsync(int rewardId)
        {
            var reward = await _context.Rewards.FindAsync(rewardId);
            if (reward == null) return false;

            reward.IsActive = !reward.IsActive;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<AdminRedemptionDto>> GetRewardRedemptionsAsync(string? search = null, string? status = null, string? type = null)
        {
            var query = _context.RewardRedemptions
                .Include(r => r.Customer)
                    .ThenInclude(c => c.Account)
                .Include(r => r.Reward)
                .Include(r => r.HandledBy)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(r => r.Customer.Account.FullName.ToLower().Contains(s)
                                      || (r.Customer.Account.Phone != null && r.Customer.Account.Phone.Contains(s))
                                      || (r.VoucherCode != null && r.VoucherCode.ToLower().Contains(s))
                                      || r.Reward.RewardName.ToLower().Contains(s));
            }

            if (!string.IsNullOrWhiteSpace(status) && status != "All")
            {
                if (Enum.TryParse<RedemptionStatus>(status, true, out var parsedStatus))
                {
                    query = query.Where(r => r.Status == parsedStatus);
                }
            }

            if (!string.IsNullOrWhiteSpace(type) && type != "All")
            {
                if (type == "Voucher")
                {
                    query = query.Where(r => r.Reward.RewardType == "DiscountPercent" || r.Reward.RewardType == "DiscountFixed");
                }
                else if (type == "FreeService")
                {
                    query = query.Where(r => r.Reward.RewardType == "FreeService" || r.Reward.RewardType == "Free_Wash");
                }
                else
                {
                    query = query.Where(r => r.Reward.RewardType == type);
                }
            }

            var list = await query.OrderByDescending(r => r.RedeemedAt).ToListAsync();

            return list.Select(r => new AdminRedemptionDto
            {
                RedemptionId = r.RedemptionId,
                CustomerId = r.CustomerId,
                CustomerName = r.Customer.Account.FullName,
                CustomerPhone = r.Customer.Account.Phone ?? "",
                RewardId = r.RewardId,
                RewardName = r.Reward.RewardName,
                RewardType = r.Reward.RewardType,
                RedemptionCode = r.VoucherCode ?? (r.Reward.RewardType == "PhysicalGift" ? $"AW-GIFT-{r.RedemptionId}" : $"AW-RED-{r.RedemptionId}"),
                RedeemedAt = r.RedeemedAt,
                ExpiresAt = r.ExpiresAt,
                UsedAt = r.UsedAt,
                Status = r.Status.ToString(),
                StaffNotes = r.StaffNotes,
                HandledByAccountId = r.HandledByAccountId,
                HandledByName = r.HandledBy?.FullName
            }).ToList();
        }

        public async Task<RewardStatsDto> GetRewardStatsAsync()
        {
            var now = DateTime.Now;
            var rewards = await _context.Rewards.ToListAsync();
            var redemptions = await _context.RewardRedemptions.ToListAsync();

            return new RewardStatsDto
            {
                TotalRewards = rewards.Count,
                ActiveRewards = rewards.Count(r => r.IsActive && (!r.EndDate.HasValue || r.EndDate.Value >= now)),
                ExpiredRewards = rewards.Count(r => r.EndDate.HasValue && r.EndDate.Value < now),
                VoucherCount = rewards.Count(r => r.RewardType == "DiscountPercent" || r.RewardType == "DiscountFixed" || r.RewardType == "Free_Wash" || r.RewardType == "FreeService"),
                GiftCount = rewards.Count(r => r.RewardType == "PhysicalGift"),
                TotalRedeemed = redemptions.Count,
                TotalClaimed = redemptions.Count(r => r.Status == RedemptionStatus.Claimed || r.Status == RedemptionStatus.Used)
            };
        }
    }
}

