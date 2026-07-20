using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.DTOs.Reward;
using Auto_Wash.Helpers;

namespace Auto_Wash.Services
{
    public class CustomerService
    {
        private readonly AutoWashDbContext _context;

        public CustomerService(AutoWashDbContext context)
        {
            _context = context;
        }

        public async Task<bool> UpdateProfileAsync(int accountId, string fullName, string? phone)
        {
            var account = await _context.Accounts.FirstOrDefaultAsync(a => a.AccountId == accountId);
            if (account == null) return false;

            account.FullName = fullName.Trim();
            account.Phone = phone?.Trim() ?? string.Empty;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> EmailExistsAsync(string email)
        {
            return await _context.Accounts.AnyAsync(a => a.Email == email.Trim());
        }

        public async Task<(bool success, string message)> VerifyEmailAndChangePasswordAsync(string email, string otpCode, string currentPassword, string newPassword, OtpService otpService)
        {
            bool otpValid = await otpService.VerifyOtpAsync(email, otpCode, "ForgotPassword");
            if (!otpValid) return (false, "Mã OTP không hợp lệ hoặc đã hết hạn!");

            var account = await _context.Accounts.FirstOrDefaultAsync(a => a.Email == email.Trim());
            if (account == null) return (false, "Không tìm thấy tài khoản tương ứng!");

            // currentPassword is only required when changing password from profile (not forgot password flow)
            if (!string.IsNullOrEmpty(currentPassword))
            {
                if (!PasswordHelper.VerifyPassword(currentPassword.Trim(), account.PasswordHash ?? ""))
                {
                    return (false, "Mật khẩu hiện tại không chính xác!");
                }
            }

            account.PasswordHash = PasswordHelper.HashPassword(newPassword.Trim());
            await _context.SaveChangesAsync();
            return (true, "Thay đổi mật khẩu thành công!");
        }

        public async Task<List<object>> GetVouchersAsync(int customerId)
        {
            var now = DateTime.Now;
            var redemptions = await _context.RewardRedemptions
                .Include(r => r.Reward)
                .Where(r => r.CustomerId == customerId)
                .ToListAsync();

            bool changed = false;
            foreach (var r in redemptions)
            {
                if (r.Status == RedemptionStatus.Active && r.ExpiresAt < now)
                {
                    r.Status = RedemptionStatus.Expired;
                    changed = true;
                }
            }

            if (changed)
            {
                await _context.SaveChangesAsync();
            }

            // Return only Active and Used vouchers that are applicable for Booking (EXCLUDE PhysicalGift)
            var filtered = redemptions
                .Where(r => r.Status != RedemptionStatus.Expired && r.Reward != null && r.Reward.RewardType != "PhysicalGift")
                .OrderByDescending(r => r.RedeemedAt)
                .ToList();

            return filtered.Select(r => new
            {
                redemptionId = r.RedemptionId,
                title = r.Reward.RewardName,
                code = !string.IsNullOrEmpty(r.VoucherCode)
                    ? r.VoucherCode
                    : (r.Reward.PointCost == 0 ? $"WELCOME10-{customerId}" : $"AW-RED-{r.RedemptionId}"),
                rewardType = r.Reward.RewardType,
                rewardValue = r.Reward.DiscountValue,
                status = r.Status == RedemptionStatus.Active ? 1 : 2, // 1 = Available, 2 = Used
                redeemedAt = r.RedeemedAt.ToString("dd/MM/yyyy"),
                expiredAt = r.ExpiresAt.ToString("dd/MM/yyyy")
            }).Cast<object>().ToList();
        }

        public async Task<List<object>> GetNotificationsAsync(int customerId)
        {
            var list = await _context.Notifications
                .Where(n => n.CustomerId == customerId)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            return list.Select(n => new
            {
                id = n.NotificationId.ToString(),
                title = n.Title,
                body = n.Message,
                time = GetRelativeTime(n.CreatedAt),
                sentAt = n.CreatedAt.ToString("dd/MM/yyyy HH:mm"),
                type = n.Type,
                read = n.IsRead
            }).Cast<object>().ToList();
        }

        private static string GetRelativeTime(DateTime dateTime)
        {
            var span = DateTime.Now - dateTime;
            if (span.TotalMinutes < 1) return "Vừa xong";
            if (span.TotalMinutes < 60) return $"{(int)span.TotalMinutes} phút trước";
            if (span.TotalHours < 24) return $"{(int)span.TotalHours} giờ trước";
            if (span.TotalDays < 7) return $"{(int)span.TotalDays} ngày trước";
            return dateTime.ToString("dd/MM/yyyy HH:mm");
        }

        public async Task<bool> MarkNotificationAsReadAsync(int customerId, int notifId)
        {
            var notif = await _context.Notifications
                .FirstOrDefaultAsync(n => n.NotificationId == notifId && n.CustomerId == customerId);
            if (notif == null) return false;

            notif.IsRead = true;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<(bool success, string message)> RedeemRewardAsync(int customerId, int rewardId)
        {
            var customer = await _context.Customers.FindAsync(customerId);
            if (customer == null) return (false, "Không tìm thấy thông tin khách hàng.");

            var reward = await _context.Rewards.FindAsync(rewardId);
            if (reward == null || !reward.IsActive) return (false, "Phần thưởng không tồn tại hoặc đã bị ngừng áp dụng.");

            // Rule 1: Physical Gifts can only be redeemed ONCE per Account
            if (reward.RewardType == "PhysicalGift")
            {
                bool alreadyRedeemed = await _context.RewardRedemptions
                    .AnyAsync(r => r.CustomerId == customerId && r.RewardId == rewardId);
                if (alreadyRedeemed)
                {
                    return (false, "Quà tặng vật lý này chỉ được đổi tối đa 1 lần duy nhất cho mỗi tài khoản.");
                }
            }

            var now = DateTime.Now;
            if (reward.StartDate.HasValue && reward.StartDate.Value > now)
            {
                return (false, $"Phần thưởng chưa đến ngày bắt đầu đổi (từ {reward.StartDate.Value:dd/MM/yyyy}).");
            }

            if (reward.EndDate.HasValue && reward.EndDate.Value < now)
            {
                return (false, "Phần thưởng đã hết hạn áp dụng.");
            }

            if (reward.StockLimit.HasValue && reward.RedeemedCount >= reward.StockLimit.Value)
            {
                return (false, "Phần thưởng này hiện đã hết hàng hoặc hết lượt đổi.");
            }

            if (customer.PointBalance < reward.PointCost)
            {
                return (false, $"Bạn không đủ điểm để đổi phần thưởng này (Cần {reward.PointCost} điểm, hiện có {customer.PointBalance} điểm).");
            }

            customer.PointBalance -= reward.PointCost;
            reward.RedeemedCount += 1;

            var redemption = new RewardRedemption
            {
                CustomerId = customerId,
                RewardId = rewardId,
                Status = RedemptionStatus.Active,
                ExpiresAt = now.AddDays(reward.ValidDays),
                RedeemedAt = now
            };
            _context.RewardRedemptions.Add(redemption);
            await _context.SaveChangesAsync(); // assigns RedemptionId

            // Format appropriate redemption code based on type
            string voucherCode = reward.RewardType == "PhysicalGift" 
                ? $"AW-GIFT-{redemption.RedemptionId}" 
                : $"AW-RED-{redemption.RedemptionId}";
            redemption.VoucherCode = voucherCode;

            _context.LoyaltyTransactions.Add(new LoyaltyTransaction
            {
                CustomerId = customerId,
                Points = -reward.PointCost,
                TransactionType = LoyaltyTransactionType.Redeem,
                RedemptionId = redemption.RedemptionId,
                Note = $"Đổi điểm nhận quà: {reward.RewardName}",
                CreatedAt = now
            });

            string notificationTitle = reward.RewardType == "PhysicalGift" ? "Đổi quà tặng thành công" : "Đổi phần thưởng thành công";
            string notificationMessage = reward.RewardType == "PhysicalGift"
                ? $"Bạn đã đổi thành công {reward.PointCost} điểm lấy quà tặng '{reward.RewardName}'. Vui lòng xuất trình mã nhận quà '{voucherCode}' tại cửa hàng hoặc liên hệ Hotline để nhận quà."
                : $"Bạn đã đổi thành công {reward.PointCost} điểm lấy voucher '{reward.RewardName}' (mã: {voucherCode}).";

            _context.Notifications.Add(new Notification
            {
                CustomerId = customerId,
                Title = notificationTitle,
                Message = notificationMessage,
                Type = reward.RewardType == "PhysicalGift" ? "Gift" : "Voucher",
                IsRead = false,
                CreatedAt = now
            });

            await _context.SaveChangesAsync();
            return (true, reward.RewardType == "PhysicalGift" 
                ? $"Đổi quà tặng '{reward.RewardName}' thành công! Mã nhận quà: {voucherCode}" 
                : $"Đổi voucher '{reward.RewardName}' thành công! Mã voucher: {voucherCode}");
        }

        public async Task<List<CustomerRewardItemDto>> GetRewardsCatalogAsync(string? category = null, int? customerId = null)
        {
            var now = DateTime.Now;
            var query = _context.Rewards
                .Include(r => r.Service)
                .Where(r => !r.IsAutomaticReward)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(category) && category != "All")
            {
                if (category == "Voucher")
                {
                    query = query.Where(r => r.RewardType == "DiscountPercent" || r.RewardType == "DiscountFixed");
                }
                else if (category == "FreeService")
                {
                    query = query.Where(r => r.RewardType == "FreeService" || r.RewardType == "Free_Wash");
                }
                else
                {
                    query = query.Where(r => r.RewardType == category);
                }
            }

            var list = await query.OrderByDescending(r => r.IsActive).ThenBy(r => r.PointCost).ToListAsync();

            var redeemedPhysicalGiftIds = new HashSet<int>();
            if (customerId.HasValue)
            {
                var ids = await _context.RewardRedemptions
                    .Include(rr => rr.Reward)
                    .Where(rr => rr.CustomerId == customerId.Value && rr.Reward != null && rr.Reward.RewardType == "PhysicalGift")
                    .Select(rr => rr.RewardId)
                    .ToListAsync();
                redeemedPhysicalGiftIds = new HashSet<int>(ids);
            }

            return list.Select(r => {
                bool isPhysicalGift = r.RewardType == "PhysicalGift";
                bool hasAlreadyRedeemed = isPhysicalGift && customerId.HasValue && redeemedPhysicalGiftIds.Contains(r.RewardId);
                bool isOutOfStock = r.StockLimit.HasValue && r.RedeemedCount >= r.StockLimit.Value;
                bool isExpired = r.EndDate.HasValue && r.EndDate.Value < now;
                bool isUpcoming = r.StartDate.HasValue && r.StartDate.Value > now;
                bool isAvailable = r.IsActive && !isOutOfStock && !isExpired && !isUpcoming && !hasAlreadyRedeemed;

                string reason = !r.IsActive ? "Disabled" :
                                hasAlreadyRedeemed ? "AlreadyRedeemed" :
                                isExpired ? "Expired" :
                                isUpcoming ? "Upcoming" :
                                isOutOfStock ? "OutOfStock" : "Available";

                return new CustomerRewardItemDto
                {
                    RewardId = r.RewardId,
                    RewardName = r.RewardName,
                    Description = r.Description ?? "",
                    PointCost = r.PointCost,
                    RewardType = r.RewardType,
                    DiscountValue = r.DiscountValue,
                    ServiceId = r.ServiceId,
                    ServiceName = r.Service?.ServiceName,
                    ValidDays = r.ValidDays,
                    StockLimit = r.StockLimit,
                    RedeemedCount = r.RedeemedCount,
                    ImageUrl = r.ImageUrl,
                    StartDate = r.StartDate,
                    EndDate = r.EndDate,
                    IsActive = r.IsActive,
                    IsAvailable = isAvailable,
                    HasAlreadyRedeemed = hasAlreadyRedeemed,
                    StatusReason = reason
                };
            }).ToList();
        }

        public async Task<List<MyRewardDto>> GetMyRewardsAsync(int customerId, string? status = null, string? type = null)
        {
            var now = DateTime.Now;
            var redemptions = await _context.RewardRedemptions
                .Include(r => r.Reward)
                .Where(r => r.CustomerId == customerId)
                .ToListAsync();

            // Auto-update expired redemptions
            bool changed = false;
            foreach (var r in redemptions)
            {
                if (r.Status == RedemptionStatus.Active && r.ExpiresAt < now)
                {
                    r.Status = RedemptionStatus.Expired;
                    changed = true;
                }
            }
            if (changed)
            {
                await _context.SaveChangesAsync();
            }

            var query = redemptions.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(status) && status != "All")
            {
                if (status == "Available")
                    query = query.Where(r => r.Status == RedemptionStatus.Active);
                else if (status == "Used")
                    query = query.Where(r => r.Status == RedemptionStatus.Used || r.Status == RedemptionStatus.Claimed);
                else if (status == "Expired")
                    query = query.Where(r => r.Status == RedemptionStatus.Expired);
            }

            if (!string.IsNullOrWhiteSpace(type) && type != "All")
            {
                if (type == "Voucher")
                    query = query.Where(r => r.Reward.RewardType != "PhysicalGift");
                else if (type == "Gift")
                    query = query.Where(r => r.Reward.RewardType == "PhysicalGift");
            }

            return query.OrderByDescending(r => r.RedeemedAt).Select(r => new MyRewardDto
            {
                RedemptionId = r.RedemptionId,
                RewardId = r.RewardId,
                RewardName = r.Reward.RewardName,
                Description = r.Reward.Description ?? "",
                RewardType = r.Reward.RewardType,
                DiscountValue = r.Reward.DiscountValue,
                Code = !string.IsNullOrEmpty(r.VoucherCode)
                    ? r.VoucherCode
                    : (r.Reward.RewardType == "PhysicalGift" ? $"AW-GIFT-{r.RedemptionId}" : $"AW-RED-{r.RedemptionId}"),
                Status = r.Status.ToString(),
                RedeemedAt = r.RedeemedAt,
                ExpiresAt = r.ExpiresAt,
                UsedAt = r.UsedAt,
                ImageUrl = r.Reward.ImageUrl,
                ClaimInstruction = r.Reward.RewardType == "PhysicalGift"
                    ? "Vui lòng xuất trình mã nhận quà này tại trung tâm AutoWash Pro hoặc liên hệ Hotline: 1900-AUTOWASH để nhận quà."
                    : "Sử dụng mã voucher này khi thanh toán lịch đặt rửa xe trên AutoWash Pro."
            }).ToList();
        }

