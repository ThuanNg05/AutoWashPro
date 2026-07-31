namespace Auto_Wash.Helpers
{
    /// <summary>
    /// Centralized single source of truth for business rules, demo scaling, tier multipliers, and voucher discount caps.
    /// Eliminates magic numbers across the backend.
    /// </summary>
    public static class BusinessSettings
    {
        // Pricing Scale for Demo Mode (Original price * 0.1)
        public const decimal DemoPriceScaleFactor = 0.1m;

        // Default Loyalty Config (1000 VND = 10 Points in Demo Mode)
        public const int DemoPointsPerThousandVND = 10;
        public const int BusinessPointsPerThousandVND = 1;

        // Tier Multipliers
        public const decimal TierMultiplierMember = 1.00m;
        public const decimal TierMultiplierSilver = 1.25m;
        public const decimal TierMultiplierGold = 1.50m;
        public const decimal TierMultiplierPlatinum = 2.00m;

        // Maximum Voucher Discount Limits (VND)
        public const int MaxDiscount5Percent = 5000;
        public const int MaxDiscount10Percent = 10000;
        public const int MaxDiscount15Percent = 15000;

        // Upgraded Tier Spending Thresholds (Demo Mode Scale)
        public const int TierThresholdMemberMin = 0;
        public const int TierThresholdSilverMin = 50000;
        public const int TierThresholdSilverMaintain = 30000;
        public const int TierThresholdGoldMin = 150000;
        public const int TierThresholdGoldMaintain = 100000;
        public const int TierThresholdPlatinumMin = 300000;
        public const int TierThresholdPlatinumMaintain = 200000;

        /// <summary>
        /// Calculates the maximum allowed discount for a percentage-based voucher.
        /// </summary>
        public static int GetMaxDiscountCap(decimal discountPercent)
        {
            if (discountPercent <= 5.0m) return MaxDiscount5Percent;
            if (discountPercent <= 10.0m) return MaxDiscount10Percent;
            return MaxDiscount15Percent;
        }
    }
}
