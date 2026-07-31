using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;

namespace Auto_Wash.Services
{
    /// <summary>
    /// Centralized service for all tier-related business logic (replaces static TierHelper).
    ///
    /// Two independent paths, deliberately asymmetric:
    ///   • UPGRADE   — real-time at checkout. A customer is promoted the moment
    ///                 their current-period spend crosses the next tier's
    ///                 MinRankingBalance. Never demotes.
    ///   • RETENTION — scheduled semi-annual review only. A customer is demoted
    ///                 by exactly one tier if their previous-period spend falls
    ///                 below their current tier's MaintainBalance.
    /// </summary>
    public class LoyaltyTierService
    {
        private readonly AutoWashDbContext _context;
        private readonly BookingNotificationService _notificationService;
        private readonly ILogger<LoyaltyTierService> _logger;

        public LoyaltyTierService(
            AutoWashDbContext context,
            BookingNotificationService notificationService,
            ILogger<LoyaltyTierService> logger)
        {
            _context = context;
            _notificationService = notificationService;
            _logger = logger;
        }

        // ── Period Helpers ──────────────────────────────────────────────

        /// <summary>
        /// Returns (start, end) for the current calendar review period.
        /// H1: Jan 1 – Jun 30.  H2: Jul 1 – Dec 31.
        /// </summary>
        public static (DateTime start, DateTime end) GetCurrentReviewPeriod(DateTime now)
        {
            if (now.Month <= 6)
                return (new DateTime(now.Year, 1, 1), new DateTime(now.Year, 6, 30, 23, 59, 59));
            return (new DateTime(now.Year, 7, 1), new DateTime(now.Year, 12, 31, 23, 59, 59));
        }

        /// <summary>
        /// Returns (start, end) for the PREVIOUS calendar review period.
        /// Used by the scheduled retention review.
        /// </summary>
        public static (DateTime start, DateTime end) GetPreviousReviewPeriod(DateTime now)
        {
            if (now.Month <= 6)
                return (new DateTime(now.Year - 1, 7, 1), new DateTime(now.Year - 1, 12, 31, 23, 59, 59));
            return (new DateTime(now.Year, 1, 1), new DateTime(now.Year, 6, 30, 23, 59, 59));
        }

        // ── Spend Query ─────────────────────────────────────────────────

        /// <summary>
        /// Sum of FinalPrice for Completed + Paid bookings within the given date range.
        /// Excludes Cancelled, NoShow, and unpaid bookings.
        /// </summary>
        public async Task<int> GetPeriodSpendAsync(int customerId, DateTime startDate, DateTime endDate)
        {
            return await _context.Bookings
                .Where(b => b.CustomerId == customerId
                         && b.Status == BookingStatus.Completed
                         && b.CreatedAt >= startDate
                         && b.CreatedAt <= endDate
                         && b.Payment != null
                         && b.Payment.Status == (int)PaymentStatus.Paid)
                .SumAsync(b => (int?)b.FinalPrice) ?? 0;
        }

        // ── Real-time UPGRADE ───────────────────────────────────────────

        /// <summary>
        /// Real-time UPGRADE check. Promotes the customer if their
        /// current-period spend qualifies for a higher tier. Never demotes.
        /// Does NOT call SaveChanges — the caller persists.
        /// Returns the period spend used for evaluation.
        /// </summary>
        public async Task<int> EvaluateUpgradeAsync(Customer customer, DateTime now)
        {
            var (periodStart, periodEnd) = GetCurrentReviewPeriod(now);
            int periodSpend = await GetPeriodSpendAsync(customer.CustomerId, periodStart, periodEnd);

            var tiers = await _context.Tiers.OrderBy(t => t.MinRankingBalance).ToListAsync();
            if (tiers.Count == 0) return periodSpend;

            var currentTier = tiers.FirstOrDefault(t => t.TierId == customer.TierId);
            // Find the highest tier the spend qualifies for
            var qualifiedTier = tiers
                .Where(t => t.MinRankingBalance <= periodSpend)
                .OrderByDescending(t => t.MinRankingBalance)
                .FirstOrDefault() ?? tiers.First();

            // Upgrade only: skip if the qualified tier is the same or lower.
            if (currentTier != null && qualifiedTier.MinRankingBalance <= currentTier.MinRankingBalance)
                return periodSpend;

            string periodLabel = $"{periodStart:dd/MM/yyyy} - {now:dd/MM/yyyy}";

            // Apply tier change
            ApplyTierChange(customer, currentTier, qualifiedTier, isUpgrade: true, periodSpend, periodLabel, now);

            // Generate upgrade reward for the HIGHEST achieved tier only (not cumulative)
            await GenerateUpgradeRewardAsync(customer, qualifiedTier, now);

            return periodSpend;
        }

