using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Helpers;
using Auto_Wash.DTOs.Booking;

namespace Auto_Wash.Services
{
    public class BookingWorkflowBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<BookingWorkflowBackgroundService> _logger;
        private readonly IConfiguration _configuration;

        public BookingWorkflowBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<BookingWorkflowBackgroundService> logger,
            IConfiguration configuration)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _configuration = configuration;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("BookingWorkflowBackgroundService is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessWorkflowAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred executing BookingWorkflowBackgroundService.");
                }

                // Polling interval for queue workflow processing
                await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
            }

            _logger.LogInformation("BookingWorkflowBackgroundService is stopping.");
        }

        private async Task ProcessWorkflowAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AutoWashDbContext>();
            var loyaltyTierService = scope.ServiceProvider.GetRequiredService<LoyaltyTierService>();
            var now = DateTime.Now;
            var today = DateTime.Today;
            var awardedCustomerIds = new HashSet<int>();

            // 1. Fetch active queue items for today that are not completed, cancelled, or archived
            var activeQueues = await context.Queues
                .Include(q => q.Booking)
                    .ThenInclude(b => b!.Customer)
                        .ThenInclude(c => c.Account)
                .Include(q => q.Booking)
                    .ThenInclude(b => b!.Customer)
                        .ThenInclude(c => c.Tier)
                .Where(q => q.Status != QueueStatus.Cancelled 
                         && q.Status != QueueStatus.Archived
                         && (q.Booking == null || q.Booking.CheckedOutAt == null))
                .ToListAsync();

            bool changed = false;

            foreach (var q in activeQueues)
            {
                var tasks = q.BookingId.HasValue
                    ? await context.BookingTasks
                        .Where(t => t.BookingId == q.BookingId)
                        .OrderBy(t => t.SequenceOrder)
                        .ToListAsync()
                    : new List<BookingTask>();

                if (tasks.Count == 0 && q.BookingId.HasValue)
                {
                    await AutoGenerateTasksForQueueAsync(q.BookingId.Value, context);
                    tasks = await context.BookingTasks
                        .Where(t => t.BookingId == q.BookingId)
                        .OrderBy(t => t.SequenceOrder)
                        .ToListAsync();
                }
                else if (q.BookingId.HasValue && tasks.Count > 0 && !tasks.Any(t => t.TaskType == "AutoCapture"))
                {
                    int lastSeq = tasks.Max(t => t.SequenceOrder);
                    var extraTasks = new List<BookingTask>
                    {
                        new BookingTask { BookingId = q.BookingId.Value, TaskType = "AutoCapture", DisplayName = "Tự động chụp ảnh", SequenceOrder = ++lastSeq, EstimatedDurationSeconds = 0, Status = BookingTaskStatus.Pending },
                        new BookingTask { BookingId = q.BookingId.Value, TaskType = "AutoSendMail", DisplayName = "Tự động gửi mail", SequenceOrder = ++lastSeq, EstimatedDurationSeconds = 0, Status = BookingTaskStatus.Pending },
                        new BookingTask { BookingId = q.BookingId.Value, TaskType = "WaitingCheckout", DisplayName = "Chờ thanh toán", SequenceOrder = ++lastSeq, EstimatedDurationSeconds = 0, Status = BookingTaskStatus.Pending }
                    };
                    context.BookingTasks.AddRange(extraTasks);
                    await context.SaveChangesAsync();
                    tasks.AddRange(extraTasks);
                    tasks = tasks.OrderBy(t => t.SequenceOrder).ToList();
                }

                if (tasks.Count == 0) continue;

                // --- Dynamic task-based workflow ---
                var activeTask = tasks.FirstOrDefault(t => t.Status == BookingTaskStatus.InProgress);
                var nextPending = tasks.Where(t => t.Status == BookingTaskStatus.Pending)
                    .OrderBy(t => t.SequenceOrder)
                    .FirstOrDefault();

                if (activeTask != null)
                {
                    if (!activeTask.StartedAt.HasValue)
                    {
                        activeTask.StartedAt = now;
                        changed = true;
                    }

                    // Instant / Manual tasks (AutoCapture, AutoSendMail, WaitingCheckout)
                    // Worker must STOP and wait for staff photo upload or manual checkout.
                    if (activeTask.TaskType == "AutoCapture" || activeTask.TaskType == "AutoSendMail" || activeTask.TaskType == "WaitingCheckout")
                    {
                        q.CurrentStage = activeTask.TaskType;
                        continue;
                    }

                    // Check if active task's estimated duration has elapsed
                    var taskElapsed = (now - activeTask.StartedAt.Value).TotalSeconds;

                    if (activeTask.EstimatedDurationSeconds > 0
                        && taskElapsed >= activeTask.EstimatedDurationSeconds)
                    {
                        // Complete current timed task (e.g. CheckIn, Washing, AddonProcessing, Drying)
                        activeTask.Status = BookingTaskStatus.Completed;
                        activeTask.CompletedAt = now;

                        // Transition to next pending task
                        nextPending = tasks.Where(t => t.Status == BookingTaskStatus.Pending)
                            .OrderBy(t => t.SequenceOrder)
                            .FirstOrDefault();

                        if (nextPending != null)
                        {
                            nextPending.Status = BookingTaskStatus.InProgress;
                            nextPending.StartedAt = now;
                            q.CurrentStage = nextPending.TaskType;

                            // Sync Queue status if applicable for earlier stages
                            SyncQueueFromTask(q, nextPending, context, now);
                        }

                        changed = true;

                        // Runtime transition log (Rule 10)
                        var tracking = BookingWorkflowConfig.GetProgressForBooking(q.Booking, q, tasks);
                        _logger.LogInformation("[WORKFLOW TRANSITION] BookingId={BookingId}, QueueId={QueueId}, PrevTask={PrevTask}, NextTask={NextTask}, BookingStatus={BookingStatus}, QueueStatus={QueueStatus}, CurrentStage={CurrentStage}, Progress={Progress}%, RemainingSeconds={RemainingSeconds}s",
                            q.BookingId, q.QueueId, activeTask.TaskType, nextPending?.TaskType ?? "None", q.Booking?.Status, q.Status, tracking.CurrentStage, tracking.Progress, tracking.RemainingSeconds);
                    }
                    else
                    {
                        // Task still in progress — sync display stage
                        q.CurrentStage = activeTask.TaskType;
                    }
                }
                else if (nextPending != null)
                {
                    // No active task but pending exists → start the next one
                    nextPending.Status = BookingTaskStatus.InProgress;
                    nextPending.StartedAt = now;
                    q.CurrentStage = nextPending.TaskType;
                    SyncQueueFromTask(q, nextPending, context, now);
                    changed = true;

                    var tracking = BookingWorkflowConfig.GetProgressForBooking(q.Booking, q, tasks);
                    _logger.LogInformation("[WORKFLOW TRANSITION] BookingId={BookingId}, QueueId={QueueId}, PrevTask=None, NextTask={NextTask}, BookingStatus={BookingStatus}, QueueStatus={QueueStatus}, CurrentStage={CurrentStage}, Progress={Progress}%, RemainingSeconds={RemainingSeconds}s",
                        q.BookingId, q.QueueId, nextPending.TaskType, q.Booking?.Status, q.Status, tracking.CurrentStage, tracking.Progress, tracking.RemainingSeconds);
                }
            }

            // 2. Auto NoShow Detection (Threshold configurable)
            int noShowThreshold = _configuration.GetValue<int>("BookingCapacityConfig:CheckInWindowMinutes", 15);
            var noShowCutoff = now.AddMinutes(-noShowThreshold);
            var overdueBookings = await context.Bookings
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Account)
                .Include(b => b.Vehicle)
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .Where(b => (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed)
                            && b.ScheduledAt <= noShowCutoff)
                .ToListAsync();
 
            foreach (var booking in overdueBookings)
            {
                booking.Status = BookingStatus.NoShow;
                booking.NoShowAt = now;
                changed = true;
 
                // Remove from active queue if one exists
                var activeQueueItem = await context.Queues
                    .FirstOrDefaultAsync(q => q.BookingId == booking.BookingId && q.Status != QueueStatus.Cancelled && q.Status != QueueStatus.Archived);
                if (activeQueueItem != null)
                {
                    activeQueueItem.Status = QueueStatus.Cancelled;
                }
 
                // Log Audit Event
                context.BookingAuditLogs.Add(new BookingAuditLog
                {
                    BookingId = booking.BookingId,
                    Action = "NoShow",
                    Description = $"Tự động đánh dấu Không Đến (No-Show) do quá hạn check-in {noShowThreshold} phút.",
                    PerformedBy = "System",
                    CreatedAt = now
                });
 
                // Send notification to customer
                context.Notifications.Add(new Notification
                {
                    CustomerId = booking.CustomerId,
                    Title = "Lịch hẹn quá hạn (No-Show)",
                    Message = $"Lịch hẹn #{booking.BookingId} cho xe {booking.Vehicle?.LicensePlate} lúc {booking.ScheduledAt:HH:mm} đã tự động chuyển thành No-Show do trễ check-in {noShowThreshold} phút.",
                    Type = "Booking",
                    IsRead = false,
                    CreatedAt = now
                });

                if (!booking.NoShowEmailSent)
                {
                    booking.NoShowEmailSent = true;
                    var mainService = booking.BookingServices
                        .Where(bs => !bs.Service.IsAddOn)
                        .Select(bs => bs.Service.ServiceName)
                        .FirstOrDefault() ?? "Dịch vụ rửa xe";

                    var emailModel = new BookingEmailModel
                    {
                        BookingId = booking.BookingId,
                        CustomerName = booking.Customer?.Account?.FullName ?? "Khách hàng",
                        Email = booking.Customer?.Account?.Email ?? "",
                        LicensePlate = booking.Vehicle?.LicensePlate ?? "",
                        ScheduledAt = booking.ScheduledAt,
                        FinalPrice = booking.FinalPrice,
                        ServiceName = mainService
                    };

                    if (!string.IsNullOrWhiteSpace(emailModel.Email))
                    {
                        var notificationService = scope.ServiceProvider.GetRequiredService<BookingNotificationService>();
                        notificationService.SendNoShowEmailInBackground(emailModel);
                    }
                }
 
                _logger.LogInformation("[AUDIT EVENT] Booking NoShow Auto-Triggered: BookingId={BookingId}, ScheduledAt={ScheduledAt}, LicensePlate={LicensePlate}, NoShowAt={NoShowAt}",
                    booking.BookingId, booking.ScheduledAt, booking.Vehicle?.LicensePlate, booking.NoShowAt);
            }

            // 3. Booking Reminder Check
            var reminderConfig = _configuration.GetSection("BookingReminderConfig");
            bool useDemoReminder = reminderConfig.GetValue<bool>("UseDemoMode", false);
            int reminder1Minutes = reminderConfig.GetValue<int>("Reminder1Minutes", 60);
            int reminder2Minutes = reminderConfig.GetValue<int>("Reminder2Minutes", 30);
            double reminder1Threshold = useDemoReminder ? reminderConfig.GetValue<double>("Reminder1DemoSeconds", 60) : reminder1Minutes * 60;
            double reminder2Threshold = useDemoReminder ? reminderConfig.GetValue<double>("Reminder2DemoSeconds", 30) : reminder2Minutes * 60;

            var upcomingBookings = await context.Bookings
                .Include(b => b.Customer)
                    .ThenInclude(c => c.Account)
                .Include(b => b.Vehicle)
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .Where(b => (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed)
                            && (!b.Reminder1Sent || !b.Reminder2Sent))
                .ToListAsync();

            foreach (var booking in upcomingBookings)
            {
                var timeToAppointment = (booking.ScheduledAt - now).TotalSeconds;
                if (timeToAppointment > 0)
                {
                    if (!booking.Reminder1Sent && timeToAppointment <= reminder1Threshold)
                    {
                        booking.Reminder1Sent = true;
                        changed = true;

                        var mainService = booking.BookingServices
                            .Where(bs => !bs.Service.IsAddOn)
                            .Select(bs => bs.Service.ServiceName)
                            .FirstOrDefault() ?? "Dịch vụ rửa xe";

                        var emailModel = new BookingEmailModel
                        {
                            BookingId = booking.BookingId,
                            CustomerName = booking.Customer?.Account?.FullName ?? "Khách hàng",
                            Email = booking.Customer?.Account?.Email ?? "",
                            LicensePlate = booking.Vehicle?.LicensePlate ?? "",
                            ScheduledAt = booking.ScheduledAt,
                            FinalPrice = booking.FinalPrice,
                            ServiceName = mainService
                        };

                        if (!string.IsNullOrWhiteSpace(emailModel.Email))
                        {
                            var notificationService = scope.ServiceProvider.GetRequiredService<BookingNotificationService>();
                            notificationService.SendBookingReminderEmailInBackground(emailModel, reminder1Minutes);
                        }
                    }

                    if (!booking.Reminder2Sent && timeToAppointment <= reminder2Threshold)
                    {
                        booking.Reminder2Sent = true;
                        changed = true;

                        var mainService = booking.BookingServices
                            .Where(bs => !bs.Service.IsAddOn)
                            .Select(bs => bs.Service.ServiceName)
                            .FirstOrDefault() ?? "Dịch vụ rửa xe";

                        var emailModel = new BookingEmailModel
                        {
                            BookingId = booking.BookingId,
                            CustomerName = booking.Customer?.Account?.FullName ?? "Khách hàng",
                            Email = booking.Customer?.Account?.Email ?? "",
                            LicensePlate = booking.Vehicle?.LicensePlate ?? "",
                            ScheduledAt = booking.ScheduledAt,
                            FinalPrice = booking.FinalPrice,
                            ServiceName = mainService
                        };

                        if (!string.IsNullOrWhiteSpace(emailModel.Email))
                        {
                            var notificationService = scope.ServiceProvider.GetRequiredService<BookingNotificationService>();
                            notificationService.SendBookingReminderEmailInBackground(emailModel, reminder2Minutes);
                        }
                    }
                }
            }
 
            if (changed)
            {
                await context.SaveChangesAsync();
            }

            // Real-time UPGRADE re-check for just-completed customers. Runs after the
            // save above so the new Completed booking counts in the 6-month window (doc §4).
            if (awardedCustomerIds.Count > 0)
            {
                bool tierChanged = false;
                foreach (var custId in awardedCustomerIds)
                {
                    var cust = await context.Customers.FirstOrDefaultAsync(c => c.CustomerId == custId);
                    if (cust != null)
                    {
                        await loyaltyTierService.EvaluateUpgradeAsync(cust, now);
                        tierChanged = true;
                    }
                }
                if (tierChanged) await context.SaveChangesAsync();
            }

            // 4. Semi-annual tier retention / downgrade review (doc §5, §9).
            await ProcessSemiAnnualTierReviewAsync(context, loyaltyTierService, now);
        }
        /// <summary>
        /// Sync Queue.Status and Queue.CurrentStage from the active BookingTask.
        /// Also syncs Booking.Status and creates audit logs when stage transitions occur.
        /// </summary>
        private void SyncQueueFromTask(Queue q, BookingTask task, AutoWashDbContext context, DateTime now)
        {
            q.CurrentStage = task.TaskType;

            // Map TaskType → QueueStatus
            var newQueueStatus = task.TaskType switch
            {
                "CheckIn" => QueueStatus.Waiting,
                "Washing" => QueueStatus.Washing,
                "AddonProcessing" => QueueStatus.Addon_Processing,
                _ => q.Status // Keep current for AutoCapture, AutoSendMail, WaitingCheckout
            };

            if (q.Status != newQueueStatus)
            {
                q.Status = newQueueStatus;
                q.StartedAt ??= now;

                // Sync Booking.Status for key transitions
                if (q.Booking != null && q.BookingId.HasValue)
                {
                    if (newQueueStatus == QueueStatus.Washing && q.Booking.Status != BookingStatus.Washing)
                    {
                        q.Booking.Status = BookingStatus.Washing;
                        q.Booking.WashingAt ??= now;

                        context.BookingAuditLogs.Add(new BookingAuditLog
                        {
                            BookingId = q.BookingId.Value,
                            Action = "WashingStarted",
                            Description = $"Tự động bắt đầu công đoạn: {task.DisplayName}",
                            PerformedBy = "System",
                            CreatedAt = now
                        });
                    }

                    if (newQueueStatus == QueueStatus.Addon_Processing)
                    {
                        context.BookingAuditLogs.Add(new BookingAuditLog
                        {
                            BookingId = q.BookingId.Value,
                            Action = "AddonProcessing",
                            Description = $"Tự động bắt đầu dịch vụ bổ sung: {task.DisplayName}",
                            PerformedBy = "System",
                            CreatedAt = now
                        });
                    }
                }

                _logger.LogInformation("[TASK ADVANCE] QueueId={QueueId}, BookingId={BookingId}, TaskType={TaskType}, DisplayName={DisplayName}",
                    q.QueueId, q.BookingId, task.TaskType, task.DisplayName);
            }
        }

        /// <summary>
        /// All timed tasks completed → move to Completed/WaitingCheckout.
        /// Replaces the old "elapsedSeconds >= TotalDurationSeconds" check.
        /// Preserves all existing notification, email, and realtime push logic.
        /// </summary>
        private async Task FinalizeQueueAsync(Queue q, AutoWashDbContext context, DateTime now, IServiceScope scope)
        {
            q.CurrentStage = "Completed";
            q.CompletedAt ??= now;

            if (q.Booking != null && q.Booking.Status != BookingStatus.WaitingCheckout)
            {
                q.Booking.Status = BookingStatus.WaitingCheckout;

                context.BookingAuditLogs.Add(new BookingAuditLog
                {
                    BookingId = q.BookingId!.Value,
                    Action = "WaitingCheckout",
                    Description = "Tự động chuyển sang trạng thái chờ thanh toán (tất cả công đoạn đã hoàn tất).",
                    PerformedBy = "System",
                    CreatedAt = now
                });

                context.Notifications.Add(new Notification
                {
                    CustomerId = q.Booking.CustomerId,
                    Title = "Xe đã hoàn tất dịch vụ",
                    Message = "Xe đã hoàn tất dịch vụ. Vui lòng đến cửa hàng thanh toán.",
                    Type = "Booking",
                    IsRead = false,
                    CreatedAt = now
                });

                // Notify staff to take photo before sending email to customer
                if (!q.Booking.WaitingCheckoutEmailSent)
                {
                    try
                    {
                        var realtimeNotifier = scope.ServiceProvider.GetRequiredService<IBookingRealtimeNotifier>();
                        await realtimeNotifier.NotifyWashCompletedAsync(new WashCompletedEvent(
                            q.QueueId,
                            q.BookingId,
                            q.LicensePlate ?? "",
                            q.Booking.Customer?.Account?.FullName ?? "Khách hàng"));
                        _logger.LogInformation("[REALTIME] WashCompleted notified to staff: QueueId={QueueId}, BookingId={BookingId}", q.QueueId, q.BookingId);
                    }
                    catch (Exception notifyEx)
                    {
                        _logger.LogError(notifyEx, "Failed to push WashCompleted event for QueueId={QueueId}", q.QueueId);
                    }
                }
            }

            _logger.LogInformation("[AUDIT EVENT] Auto-waiting-checkout: QueueId={QueueId}, BookingId={BookingId}, LicensePlate={LicensePlate}, CompletedAt={CompletedAt}",
                q.QueueId, q.BookingId, q.LicensePlate, q.CompletedAt);
        }

        private async Task AutoGenerateTasksForQueueAsync(int bookingId, AutoWashDbContext context)
        {
            var booking = await context.Bookings
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .FirstOrDefaultAsync(b => b.BookingId == bookingId);

            if (booking == null) return;

            var tasks = new List<BookingTask>();
            int seq = 1;

            tasks.Add(new BookingTask
            {
                BookingId = bookingId,
                TaskType = "CheckIn",
                DisplayName = "Đã check-in",
                SequenceOrder = seq++,
                EstimatedDurationSeconds = BookingWorkflowConfig.CalculateTaskDurationSeconds(2, _configuration),
                Status = BookingTaskStatus.Completed,
                StartedAt = DateTime.Now,
                CompletedAt = DateTime.Now
            });

            var baseService = booking.BookingServices?.FirstOrDefault(bs => bs.Service != null && !bs.Service.IsAddOn);
            if (baseService != null)
            {
                int baseMins = baseService.EstimatedMinutesSnapshot > 0 ? baseService.EstimatedMinutesSnapshot : baseService.Service!.EstimatedMinutes;
                string baseName = !string.IsNullOrWhiteSpace(baseService.ServiceNameSnapshot) ? baseService.ServiceNameSnapshot : baseService.Service!.ServiceName;

                tasks.Add(new BookingTask
                {
                    BookingId = bookingId,
                    BookingServiceId = baseService.BookingServiceId,
                    TaskType = "Washing",
                    DisplayName = $"Đang rửa - {baseName}",
                    SequenceOrder = seq++,
                    EstimatedDurationSeconds = BookingWorkflowConfig.CalculateTaskDurationSeconds(baseMins, _configuration),
                    Status = BookingTaskStatus.InProgress,
                    StartedAt = DateTime.Now
                });
            }

            var addons = booking.BookingServices?
                .Where(bs => bs.Service != null && bs.Service.IsAddOn)
                .OrderBy(bs => bs.BookingServiceId);
            if (addons != null)
            {
                foreach (var addon in addons)
                {
                    int addonMins = addon.EstimatedMinutesSnapshot > 0 ? addon.EstimatedMinutesSnapshot : addon.Service!.EstimatedMinutes;
                    string addonName = !string.IsNullOrWhiteSpace(addon.ServiceNameSnapshot) ? addon.ServiceNameSnapshot : addon.Service!.ServiceName;

                    tasks.Add(new BookingTask
                    {
                        BookingId = bookingId,
                        BookingServiceId = addon.BookingServiceId,
                        TaskType = "AddonProcessing",
                        DisplayName = $"{addonName} (add-on)",
                        SequenceOrder = seq++,
                        EstimatedDurationSeconds = BookingWorkflowConfig.CalculateTaskDurationSeconds(addonMins, _configuration)
                    });
                }
            }

            tasks.Add(new BookingTask
            {
                BookingId = bookingId,
                TaskType = "AutoCapture",
                DisplayName = "Tự động chụp ảnh",
                SequenceOrder = seq++,
                EstimatedDurationSeconds = 0
            });

            tasks.Add(new BookingTask
            {
                BookingId = bookingId,
                TaskType = "AutoSendMail",
                DisplayName = "Tự động gửi mail",
                SequenceOrder = seq++,
                EstimatedDurationSeconds = 0
            });

            tasks.Add(new BookingTask
            {
                BookingId = bookingId,
                TaskType = "WaitingCheckout",
                DisplayName = "Chờ thanh toán",
                SequenceOrder = seq++,
                EstimatedDurationSeconds = 0
            });

            context.BookingTasks.AddRange(tasks);
            await context.SaveChangesAsync();
        }

        /// <summary>
        /// Semi-annual retention review (doc §9). Runs on/after Jan 1 and Jul 1.
        /// Scans customers not yet reviewed for the current half-year period and
        /// demotes any whose previous-period spend is below their tier's MaintainBalance.
        /// LastTierReviewAt makes it idempotent and lets it catch up if the server
        /// was down on review days. Batched to stay light.
        /// </summary>
        private async Task ProcessSemiAnnualTierReviewAsync(AutoWashDbContext context, LoyaltyTierService loyaltyTierService, DateTime now)
        {
            // Only run on Jan 1+ (reviews H2 of previous year) or Jul 1+ (reviews H1 of current year)
            bool isReviewWindow = (now.Month == 1 && now.Day >= 1) || (now.Month == 7 && now.Day >= 1);
            if (!isReviewWindow) return;

            // The current half-year start is the idempotency boundary.
            var halfYearStart = now.Month <= 6
                ? new DateTime(now.Year, 1, 1)
                : new DateTime(now.Year, 7, 1);

            var due = await context.Customers
                .Include(c => c.Account)
                .Where(c => c.LastTierReviewAt == null || c.LastTierReviewAt < halfYearStart)
                .OrderBy(c => c.CustomerId)
                .Take(25)
                .ToListAsync();
            if (due.Count == 0) return;

            int downgrades = 0;
            foreach (var c in due)
            {
                if (await loyaltyTierService.ReviewTierRetentionAsync(c, now))
                    downgrades++;
            }
            await context.SaveChangesAsync();

            _logger.LogInformation("[TIER REVIEW] Reviewed {Count} customer(s); {Downgrades} downgraded.",
                due.Count, downgrades);
        }
    }
}
