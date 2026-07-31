/**
 * Centralized Business Settings for AutoWash Pro Frontend.
 * Eliminates magic numbers and inline business rules across React components.
 */

export const BUSINESS_SETTINGS = {
  // Demo Mode Price Scale Factor
  DEMO_SCALE_FACTOR: 0.1,

  // Service Base Prices (Demo Scale)
  SERVICE_PRICES: {
    STANDARD_WASH: 14900,
    PREMIUM_WASH: 29900,
    WAX_COATING: 7900,
    NANO_CERAMIC: 19900,
    ENGINE_BAY: 9900,
    ODOR_REMOVAL: 6900,
    LEATHER_SEAT: 12900,
    HEADLIGHT_RESTORATION: 15900,
  },

  // Tier Multipliers & Perks
  TIERS: {
    MEMBER: {
      name: 'Member',
      multiplier: 1.0,
      discountPercent: 0,
      minSpend: 0,
      badgeColor: '#6B7280',
      badgeClass: 'badge-member',
    },
    SILVER: {
      name: 'Silver',
      multiplier: 1.25,
      discountPercent: 2,
      minSpend: 50000,
      badgeColor: '#9CA3AF',
      badgeClass: 'badge-silver',
    },
    GOLD: {
      name: 'Gold',
      multiplier: 1.5,
      discountPercent: 5,
      minSpend: 150000,
      badgeColor: '#F59E0B',
      badgeClass: 'badge-gold',
    },
    PLATINUM: {
      name: 'Platinum',
      multiplier: 2.0,
      discountPercent: 10,
      minSpend: 300000,
      badgeColor: '#8B5CF6',
      badgeClass: 'badge-platinum',
    },
  },

  // Points Redemption Config
  LOYALTY: {
    POINTS_PER_1000_VND_DEMO: 10,
    POINTS_PER_1000_VND_BUSINESS: 1,
    MONEY_REDEMPTIONS: [
      { points: 500, value: 1000, label: 'Voucher 1.000đ' },
      { points: 1000, value: 2000, label: 'Voucher 2.000đ' },
      { points: 2500, value: 5000, label: 'Voucher 5.000đ' },
      { points: 5000, value: 10000, label: 'Voucher 10.000đ' },
    ],
    PERCENT_REDEMPTIONS: [
      { points: 3500, percent: 5, maxDiscount: 5000, label: 'Giảm giá 5% (Tối đa 5.000đ)' },
      { points: 7000, percent: 10, maxDiscount: 10000, label: 'Giảm giá 10% (Tối đa 10.000đ)' },
    ],
  },

  // Maximum Voucher Discount Limits
  MAX_DISCOUNT_CAPS: {
    PERCENT_5: 5000,
    PERCENT_10: 10000,
    PERCENT_15: 15000,
  },
};

/**
 * Currency Formatter Utility
 */
export const formatVND = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(amount)
    .replace('₫', 'đ');
};