        // ── Scheduled RETENTION review ──────────────────────────────────

        /// <summary>
        /// Scheduled RETENTION/DOWNGRADE check. Demotes the customer by
        /// exactly one tier if their previous-period spend is below the
        /// current tier's MaintainBalance. Never drops more than one tier
        /// at a time. Always stamps LastTierReviewAt. Does NOT call SaveChanges.
        /// Returns true if the tier changed.
        /// </summary>
        public async Task<bool> ReviewTierRetentionAsync(Customer customer, DateTime now)
        {
            var (periodStart, periodEnd) = GetPreviousReviewPeriod(now);
            int periodSpend = await GetPeriodSpendAsync(customer.CustomerId, periodStart, periodEnd);
            customer.LastTierReviewAt = now;

            var tiers = await _context.Tiers.OrderBy(t => t.MinRankingBalance).ToListAsync();
            if (tiers.Count == 0) return false;

            var currentTier = tiers.FirstOrDefault(t => t.TierId == customer.TierId);
            if (currentTier == null) return false;

            // Meets the maintenance threshold → keep the tier.
            if (periodSpend >= currentTier.MaintainBalance) return false;

            // Already at the lowest tier → nothing to downgrade.
            int currentIndex = tiers.IndexOf(currentTier);
            if (currentIndex <= 0) return false;

            // Downgrade by exactly one tier level.
            var newTier = tiers[currentIndex - 1];

            string periodLabel = $"{periodStart:dd/MM/yyyy} - {periodEnd:dd/MM/yyyy}";
            ApplyTierChange(customer, currentTier, newTier, isUpgrade: false, periodSpend, periodLabel, now);

            return true;
        }

        // ── Shared tier-change application ──────────────────────────────

        private void ApplyTierChange(Customer customer, Tier? fromTier, Tier toTier,
                                     bool isUpgrade, int periodSpend, string periodLabel, DateTime now)
        {
            int? fromTierId = customer.TierId;

            // 1. Update Customer Tier
            customer.TierId = toTier.TierId;

            // 2. Insert LoyaltyTransaction
            _context.LoyaltyTransactions.Add(new LoyaltyTransaction
            {
                CustomerId = customer.CustomerId,
                Points = 0,
                TransactionType = isUpgrade ? LoyaltyTransactionType.Upgrade : LoyaltyTransactionType.Downgrade,
                FromTierId = fromTierId,
                ToTierId = toTier.TierId,
                SpendingWindow = periodLabel,
                Note = isUpgrade
                    ? $"Đánh giá nâng hạng theo chi tiêu kỳ hiện tại: {periodSpend:N0}đ"
                    : $"Điều chỉnh giảm hạng do chi tiêu kỳ trước không đạt ngưỡng duy trì: {periodSpend:N0}đ",
                CreatedAt = now
            });

            // 3. Insert TierChangeLog (audit trail)
            _context.Set<TierChangeLog>().Add(new TierChangeLog
            {
                CustomerId = customer.CustomerId,
                FromTierId = fromTierId,
                ToTierId = toTier.TierId,
                ChangeType = isUpgrade ? "Upgrade" : "Downgrade",
                Reason = isUpgrade
                    ? "Reached spending threshold."
                    : "Retention spending requirement not met.",
                CreatedAt = now
            });

            // 4. Insert Notification
            _context.Notifications.Add(new Notification
            {
                CustomerId = customer.CustomerId,
                Title = isUpgrade ? "Chúc mừng nâng hạng thành viên!" : "Điều chỉnh hạng thành viên",
                Message = isUpgrade
                    ? $"Chúc mừng! Bạn đã được nâng lên hạng {toTier.TierName}."
                    : $"Hạng thành viên của bạn được điều chỉnh xuống {toTier.TierName} do chi tiêu kỳ trước chưa đạt ngưỡng duy trì.",
                Type = "Tier",
                IsRead = false,
                CreatedAt = now
            });

            // 5. Send Email in background
            var account = customer.Account;
            if (account != null && !string.IsNullOrWhiteSpace(account.Email))
            {
                if (isUpgrade)
                {
                    _notificationService?.SendTierUpgradeEmailInBackground(
                        account.Email, account.FullName, fromTier?.TierName ?? "N/A", toTier.TierName);
                }
                else
                {
                    _notificationService?.SendTierDowngradeEmailInBackground(
                        account.Email, account.FullName, fromTier?.TierName ?? "N/A", toTier.TierName);
                }
            }

            _logger.LogInformation(
                "[TIER {Action}] CustomerId={CustomerId}, From={FromTier}, To={ToTier}, PeriodSpend={PeriodSpend}",
                isUpgrade ? "UPGRADE" : "DOWNGRADE", customer.CustomerId,
                fromTier?.TierName ?? "N/A", toTier.TierName, periodSpend);
        }

