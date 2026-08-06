using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Auto_Wash.Data.Entities;

namespace Auto_Wash.Data
{
    public class AutoWashDbContext : DbContext
    {
        public AutoWashDbContext(DbContextOptions<AutoWashDbContext> options) : base(options)
        {
        }

        public DbSet<OtpVerification> OtpVerifications { get; set; } = null!;
        public DbSet<Tier> Tiers { get; set; } = null!;
        public DbSet<Account> Accounts { get; set; } = null!;
        public DbSet<Service> Services { get; set; } = null!;
        public DbSet<Customer> Customers { get; set; } = null!;
        public DbSet<Vehicle> Vehicles { get; set; } = null!;
        public DbSet<TierPerk> TierPerks { get; set; } = null!;
        public DbSet<LoyaltyConfig> LoyaltyConfigs { get; set; } = null!;
        public DbSet<Reward> Rewards { get; set; } = null!;
        public DbSet<Booking> Bookings { get; set; } = null!;
        public DbSet<RewardRedemption> RewardRedemptions { get; set; } = null!;
        public DbSet<BookingService> BookingServices { get; set; } = null!;
        public DbSet<LoyaltyTransaction> LoyaltyTransactions { get; set; } = null!;
        public DbSet<Queue> Queues { get; set; } = null!;
        public DbSet<Notification> Notifications { get; set; } = null!;
        public DbSet<Review> Reviews { get; set; } = null!;
        public DbSet<BookingAuditLog> BookingAuditLogs { get; set; } = null!;
        public DbSet<BookingRescheduleHistory> BookingRescheduleHistories { get; set; } = null!;
        public DbSet<Payment> Payments { get; set; } = null!;
        public DbSet<TierChangeLog> TierChangeLogs { get; set; } = null!;
        public DbSet<BookingTask> BookingTasks { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

            // Enum conversions: int-backed enums map directly; string-backed enums need explicit converters
            builder.Entity<Account>()
                .Property(a => a.Role)
                .HasConversion<int>();

            builder.Entity<Booking>()
                .Property(b => b.Status)
                .HasConversion<int>();

            builder.Entity<Service>()
                .Property(s => s.Category)
                .HasConversion<int>();

            builder.Entity<Queue>()
                .Property(q => q.Status)
                .HasConversion<string>()
                .HasMaxLength(30);

            builder.Entity<RewardRedemption>()
                .Property(r => r.Status)
                .HasConversion<string>()
                .HasMaxLength(20);

            // LoyaltyTransactionType: string-backed enum with legacy value resolution
            var loyaltyTxTypeConverter = new ValueConverter<LoyaltyTransactionType, string>(
                v => v.ToString(),
                v => ParseLegacyTransactionType(v));

            builder.Entity<LoyaltyTransaction>()
                .Property(lt => lt.TransactionType)
                .HasConversion(loyaltyTxTypeConverter)
                .HasMaxLength(20);

            // 1. OtpVerifications

            builder.Entity<OtpVerification>()
                .HasIndex(o => o.Email)
                .HasDatabaseName("idx_otp_email");

            builder.Entity<OtpVerification>()
                .HasIndex(o => o.PlateNumber)
                .HasDatabaseName("idx_otp_platenumber");

            // 2. Tiers (No special index or unique keys other than PK)

            // 3. Accounts
            builder.Entity<Account>()
                .HasIndex(a => a.GoogleId)
                .IsUnique()
                .HasDatabaseName("uq_accounts_googleid");

            builder.Entity<Account>()
                .HasIndex(a => a.Email)
                .IsUnique()
                .HasDatabaseName("uq_accounts_email");

            builder.Entity<Account>()
                .HasIndex(a => a.Phone)
                .IsUnique()
                .HasDatabaseName("uq_accounts_phone");

            // 4. Services (No special indices or unique keys other than PK)

            // 5. Customers
            builder.Entity<Customer>()
                .HasIndex(c => c.AccountId)
                .IsUnique()
                .HasDatabaseName("uq_customers_accountid");

            builder.Entity<Customer>()
                .HasIndex(c => c.MembershipCode)
                .IsUnique()
                .HasDatabaseName("uq_customers_membershipcode");

            builder.Entity<Customer>()
                .HasOne(c => c.Account)
                .WithOne(a => a.Customer)
                .HasForeignKey<Customer>(c => c.AccountId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Customer>()
                .HasOne(c => c.Tier)
                .WithMany(t => t.Customers)
                .HasForeignKey(c => c.TierId)
                .OnDelete(DeleteBehavior.Restrict);

            // 6. Vehicles
            builder.Entity<Vehicle>()
                .HasIndex(v => v.LicensePlate)
                .IsUnique()
                .HasDatabaseName("uq_vehicles_licenseplate");

            builder.Entity<Vehicle>()
                .HasOne(v => v.Customer)
                .WithMany(c => c.Vehicles)
                .HasForeignKey(v => v.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            // 7. TierPerks
            builder.Entity<TierPerk>()
                .HasOne(tp => tp.Tier)
                .WithMany(t => t.TierPerks)
                .HasForeignKey(tp => tp.TierId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<TierPerk>()
                .HasOne(tp => tp.Service)
                .WithMany(s => s.TierPerks)
                .HasForeignKey(tp => tp.ServiceId)
                .OnDelete(DeleteBehavior.SetNull);

            // 8. LoyaltyConfig
            builder.Entity<LoyaltyConfig>()
                .HasOne(lc => lc.UpdatedByAccount)
                .WithMany(a => a.UpdatedLoyaltyConfigs)
                .HasForeignKey(lc => lc.UpdatedBy)
                .OnDelete(DeleteBehavior.SetNull);

            // 9. Rewards
            builder.Entity<Reward>()
                .HasOne(r => r.Service)
                .WithMany(s => s.Rewards)
                .HasForeignKey(r => r.ServiceId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Reward>()
                .HasOne(r => r.MinTier)
                .WithMany()
                .HasForeignKey(r => r.MinTierId)
                .OnDelete(DeleteBehavior.SetNull);

            // 11. Bookings
            builder.Entity<Booking>()
                .HasIndex(b => b.CustomerId)
                .HasDatabaseName("idx_bookings_customerid");

            builder.Entity<Booking>()
                .HasIndex(b => b.ScheduledAt)
                .HasDatabaseName("idx_bookings_scheduledat");

            builder.Entity<Booking>()
                .HasIndex(b => b.Status)
                .HasDatabaseName("idx_bookings_status");

            builder.Entity<Booking>()
                .HasIndex(b => new { b.VehicleId, b.ScheduledAt })
                .IsUnique()
                .HasFilter("status != 4 AND status != 5 AND status != 7")
                .HasDatabaseName("uq_bookings_vehicle_scheduledat_active");

            builder.Entity<Booking>()
                .HasOne(b => b.Customer)
                .WithMany(c => c.Bookings)
                .HasForeignKey(b => b.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Booking>()
                .HasOne(b => b.Vehicle)
                .WithMany(v => v.Bookings)
                .HasForeignKey(b => b.VehicleId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Booking>()
                .HasOne(b => b.AppliedRedemption)
                .WithMany(r => r.AppliedBookings)
                .HasForeignKey(b => b.RedemptionId)
                .OnDelete(DeleteBehavior.SetNull);

            // Tier snapshot frozen at checkout (no navigation needed)
            builder.Entity<Booking>()
                .HasOne<Tier>()
                .WithMany()
                .HasForeignKey(b => b.TierIdSnapshot)
                .HasConstraintName("fk_bookings_tier_snapshot")
                .OnDelete(DeleteBehavior.SetNull);

            // 12. RewardRedemptions
            builder.Entity<RewardRedemption>()
                .HasIndex(r => r.CustomerId)
                .HasDatabaseName("idx_redemptions_customerid");

            builder.Entity<RewardRedemption>()
                .HasIndex(r => new { r.CustomerId, r.Status })
                .HasDatabaseName("idx_redemptions_customer_status");

            builder.Entity<RewardRedemption>()
                .HasIndex(r => r.VoucherCode)
                .IsUnique()
                .HasDatabaseName("uq_rewardredemptions_vouchercode");

            builder.Entity<RewardRedemption>()
                .HasOne(r => r.Customer)
                .WithMany(c => c.RewardRedemptions)
                .HasForeignKey(r => r.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<RewardRedemption>()
                .HasOne(r => r.Reward)
                .WithMany(rw => rw.RewardRedemptions)
                .HasForeignKey(r => r.RewardId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<RewardRedemption>()
                .HasOne(r => r.Booking)
                .WithMany(b => b.RelatedRedemptions)
                .HasForeignKey(r => r.BookingId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<RewardRedemption>()
                .HasOne(r => r.HandledBy)
                .WithMany()
                .HasForeignKey(r => r.HandledByAccountId)
                .OnDelete(DeleteBehavior.SetNull);

            // 13. BookingServices
            builder.Entity<BookingService>()
                .HasIndex(bs => new { bs.BookingId, bs.ServiceId })
                .IsUnique()
                .HasDatabaseName("uq_bookingservices");

            builder.Entity<BookingService>()
                .HasOne(bs => bs.Booking)
                .WithMany(b => b.BookingServices)
                .HasForeignKey(bs => bs.BookingId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<BookingService>()
                .HasOne(bs => bs.Service)
                .WithMany(s => s.BookingServices)
                .HasForeignKey(bs => bs.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);

            // 14. LoyaltyTransactions
            builder.Entity<LoyaltyTransaction>()
                .HasIndex(lt => lt.CustomerId)
                .HasDatabaseName("idx_lt_customerid");

            builder.Entity<LoyaltyTransaction>()
                .HasIndex(lt => lt.TransactionType)
                .HasDatabaseName("idx_lt_type");

            builder.Entity<LoyaltyTransaction>()
                .HasIndex(lt => new { lt.ExpiryDate, lt.IsExpired })
                .HasDatabaseName("idx_lt_expiry");

            // Filtered unique index: only one 'Earn' transaction per booking
            builder.Entity<LoyaltyTransaction>()
                .HasIndex(lt => lt.BookingId)
                .IsUnique()
                .HasFilter("transactiontype = 'Earn'")
                .HasDatabaseName("uq_loyaltytransactions_bookingid_earn");

            builder.Entity<LoyaltyTransaction>()
                .HasOne(lt => lt.Customer)
                .WithMany(c => c.LoyaltyTransactions)
                .HasForeignKey(lt => lt.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<LoyaltyTransaction>()
                .HasOne(lt => lt.Booking)
                .WithMany(b => b.LoyaltyTransactions)
                .HasForeignKey(lt => lt.BookingId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<LoyaltyTransaction>()
                .HasOne(lt => lt.RewardRedemption)
                .WithMany(r => r.LoyaltyTransactions)
                .HasForeignKey(lt => lt.RedemptionId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<LoyaltyTransaction>()
                .HasOne(lt => lt.FromTier)
                .WithMany()
                .HasForeignKey(lt => lt.FromTierId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<LoyaltyTransaction>()
                .HasOne(lt => lt.ToTier)
                .WithMany()
                .HasForeignKey(lt => lt.ToTierId)
                .OnDelete(DeleteBehavior.SetNull);

            // 15. Queue
            builder.Entity<Queue>()
                .HasIndex(q => q.Status)
                .HasDatabaseName("idx_queue_status");

            builder.Entity<Queue>()
                .HasIndex(q => q.LicensePlate)
                .HasDatabaseName("idx_queue_plate");

            builder.Entity<Queue>()
                .HasOne(q => q.Booking)
                .WithMany(b => b.Queues)
                .HasForeignKey(q => q.BookingId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Queue>()
                .HasOne(q => q.Vehicle)
                .WithMany(v => v.Queues)
                .HasForeignKey(q => q.VehicleId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Queue>()
                .HasOne(q => q.Customer)
                .WithMany(c => c.Queues)
                .HasForeignKey(q => q.CustomerId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Queue>()
                .HasOne(q => q.Tier)
                .WithMany()
                .HasForeignKey(q => q.TierId)
                .OnDelete(DeleteBehavior.SetNull);

            // 16. Notifications
            builder.Entity<Notification>()
                .HasIndex(n => n.CustomerId)
                .HasDatabaseName("idx_notifications_customerid");

            builder.Entity<Notification>()
                .HasIndex(n => new { n.CustomerId, n.IsRead })
                .HasDatabaseName("idx_notifications_isread");

            builder.Entity<Notification>()
                .HasOne(n => n.Customer)
                .WithMany(c => c.Notifications)
                .HasForeignKey(n => n.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);            

            // 17. Reviews
            builder.Entity<Review>()
                .HasIndex(r => r.BookingId)
                .IsUnique()
                .HasDatabaseName("uq_reviews_bookingid");

            builder.Entity<Review>()
                .HasOne(r => r.Booking)
                .WithOne()
                .HasForeignKey<Review>(r => r.BookingId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Review>()
                .HasOne(r => r.Customer)
                .WithMany()
                .HasForeignKey(r => r.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            // 18. BookingAuditLogs
            builder.Entity<BookingAuditLog>()
                .HasOne(al => al.Booking)
                .WithMany()
                .HasForeignKey(al => al.BookingId)
                .OnDelete(DeleteBehavior.Cascade);

            // 19. BookingRescheduleHistories
            builder.Entity<BookingRescheduleHistory>()
                .HasOne(rh => rh.Booking)
                .WithMany()
                .HasForeignKey(rh => rh.BookingId)
                .OnDelete(DeleteBehavior.Cascade);

            // 20. Payments (One-to-One)
            builder.Entity<Payment>()
                .HasKey(p => p.PaymentId);

            builder.Entity<Payment>()
                .HasOne(p => p.Booking)
                .WithOne(b => b.Payment)
                .HasForeignKey<Payment>(p => p.BookingId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Payment>()
                .HasIndex(p => p.TxnRef)
                .IsUnique()
                .HasDatabaseName("uq_payments_txnref");

            // 21. TierChangeLogs (configured at the end of OnModelCreating to override lowercase convention)

            // 21. Seed Tiers & LoyaltyConfig
            builder.Entity<Tier>().HasData(
                new Tier
                {
                    TierId = 1,
                    TierName = "Member",
                    MinRankingBalance = 0,
                    MaintainBalance = 0,
                    BookingWindowDays = 7,
                    QueuePriority = 1,
                    PointMultiplier = 1.00m,
                    DiscountPercent = 0.00m,
                    SortOrder = 1
                },
                new Tier
                {
                    TierId = 2,
                    TierName = "Silver",
                    MinRankingBalance = 50000,
                    MaintainBalance = 30000,
                    BookingWindowDays = 14,
                    QueuePriority = 2,
                    PointMultiplier = 1.25m,
                    DiscountPercent = 2.00m,
                    SortOrder = 2
                },
                new Tier
                {
                    TierId = 3,
                    TierName = "Gold",
                    MinRankingBalance = 150000,
                    MaintainBalance = 100000,
                    BookingWindowDays = 30,
                    QueuePriority = 3,
                    PointMultiplier = 1.50m,
                    DiscountPercent = 5.00m,
                    SortOrder = 3
                },
                new Tier
                {
                    TierId = 4,
                    TierName = "Platinum",
                    MinRankingBalance = 300000,
                    MaintainBalance = 200000,
                    BookingWindowDays = 60,
                    QueuePriority = 4,
                    PointMultiplier = 2.00m,
                    DiscountPercent = 10.00m,
                    SortOrder = 4
                }
            );

            builder.Entity<LoyaltyConfig>().HasData(
                new LoyaltyConfig
                {
                    ConfigId = 1,
                    PointsPerThousandVND = 10,
                    PointExpiryMonths = 12,
                    TierReviewDayOfMonth = 1,
                    RankingWindowYears = 2,
                    UpdatedAt = DateTime.UtcNow
                }
            );

            builder.Entity<Service>().HasData(
                // === MAIN SERVICES (IsAddOn = false) ===
                new Service
                {
                    ServiceId = 999,
                    ServiceName = "Standard Car Wash",
                    Description = "Dịch vụ rửa xe tiêu chuẩn bao gồm: Rửa ngoại thất, vệ sinh bánh xe, hút bụi nội thất, lau kính, lau taplo, dưỡng nội thất cơ bản, kiểm tra cuối.",
                    Category = ServiceCategory.Basic,
                    BasePrice = 14900,
                    EstimatedMinutes = 50,
                    IsAddOn = false,
                    IsActive = true,
                    IsFeatured = true
                },
                new Service
                {
                    ServiceId = 1000,
                    ServiceName = "Premium Car Wash",
                    Description = "Bao gồm tất cả gói Standard, cộng thêm: Rửa bọt cao cấp, đánh bóng lốp, vệ sinh nội thất sâu, dưỡng da ghế, phục hồi nhựa nội thất, hoàn thiện cao cấp.",
                    Category = ServiceCategory.Premium,
                    BasePrice = 29900,
                    EstimatedMinutes = 90,
                    IsAddOn = false,
                    IsActive = true,
                    IsFeatured = true
                },

                // === ADD-ON SERVICES (IsAddOn = true) ===
                new Service
                {
                    ServiceId = 1001,
                    ServiceName = "Wax Coating",
                    Description = "Phủ lớp sáp bảo vệ bề mặt sơn, tạo độ bóng cao và chống bám bẩn.",
                    Category = ServiceCategory.AddOn,
                    BasePrice = 7900,
                    EstimatedMinutes = 15,
                    IsAddOn = true,
                    IsActive = true,
                    IsFeatured = false
                },
                new Service
                {
                    ServiceId = 1002,
                    ServiceName = "Nano Ceramic Spray",
                    Description = "Phủ ceramic nano tạm thời, tăng khả năng chống nước và bảo vệ sơn xe.",
                    Category = ServiceCategory.AddOn,
                    BasePrice = 19900,
                    EstimatedMinutes = 25,
                    IsAddOn = true,
                    IsActive = true,
                    IsFeatured = false
                },
                new Service
                {
                    ServiceId = 1003,
                    ServiceName = "Engine Bay Cleaning",
                    Description = "Vệ sinh khoang máy an toàn, loại bỏ bụi bẩn và dầu mỡ tích tụ.",
                    Category = ServiceCategory.AddOn,
                    BasePrice = 9900,
                    EstimatedMinutes = 20,
                    IsAddOn = true,
                    IsActive = true,
                    IsFeatured = false
                },
                new Service
                {
                    ServiceId = 1004,
                    ServiceName = "Interior Odor Removal",
                    Description = "Khử mùi hôi nội thất và làm mới không khí cabin xe.",
                    Category = ServiceCategory.AddOn,
                    BasePrice = 6900,
                    EstimatedMinutes = 15,
                    IsAddOn = true,
                    IsActive = true,
                    IsFeatured = false
                },
                new Service
                {
                    ServiceId = 1005,
                    ServiceName = "Leather Seat Conditioning",
                    Description = "Dưỡng ẩm và bảo vệ ghế da, giúp da mềm mại và kéo dài tuổi thọ.",
                    Category = ServiceCategory.AddOn,
                    BasePrice = 12900,
                    EstimatedMinutes = 20,
                    IsAddOn = true,
                    IsActive = true,
                    IsFeatured = false
                },
                new Service
                {
                    ServiceId = 1006,
                    ServiceName = "Headlight Restoration",
                    Description = "Phục hồi đèn pha bị mờ, cải thiện khả năng chiếu sáng và thẩm mỹ.",
                    Category = ServiceCategory.AddOn,
                    BasePrice = 15900,
                    EstimatedMinutes = 25,
                    IsAddOn = true,
                    IsActive = true,
                    IsFeatured = false
                }
            );

            builder.Entity<Reward>().HasData(
                // Money Vouchers
                new Reward
                {
                    RewardId = 1001,
                    RewardName = "Voucher 1.000đ",
                    Description = "Voucher giảm trực tiếp 1.000đ cho hóa đơn dịch vụ",
                    PointCost = 500,
                    RewardType = "DiscountMoney",
                    DiscountValue = 1000,
                    ValidDays = 30,
                    IsActive = true,
                    IsAutomaticReward = false
                },
                new Reward
                {
                    RewardId = 1002,
                    RewardName = "Voucher 2.000đ",
                    Description = "Voucher giảm trực tiếp 2.000đ cho hóa đơn dịch vụ",
                    PointCost = 1000,
                    RewardType = "DiscountMoney",
                    DiscountValue = 2000,
                    ValidDays = 30,
                    IsActive = true,
                    IsAutomaticReward = false
                },
                new Reward
                {
                    RewardId = 1003,
                    RewardName = "Voucher 5.000đ",
                    Description = "Voucher giảm trực tiếp 5.000đ cho hóa đơn dịch vụ",
                    PointCost = 2500,
                    RewardType = "DiscountMoney",
                    DiscountValue = 5000,
                    ValidDays = 30,
                    IsActive = true,
                    IsAutomaticReward = false
                },
                new Reward
                {
                    RewardId = 1004,
                    RewardName = "Voucher 10.000đ",
                    Description = "Voucher giảm trực tiếp 10.000đ cho hóa đơn dịch vụ",
                    PointCost = 5000,
                    RewardType = "DiscountMoney",
                    DiscountValue = 10000,
                    ValidDays = 30,
                    IsActive = true,
                    IsAutomaticReward = false
                },
                // Percentage Vouchers
                new Reward
                {
                    RewardId = 1005,
                    RewardName = "Giảm giá 5%",
                    Description = "Voucher giảm giá 5% (tối đa 5.000đ) cho hóa đơn dịch vụ",
                    PointCost = 3500,
                    RewardType = "DiscountPercent",
                    DiscountValue = 5,
                    ValidDays = 30,
                    IsActive = true,
                    IsAutomaticReward = false
                },
                new Reward
                {
                    RewardId = 1006,
                    RewardName = "Giảm giá 10%",
                    Description = "Voucher giảm giá 10% (tối đa 10.000đ) cho hóa đơn dịch vụ",
                    PointCost = 7000,
                    RewardType = "DiscountPercent",
                    DiscountValue = 10,
                    ValidDays = 30,
                    IsActive = true,
                    IsAutomaticReward = false
                },
                // Tier Upgrade Rewards (Automatic)
                new Reward
                {
                    RewardId = 1007,
                    RewardName = "Quà Nâng Hạng Silver (Voucher 5%)",
                    Description = "Voucher giảm 5% (tối đa 5.000đ) mừng nâng hạng Silver",
                    PointCost = 0,
                    RewardType = "UpgradeReward",
                    DiscountValue = 5,
                    MinTierId = 2,
                    ValidDays = 60,
                    IsActive = true,
                    IsAutomaticReward = true
                },
                new Reward
                {
                    RewardId = 1008,
                    RewardName = "Quà Nâng Hạng Gold (Voucher 10% + Tire Shine)",
                    Description = "Voucher giảm 10% (tối đa 10.000đ) + 01 lượt đánh bóng lốp mừng nâng hạng Gold",
                    PointCost = 0,
                    RewardType = "UpgradeReward",
                    DiscountValue = 10,
                    MinTierId = 3,
                    ValidDays = 60,
                    IsActive = true,
                    IsAutomaticReward = true
                },
                new Reward
                {
                    RewardId = 1009,
                    RewardName = "Quà Nâng Hạng Platinum (Voucher 15% + Standard Wash + Birthday Gift)",
                    Description = "Voucher giảm 15% (tối đa 15.000đ) + 01 lượt rửa xe miễn phí + Quà sinh nhật độc quyền mừng nâng hạng Platinum",
                    PointCost = 0,
                    RewardType = "UpgradeReward",
                    DiscountValue = 15,
                    MinTierId = 4,
                    ValidDays = 90,
                    IsActive = true,
                    IsAutomaticReward = true
                },
                // Physical Gift & Free Wash
                new Reward
                {
                    RewardId = 1010,
                    RewardName = "Mũ bảo hiểm AutoWash",
                    Description = "Mũ bảo hiểm nửa đầu in logo AutoWash cao cấp",
                    PointCost = 500,
                    RewardType = "PhysicalGift",
                    ValidDays = 60,
                    StockLimit = 50,
                    RedeemedCount = 0,
                    IsActive = true,
                    IsAutomaticReward = false
                },
                new Reward
                {
                    RewardId = 1011,
                    RewardName = "Rửa xe tiêu chuẩn miễn phí",
                    Description = "Voucher miễn phí dịch vụ Rửa xe tiêu chuẩn (Standard Wash)",
                    PointCost = 1000,
                    RewardType = "Free_Wash",
                    ServiceId = 999,
                    ValidDays = 30,
                    IsActive = true,
                    IsAutomaticReward = false
                }
            );



            // Configure all tables and columns to be lowercase for Supabase PostgreSQL compatibility
            foreach (var entity in builder.Model.GetEntityTypes())
            {
                var tableName = entity.GetTableName();
                if (!string.IsNullOrEmpty(tableName))
                {
                    entity.SetTableName(tableName.ToLowerInvariant());
                }

                foreach (var property in entity.GetProperties())
                {
                    property.SetColumnName(property.Name.ToLowerInvariant());
                }

                foreach (var key in entity.GetKeys())
                {
                    var keyName = key.GetName();
                    if (!string.IsNullOrEmpty(keyName))
                    {
                        key.SetName(keyName.ToLowerInvariant());
                    }
                }

                foreach (var foreignKey in entity.GetForeignKeys())
                {
                    var constraintName = foreignKey.GetConstraintName();
                    if (!string.IsNullOrEmpty(constraintName))
                    {
                        foreignKey.SetConstraintName(constraintName.ToLowerInvariant());
                    }
                }

                foreach (var index in entity.GetIndexes())
                {
                    var indexName = index.GetDatabaseName();
                    if (!string.IsNullOrEmpty(indexName))
                    {
                        index.SetDatabaseName(indexName.ToLowerInvariant());
                    }
                }
            }

            // Consolidated TierChangeLog mapping to override lowercase convention and match existing DB schema (id, oldtierid, newtierid, no changetype)
            builder.Entity<TierChangeLog>(entity =>
            {
                entity.HasKey(t => t.LogId);
                entity.Property(t => t.LogId).HasColumnName("id");
                entity.Property(t => t.FromTierId).HasColumnName("oldtierid");
                entity.Property(t => t.ToTierId).HasColumnName("newtierid");
                entity.Ignore(t => t.ChangeType);

                entity.HasOne(tcl => tcl.Customer)
                    .WithMany()
                    .HasForeignKey(tcl => tcl.CustomerId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(tcl => tcl.FromTier)
                    .WithMany()
                    .HasForeignKey(tcl => tcl.FromTierId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(tcl => tcl.ToTier)
                    .WithMany()
                    .HasForeignKey(tcl => tcl.ToTierId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }

        /// <summary>
        /// Resolves legacy string values ("EARN", "TIER_UPGRADE", "ADJUST", etc.)
        /// to the strongly-typed LoyaltyTransactionType enum.
        /// </summary>
        private static LoyaltyTransactionType ParseLegacyTransactionType(string value)
        {
            if (string.IsNullOrEmpty(value))
                return LoyaltyTransactionType.Earn;

            return value.ToUpperInvariant() switch
            {
                "EARN" or "EARNED" or "ADJUST" => LoyaltyTransactionType.Earn,
                "REDEEM" => LoyaltyTransactionType.Redeem,
                "EXPIRE" or "EXPIRED" => LoyaltyTransactionType.Expire,
                "UPGRADE" or "TIER_UPGRADE" => LoyaltyTransactionType.Upgrade,
                "DOWNGRADE" or "TIER_DOWNGRADE" => LoyaltyTransactionType.Downgrade,
                _ => Enum.TryParse<LoyaltyTransactionType>(value, true, out var result)
                     ? result
                     : LoyaltyTransactionType.Earn
            };
        }
    }
}
