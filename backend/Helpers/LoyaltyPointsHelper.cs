using System;

namespace Auto_Wash.Helpers
{
    /// <summary>
    /// Single source of truth for the loyalty earn-point formula.
    ///   EarnedPoint = (FinalPrice / 1000) × PointsPerThousandVND × TierMultiplier
    /// </summary>
    public static class LoyaltyPointsHelper
    {
        public static int ComputeEarnedPoints(int finalPrice, int pointsPerThousandVnd, decimal tierMultiplier)
        {
            if (finalPrice <= 0) return 0;
            int basePoints = (finalPrice / 1000) * pointsPerThousandVnd;
            return (int)Math.Floor(basePoints * tierMultiplier);
        }
    }
}
