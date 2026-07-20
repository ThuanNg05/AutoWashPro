using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;

namespace Auto_Wash.Services
{
    /// <summary>
    /// Periodically reconciles PayOS payments that are still <c>Pending</c> past
    /// their expiry window. The payment page's reconcile-on-read only runs while
    /// the customer is polling; once they abandon checkout nothing updates the
    /// row. This sweep asks PayOS for the authoritative status of each overdue
    /// pending link and lets <see cref="PaymentService.ReconcilePaymentAsync"/>
    /// transition it (Expired → "Hết hạn", or Paid if it slipped through).
    /// </summary>
    public class PaymentExpiryBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<PaymentExpiryBackgroundService> _logger;
        private readonly IConfiguration _configuration;

        public PaymentExpiryBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<PaymentExpiryBackgroundService> logger,
            IConfiguration configuration)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _configuration = configuration;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("PaymentExpiryBackgroundService is starting.");

            var sweepSeconds = _configuration.GetValue<int>("PayOSSettings:ExpirySweepSeconds", 30);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await SweepExpiredPaymentsAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred executing PaymentExpiryBackgroundService.");
                }

                await Task.Delay(TimeSpan.FromSeconds(sweepSeconds), stoppingToken);
            }

            _logger.LogInformation("PaymentExpiryBackgroundService is stopping.");
        }

        private async Task SweepExpiredPaymentsAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AutoWashDbContext>();
            var paymentService = scope.ServiceProvider.GetRequiredService<IPaymentService>();

            var expiryMinutes = _configuration.GetValue<int>("PayOSSettings:ExpiryMinutes", 15);
            var cutoff = DateTime.Now.AddMinutes(-expiryMinutes);

            // PayOS links only — Cash/Free never reach the gateway. Anything still
            // Pending whose link was created before the cutoff is past its window.
            var overdueBookingIds = await context.Payments
                .Where(p => p.Status == (int)PaymentStatus.Pending
                         && p.PaymentMethod == (int)PaymentMethod.PayOS
                         && p.CreatedAt <= cutoff)
                .Select(p => p.BookingId)
                .ToListAsync();

            if (overdueBookingIds.Count == 0) return;

            _logger.LogInformation("PaymentExpiryBackgroundService: reconciling {Count} overdue pending payment(s).", overdueBookingIds.Count);

            foreach (var bookingId in overdueBookingIds)
            {
                try
                {
                    // ReconcilePaymentAsync queries PayOS and maps Expired → Expired,
                    // Cancelled/Failed → Failed, Paid → Paid. It is idempotent and
                    // early-returns for anything no longer Pending.
                    await paymentService.ReconcilePaymentAsync(bookingId);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "PaymentExpiryBackgroundService: failed to reconcile BookingId {BookingId}.", bookingId);
                }
            }
        }
    }
}