        public async Task<List<object>> GetRewardsAsync()
        {
            var catalog = await GetRewardsCatalogAsync("All");
            return catalog.Select(r => new
            {
                rewardId = r.RewardId,
                rewardName = r.RewardName,
                description = r.Description,
                pointsRequired = r.PointCost,
                rewardType = r.RewardType,
                rewardValue = r.DiscountValue,
                isActive = r.IsActive ? 1 : 0,
                icon = (r.RewardType == "DiscountPercent" || r.RewardType == "UpgradeReward") ? "fa-percent" : r.RewardType == "Free_Wash" ? "fa-soap" : "fa-gift"
            }).Cast<object>().ToList();
        }

        public async Task<List<object>> GetRewardHistoryAsync(int customerId)
        {
            var list = await _context.LoyaltyTransactions
                .Include(lt => lt.RewardRedemption)
                    .ThenInclude(r => r!.Reward)
                .Where(lt => lt.CustomerId == customerId && lt.TransactionType == LoyaltyTransactionType.Redeem)
                .OrderByDescending(lt => lt.CreatedAt)
                .ToListAsync();

            return list.Select(lt => new
            {
                transactionId = lt.TransactionId,
                rewardName = lt.RewardRedemption?.Reward?.RewardName ?? lt.Note,
                pointsSpent = Math.Abs(lt.Points),
                redeemTime = lt.CreatedAt.ToString("dd/MM/yyyy HH:mm"),
                code = lt.RewardRedemption?.VoucherCode ?? $"AW-RED-{lt.RedemptionId}",
                status = lt.RewardRedemption?.Status.ToString() ?? "Completed",
                rewardType = lt.RewardRedemption?.Reward?.RewardType ?? "Voucher"
            }).Cast<object>().ToList();
        }