        // ── Upgrade Reward Generation ───────────────────────────────────

        /// <summary>
        /// Generates the upgrade reward voucher for the HIGHEST achieved tier only.
        /// Rewards are identified by RewardType = "UpgradeReward" AND MinTierId = achievedTier.TierId.
        /// Each milestone reward is granted only once per customer lifetime.
        /// </summary>
        public async Task GenerateUpgradeRewardAsync(Customer customer, Tier achievedTier, DateTime now)
        {
            // Find the admin-configured upgrade reward template for this tier
            var reward = await _context.Rewards
                .FirstOrDefaultAsync(r => r.RewardType == "UpgradeReward"
                                       && r.MinTierId == achievedTier.TierId
                                       && r.IsActive);

            if (reward == null)
            {
                _logger.LogWarning(
                    "[UPGRADE REWARD] No active UpgradeReward template found for TierId={TierId} ({TierName}). Skipping reward generation.",
                    achievedTier.TierId, achievedTier.TierName);
                return;
            }

            // Once-per-milestone check: verify the customer hasn't already received this reward
            bool alreadyGranted = await _context.RewardRedemptions
                .AnyAsync(rr => rr.CustomerId == customer.CustomerId
                             && (rr.RewardId == reward.RewardId || (rr.Reward.RewardType == "UpgradeReward" && rr.Reward.MinTierId == achievedTier.TierId)));

            if (alreadyGranted)
            {
                _logger.LogInformation(
                    "[UPGRADE REWARD] Milestone reward for TierId={TierId} already granted to CustomerId={CustomerId}. Skipping.",
                    achievedTier.TierId, customer.CustomerId);
                return;
            }

            // Create the RewardRedemption with unique voucher code (pre-generated
            // so we never need an intermediate SaveChangesAsync — the caller's
            // final SaveChangesAsync commits everything atomically).
            string voucherCode = $"AW-UP-{customer.CustomerId}-{now:yyyyMMddHHmmss}";
            var redemption = new RewardRedemption
            {
                CustomerId = customer.CustomerId,
                RewardId = reward.RewardId,
                Status = RedemptionStatus.Active,
                ExpiresAt = now.AddDays(reward.ValidDays),
                RedeemedAt = now,
                VoucherCode = voucherCode
            };
            _context.RewardRedemptions.Add(redemption);

            reward.RedeemedCount += 1;

            // Notification for reward
            _context.Notifications.Add(new Notification
            {
                CustomerId = customer.CustomerId,
                Title = "Bạn nhận được voucher nâng hạng!",
                Message = $"Chúc mừng nâng hạng {achievedTier.TierName}! Bạn nhận voucher '{reward.RewardName}' (mã: {voucherCode}), hạn sử dụng {reward.ValidDays} ngày.",
                Type = "Voucher",
                IsRead = false,
                CreatedAt = now
            });

            _logger.LogInformation(
                "[UPGRADE REWARD] Granted '{RewardName}' to CustomerId={CustomerId} for tier {TierName}. VoucherCode={VoucherCode}",
                reward.RewardName, customer.CustomerId, achievedTier.TierName, voucherCode);
        }
    }
}
