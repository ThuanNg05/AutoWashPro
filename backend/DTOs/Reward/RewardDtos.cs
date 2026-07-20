using System;
using System.ComponentModel.DataAnnotations;

namespace Auto_Wash.DTOs.Reward
{
    public class RewardDetailDto
    {
        public int RewardId { get; set; }
        public string RewardName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int PointCost { get; set; }
        public string RewardType { get; set; } = string.Empty;
        public decimal? DiscountValue { get; set; }
        public int? ServiceId { get; set; }
        public string? ServiceName { get; set; }
        public int? MinTierId { get; set; }
        public string? MinTierName { get; set; }
        public int ValidDays { get; set; } = 30;
        public int? StockLimit { get; set; }
        public int RedeemedCount { get; set; }
        public int RemainingStock => StockLimit.HasValue ? Math.Max(0, StockLimit.Value - RedeemedCount) : -1; // -1 = Unlimited
        public int? MaxRedemptionsPerCustomer { get; set; }
        public bool IsActive { get; set; }
        public bool IsAutomaticReward { get; set; }
        public string? ImageUrl { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string StatusLabel => !IsActive ? "Disabled" : 
                                   (EndDate.HasValue && EndDate.Value < DateTime.Now) ? "Expired" :
                                   (StartDate.HasValue && StartDate.Value > DateTime.Now) ? "Upcoming" :
                                   (StockLimit.HasValue && RedeemedCount >= StockLimit.Value) ? "OutOfStock" : "Active";
    }

    public class CreateRewardRequestDto
    {
        [Required(ErrorMessage = "Tên phần thưởng là bắt buộc.")]
        [MaxLength(100)]
        public string RewardName { get; set; } = string.Empty;

        [MaxLength(300)]
        public string? Description { get; set; }

        [Range(0, 1000000, ErrorMessage = "Điểm quy đổi không hợp lệ.")]
        public int PointCost { get; set; }

        [Required(ErrorMessage = "Loại phần thưởng là bắt buộc.")]
        public string RewardType { get; set; } = string.Empty; // "DiscountPercent", "DiscountFixed", "FreeService", "PhysicalGift"

        public decimal? DiscountValue { get; set; }

        public int? ServiceId { get; set; }

        public int? MinTierId { get; set; }

        public int ValidDays { get; set; } = 30;

        public int? StockLimit { get; set; }

        public string? ImageUrl { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class UpdateRewardRequestDto
    {
        [Required(ErrorMessage = "Tên phần thưởng là bắt buộc.")]
        [MaxLength(100)]
        public string RewardName { get; set; } = string.Empty;

        [MaxLength(300)]
        public string? Description { get; set; }

        [Range(0, 1000000, ErrorMessage = "Điểm quy đổi không hợp lệ.")]
        public int PointCost { get; set; }

        public decimal? DiscountValue { get; set; }

        public int? ServiceId { get; set; }

        public int? MinTierId { get; set; }

        public int ValidDays { get; set; } = 30;

        public int? StockLimit { get; set; }

        public string? ImageUrl { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class AdminRedemptionDto
    {
        public int RedemptionId { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public int RewardId { get; set; }
        public string RewardName { get; set; } = string.Empty;
        public string RewardType { get; set; } = string.Empty;
        public string RedemptionCode { get; set; } = string.Empty;
        public DateTime RedeemedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public DateTime? UsedAt { get; set; }
        public string Status { get; set; } = string.Empty; // Active, Used, Expired, Cancelled, Claimed
        public string? StaffNotes { get; set; }
        public int? HandledByAccountId { get; set; }
        public string? HandledByName { get; set; }
    }

    public class CustomerRewardItemDto
    {
        public int RewardId { get; set; }
        public string RewardName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int PointCost { get; set; }
        public string RewardType { get; set; } = string.Empty;
        public decimal? DiscountValue { get; set; }
        public int? ServiceId { get; set; }
        public string? ServiceName { get; set; }
        public int ValidDays { get; set; }
        public int? StockLimit { get; set; }
        public int RedeemedCount { get; set; }
        public int RemainingStock => StockLimit.HasValue ? Math.Max(0, StockLimit.Value - RedeemedCount) : -1;
        public string? ImageUrl { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool IsActive { get; set; }
        public bool IsAvailable { get; set; }
        public bool HasAlreadyRedeemed { get; set; }
        public string StatusReason { get; set; } = string.Empty; // "Available", "AlreadyRedeemed", "OutOfStock", "Expired", "Upcoming", "Disabled"
    }

    public class MyRewardDto
    {
        public int RedemptionId { get; set; }
        public int RewardId { get; set; }
        public string RewardName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string RewardType { get; set; } = string.Empty;
        public decimal? DiscountValue { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty; // Active, Used, Expired, Claimed
        public DateTime RedeemedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public DateTime? UsedAt { get; set; }
        public string ClaimInstruction { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
    }

    public class RewardStatsDto
    {
        public int TotalRewards { get; set; }
        public int ActiveRewards { get; set; }
        public int ExpiredRewards { get; set; }
        public int VoucherCount { get; set; }
        public int GiftCount { get; set; }
        public int TotalRedeemed { get; set; }
        public int TotalClaimed { get; set; }
    }
}
