using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace Auto_Wash.Services
{
    public class OwnershipTransferBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<OwnershipTransferBackgroundService> _logger;
        private readonly IConfiguration _configuration;

        public OwnershipTransferBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<OwnershipTransferBackgroundService> logger,
            IConfiguration configuration)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _configuration = configuration;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("OwnershipTransferBackgroundService is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var transferService = scope.ServiceProvider.GetRequiredService<OwnershipTransferService>();
                        var timeoutDays = _configuration.GetValue<int>("OwnershipTransferSettings:TimeoutDays", 7);

                        _logger.LogInformation("Checking for timed-out vehicle ownership transfer requests...");
                        await transferService.ProcessTimeoutsAsync(timeoutDays);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred executing OwnershipTransferBackgroundService.");
                }

                // Wait 1 minute
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }

            _logger.LogInformation("OwnershipTransferBackgroundService is stopping.");
        }
    }
}
