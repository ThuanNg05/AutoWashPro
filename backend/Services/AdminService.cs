using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
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

        public AdminService(AutoWashDbContext context, LoyaltyTierService loyaltyTierService)
        {
            _context = context;
            _loyaltyTierService = loyaltyTierService;
        }

        public async Task<object> GetDashboardStatsAsync(DateTime? fromDate = null, DateTime? toDate = null)
        {
            var today = DateTime.Today;
            var startDate = today.AddDays(-6);
            var prevStart = today.AddDays(-13);

            // ── Period range (drives the date-filtered statistics below) ──
            // Defaults to the last 7 days when the caller supplies no range.
            var periodTo = (toDate?.Date) ?? today;
            var periodFrom = (fromDate?.Date) ?? periodTo.AddDays(-6);
            if (periodFrom > periodTo) periodFrom = periodTo;
            var periodEndEx = periodTo.AddDays(1); // end-of-day inclusive

            // 1. Total Customers
            var totalCustomers = await _context.Customers.CountAsync();

            // 2. Total Bookings
            var totalBookings = await _context.Bookings.CountAsync();

            // 3. Revenue
            var completedBookingsGrouped = await _context.Bookings
                .Where(b => b.Status == BookingStatus.Completed && b.Payment != null && b.Payment.PaidAt != null && b.Payment.PaidAt.Value >= startDate)
                .GroupBy(b => b.Payment.PaidAt!.Value.Date)
                .Select(g => new { Date = g.Key, Total = g.Sum(b => b.FinalPrice) })
                .ToListAsync();

            var completedBookingsDict = completedBookingsGrouped.ToDictionary(x => x.Date, x => x.Total);

            var revenue7Days = Enumerable.Range(0, 7)
                .Select(i => {
                    var day = startDate.AddDays(i);
                    return completedBookingsDict.TryGetValue(day, out var val) ? (long)val : 0L;
                }).ToArray();

            var totalRevenue = await _context.Bookings
                .Where(b => b.Status == BookingStatus.Completed && b.Payment != null && b.Payment.PaidAt != null && b.Payment.PaidAt.Value >= startDate)
                .SumAsync(b => (long)b.FinalPrice);

            var prevTotalRevenue = await _context.Bookings
                .Where(b => b.Status == BookingStatus.Completed && b.Payment != null && b.Payment.PaidAt != null
                         && b.Payment.PaidAt.Value >= prevStart && b.Payment.PaidAt.Value < startDate)
                .SumAsync(b => (long)b.FinalPrice);

            // 4. Monthly Revenue (last 30 days)
            var monthlyRevenue = await _context.Bookings
                .Where(b => b.Status == BookingStatus.Completed && b.Payment != null && b.Payment.PaidAt != null && b.Payment.PaidAt.Value >= today.AddDays(-30))
                .SumAsync(b => (long)b.FinalPrice);

            // 5. Active Queue
            var activeQueue = await _context.Queues
                .CountAsync(q => q.Status == QueueStatus.Waiting || q.Status == QueueStatus.Washing || q.Status == QueueStatus.Drying);

            // 6. Average Wash Duration
            double avgMinutesVal = 0;
            var completedQueueCount = await _context.Queues
                .CountAsync(q => q.StartedAt.HasValue && q.CompletedAt.HasValue);
            if (completedQueueCount > 0)
            {
                avgMinutesVal = await _context.Queues
                    .Where(q => q.StartedAt.HasValue && q.CompletedAt.HasValue)
                    .AverageAsync(q => (q.CompletedAt!.Value - q.StartedAt!.Value).TotalMinutes);
            }
            var avgMinutes = (int)Math.Round(avgMinutesVal);

            // 7. Average Rating
            var avgStarsNullable = await _context.Bookings
                .Where(b => b.Stars.HasValue)
                .AverageAsync(b => (double?)b.Stars);
            var avgStars = avgStarsNullable.HasValue ? Math.Round(avgStarsNullable.Value, 1) : 0.0;

            // 8. Tier Distribution
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

            // 9. Booking Status Count
            var bookingStatusCount = await _context.Bookings
                .GroupBy(b => b.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Status, x => x.Count);

            // 10. Service Usage Statistics
            var serviceUsageStats = await _context.BookingServices
                .GroupBy(bs => bs.Service.ServiceName)
                .Select(g => new { ServiceName = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ServiceName, x => x.Count);

            var dayLabels = Enumerable.Range(0, 7)
                .Select(i => startDate.AddDays(i).ToString("ddd", new System.Globalization.CultureInfo("vi-VN")))
                .ToArray();

            // ══ Period statistics (scoped to the [periodFrom, periodTo] filter) ══

            // Money — Paid payments bucketed by PaidAt (mirrors revenue-stats).
            var periodPayRows = await _context.Payments
                .Where(p => p.Status == (int)PaymentStatus.Paid && p.PaidAt != null
                         && p.PaidAt >= periodFrom && p.PaidAt < periodEndEx)
                .Select(p => new { p.Amount, p.PaidAt, p.Booking.BasePrice, p.Booking.PromoDiscount })
                .ToListAsync();

            long periodNet = periodPayRows.Sum(r => (long)r.Amount);
            long periodGross = periodPayRows.Sum(r => (long)r.BasePrice);
            long periodDiscount = Math.Max(0, periodGross - periodNet);
            int periodPaidCount = periodPayRows.Count;
            int periodVoucherUsed = periodPayRows.Count(r => r.PromoDiscount > 0);

            // Bookings placed within the range (by creation time).
            int periodBookingCount = await _context.Bookings
                .CountAsync(b => b.CreatedAt >= periodFrom && b.CreatedAt < periodEndEx);

            // Washes completed within the range (by CompletedAt).
            int periodCompletedCount = await _context.Bookings
                .CountAsync(b => b.Status == BookingStatus.Completed
                              && b.CompletedAt != null
                              && b.CompletedAt >= periodFrom && b.CompletedAt < periodEndEx);

            // Loyalty points granted on washes completed within the range.
            long periodPointsGranted = await _context.Bookings
                .Where(b => b.Status == BookingStatus.Completed
                         && b.CompletedAt != null
                         && b.CompletedAt >= periodFrom && b.CompletedAt < periodEndEx)
                .SumAsync(b => (long)b.PointsEarned);

            // Average rating for bookings completed within the range.
            var periodAvgStarsNullable = await _context.Bookings
                .Where(b => b.Stars.HasValue && b.CompletedAt != null
                         && b.CompletedAt >= periodFrom && b.CompletedAt < periodEndEx)
                .AverageAsync(b => (double?)b.Stars);
            var periodAvgStars = periodAvgStarsNullable.HasValue ? Math.Round(periodAvgStarsNullable.Value, 1) : 0.0;

            // Daily revenue for the chart. Zero-filled for short spans so the
            // chart shows continuous days; falls back to present days otherwise.
            var revenueByDay = periodPayRows
                .Where(r => r.PaidAt.HasValue)
                .GroupBy(r => r.PaidAt!.Value.Date)
                .ToDictionary(g => g.Key, g => g.Sum(x => (long)x.Amount));

            var spanDays = (periodEndEx - periodFrom).Days; // inclusive day count
            var dailyRevenue = new List<object>();
            if (spanDays > 0 && spanDays <= 62)
            {
                for (int i = 0; i < spanDays; i++)
                {
                    var d = periodFrom.AddDays(i);
                    dailyRevenue.Add(new
                    {
                        date = d.ToString("yyyy-MM-dd"),
                        total = revenueByDay.TryGetValue(d, out var v) ? v : 0L
                    });
                }
            }
            else
            {
                dailyRevenue = revenueByDay
                    .OrderBy(kv => kv.Key)
                    .Select(kv => (object)new { date = kv.Key.ToString("yyyy-MM-dd"), total = kv.Value })
                    .ToList();
            }

            var period = new
            {
                fromDate = periodFrom.ToString("yyyy-MM-dd"),
                toDate = periodTo.ToString("yyyy-MM-dd"),
                netRevenue = periodNet,
                grossRevenue = periodGross,
                totalDiscount = periodDiscount,
                paidCount = periodPaidCount,
                bookingCount = periodBookingCount,
                completedCount = periodCompletedCount,
                pointsGranted = periodPointsGranted,
                voucherUsedCount = periodVoucherUsed,
                avgStars = periodAvgStars,
                dailyRevenue
            };

            return new
            {
                totalCustomers,
                totalBookings,
                revenue7Days,
                totalRevenue,
                prevTotalRevenue,
                monthlyRevenue,
                activeQueue,
                avgMinutes,
                avgStars,
                tierDistribution = tierDist,
                bookingStatusCount,
                serviceUsageStats,
                dayLabels,
                period
            };
        }

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