        /// <summary>
        /// Loyalty status for the member card: redemption points plus current-period
        /// spending and progress toward the next tier. Strictly read-only — never
        /// triggers tier upgrades or any write actions.
        /// </summary>
        public async Task<object?> GetLoyaltyStatusAsync(int customerId)
        {
            var now = DateTime.Now;
            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.CustomerId == customerId);
            if (customer == null) return null;

            // Read-only: compute current-period spend without modifying any state.
            var (periodStart, periodEnd) = LoyaltyTierService.GetCurrentReviewPeriod(now);
            int periodSpend = await _context.Bookings
                .Where(b => b.CustomerId == customerId
                         && b.Status == BookingStatus.Completed
                         && b.CompletedAt >= periodStart
                         && b.CompletedAt <= now
                         && b.Payment != null
                         && b.Payment.Status == (int)PaymentStatus.Paid)
                .SumAsync(b => (int?)b.FinalPrice) ?? 0;

            var tiers = await _context.Tiers.OrderBy(t => t.MinRankingBalance).ToListAsync();
            var current = tiers.FirstOrDefault(t => t.TierId == customer.TierId) ?? tiers.First();
            var next = tiers
                .Where(t => t.MinRankingBalance > current.MinRankingBalance)
                .OrderBy(t => t.MinRankingBalance)
                .FirstOrDefault();

            return new
            {
                points = customer.PointBalance,
                lifetimePoints = customer.LifetimePoints,
                totalVisits = customer.TotalVisits,
                tierName = current.TierName,
                bookingWindowDays = current.BookingWindowDays,
                multiplier = current.PointMultiplier,
                discountPercent = current.DiscountPercent,
                periodStart = periodStart.ToString("yyyy-MM-dd"),
                periodEnd = periodEnd.ToString("yyyy-MM-dd"),
                periodSpend = periodSpend,
                currentTierMin = current.MinRankingBalance,
                nextTierName = next?.TierName,
                nextTierMin = next?.MinRankingBalance,
                amountToNextTier = next != null ? Math.Max(0, next.MinRankingBalance - periodSpend) : 0,
                // Full tier ladder so the UI can compute the spend-to-rank-up gap
                // for any tier the user previews (ascending by threshold).
                tiers = tiers.Select(t => new
                {
                    tierId = t.TierId,
                    name = t.TierName,
                    minRankingBalance = t.MinRankingBalance,
                    bookingWindowDays = t.BookingWindowDays
                }).ToList()
            };
        }
    }
}
