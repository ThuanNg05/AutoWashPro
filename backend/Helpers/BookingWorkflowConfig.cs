using System;
using System.Collections.Generic;
using System.Linq;
using Auto_Wash.Data.Entities;
using Auto_Wash.DTOs;
using Microsoft.Extensions.Configuration;

namespace Auto_Wash.Helpers
{
    public static class BookingWorkflowConfig
    {
        /// <summary>
        /// Single source of truth for task duration calculation.
        /// Scales estimated minutes into seconds based on DemoMode and DemoSecondsPerMinute.
        /// </summary>
        public static int CalculateTaskDurationSeconds(int estimatedMinutes, IConfiguration configuration)
        {
            bool isDemo = configuration.GetValue<bool>("BookingWorkflow:DemoMode", true);
            if (isDemo)
            {
                double demoRatio = configuration.GetValue<double>("BookingWorkflow:DemoSecondsPerMinute", 1.0);
                return Math.Max(1, (int)Math.Round(estimatedMinutes * demoRatio));
            }
            return estimatedMinutes * 60;
        }

        /// <summary>
        /// Centralized calculation of Total Estimated Minutes for a booking.
        /// Sums EstimatedMinutesSnapshot (or Service.EstimatedMinutes) across all services.
        /// </summary>
        public static int CalculateTotalEstimatedMinutes(IEnumerable<BookingService>? bookingServices, IEnumerable<BookingTask>? tasks = null)
        {
            int totalMins = bookingServices?.Sum(bs => bs.EstimatedMinutesSnapshot > 0 ? bs.EstimatedMinutesSnapshot : (bs.Service != null ? bs.Service.EstimatedMinutes : 0)) ?? 0;
            if (totalMins == 0 && tasks != null && tasks.Any())
            {
                totalMins = (int)Math.Ceiling(tasks.Sum(t => t.EstimatedDurationSeconds) / 60.0);
            }
            return totalMins > 0 ? totalMins : 50;
        }

        /// <summary>
        /// Centralized calculation of Required Slots (assumes 1 slot = 60 minutes).
        /// RequiredSlots = Ceiling(TotalEstimatedMinutes / 60)
        /// </summary>
        public static int CalculateRequiredSlots(int totalEstimatedMinutes)
        {
            return Math.Max(1, (int)Math.Ceiling((double)totalEstimatedMinutes / 60.0));
        }

        /// <summary>
        /// Centralized calculation of Remaining Seconds based on active + pending BookingTasks.
        /// </summary>
        public static int CalculateRemainingSeconds(List<BookingTask>? tasks)
        {
            if (tasks == null || tasks.Count == 0) return 0;

            int remaining = 0;
            var activeTask = tasks.FirstOrDefault(t => t.Status == BookingTaskStatus.InProgress);
            if (activeTask != null && activeTask.StartedAt.HasValue && activeTask.EstimatedDurationSeconds > 0)
            {
                var taskRemaining = activeTask.EstimatedDurationSeconds - (int)(DateTime.Now - activeTask.StartedAt.Value).TotalSeconds;
                remaining += Math.Max(0, taskRemaining);
            }
            remaining += tasks.Where(t => t.Status == BookingTaskStatus.Pending).Sum(t => t.EstimatedDurationSeconds);
            return remaining;
        }

        /// <summary>
        /// Main entry point for progress calculation. Fully driven by BookingTask rows.
        /// </summary>
        public static BookingProgressDto GetProgressForBooking(Booking? booking, Queue? queue, List<BookingTask>? tasks = null)
        {
            var dto = new BookingProgressDto();

            if (tasks == null || tasks.Count == 0)
            {
                tasks = GenerateFallbackTasksFromBooking(booking);
            }

            var orderedTasks = tasks.OrderBy(t => t.SequenceOrder).ToList();

            // Terminal / Non-active states
            if (booking != null && booking.CheckedOutAt != null)
            {
                dto.CurrentStage = "Hoàn tất";
                dto.Progress = 100;
                dto.RemainingSeconds = 0;
                BuildDynamicStages(dto, orderedTasks, allCompleted: true);
                return dto;
            }

            if (queue != null && queue.Status == QueueStatus.Archived)
            {
                dto.CurrentStage = "Hoàn tất";
                dto.Progress = 100;
                dto.RemainingSeconds = 0;
                BuildDynamicStages(dto, orderedTasks, allCompleted: true);
                return dto;
            }

            if (booking != null && (booking.Status == BookingStatus.Cancelled || booking.Status == BookingStatus.NoShow))
            {
                dto.CurrentStage = booking.Status == BookingStatus.NoShow ? "Khách không đến" : "Đã hủy";
                dto.Progress = 0;
                dto.RemainingSeconds = 0;
                dto.Stages.Add(new ProgressStageItemDto
                {
                    StageKey = dto.CurrentStage,
                    DisplayName = booking.Status == BookingStatus.NoShow
                        ? "Khách không đến (Không phát sinh quy trình xử lý)"
                        : "Đã hủy lịch hẹn (Không phát sinh quy trình xử lý)",
                    IsCompleted = false,
                    IsActive = true
                });
                return dto;
            }

            // Only treat as fully completed if CheckedOutAt is set OR all tasks in BookingTask are completed
            bool isFullyCompleted = (booking != null && booking.CheckedOutAt.HasValue) ||
                                    (orderedTasks.Count > 0 && orderedTasks.All(t => t.Status == BookingTaskStatus.Completed));

            if (isFullyCompleted)
            {
                dto.CurrentStage = "Hoàn tất";
                dto.Progress = 100;
                dto.RemainingSeconds = 0;
                BuildDynamicStages(dto, orderedTasks, allCompleted: true);
                return dto;
            }

            // Active task evaluation driven strictly by BookingTask
            var activeTask = orderedTasks.FirstOrDefault(t => t.Status == BookingTaskStatus.InProgress);
            int completedCount = orderedTasks.Count(t => t.Status == BookingTaskStatus.Completed);
            int totalTasksCount = Math.Max(1, orderedTasks.Count);

            if (activeTask != null)
            {
                dto.CurrentStage = activeTask.DisplayName;
                double activeFraction = 0.0;
                if (activeTask.EstimatedDurationSeconds > 0 && activeTask.StartedAt.HasValue)
                {
                    var taskElapsed = (DateTime.Now - activeTask.StartedAt.Value).TotalSeconds;
                    activeFraction = Math.Min(1.0, Math.Max(0.0, taskElapsed / activeTask.EstimatedDurationSeconds));
                }
                else if (activeTask.TaskType == "WaitingCheckout")
                {
                    activeFraction = 0.5;
                }
                double baseProgress = ((completedCount + activeFraction) / totalTasksCount) * 100;
                dto.Progress = Math.Min(99, (int)baseProgress);
            }
            else if (completedCount == orderedTasks.Count && orderedTasks.Count > 0)
            {
                dto.CurrentStage = "Hoàn tất";
                dto.Progress = 100;
                dto.RemainingSeconds = 0;
                BuildDynamicStages(dto, orderedTasks, allCompleted: true);
                return dto;
            }
            else
            {
                var nextPending = orderedTasks.FirstOrDefault(t => t.Status == BookingTaskStatus.Pending);
                dto.CurrentStage = nextPending?.DisplayName ?? orderedTasks.FirstOrDefault()?.DisplayName ?? "Đã check-in";
                dto.Progress = (int)(((double)completedCount / totalTasksCount) * 100);
            }

            dto.RemainingSeconds = CalculateRemainingSeconds(orderedTasks);
            BuildDynamicStages(dto, orderedTasks);

            return dto;
        }

        private static List<BookingTask> GenerateFallbackTasksFromBooking(Booking? booking, IConfiguration? configuration = null)
        {
            var list = new List<BookingTask>();
            if (booking == null) return list;

            int seq = 1;
            int checkInSec = configuration != null ? CalculateTaskDurationSeconds(2, configuration) : 2;

            list.Add(new BookingTask
            {
                TaskType = "CheckIn",
                DisplayName = "Đã check-in",
                SequenceOrder = seq++,
                EstimatedDurationSeconds = checkInSec,
                Status = BookingTaskStatus.Completed
            });

            if (booking.BookingServices != null)
            {
                // Base service -> Washing
                var baseService = booking.BookingServices.FirstOrDefault(bs => bs.Service != null && !bs.Service.IsAddOn);
                if (baseService != null)
                {
                    string name = !string.IsNullOrWhiteSpace(baseService.ServiceNameSnapshot) ? baseService.ServiceNameSnapshot : (baseService.Service?.ServiceName ?? "Dịch vụ rửa xe");
                    int mins = baseService.EstimatedMinutesSnapshot > 0 ? baseService.EstimatedMinutesSnapshot : (baseService.Service?.EstimatedMinutes ?? 30);
                    int serviceSec = configuration != null ? CalculateTaskDurationSeconds(mins, configuration) : mins;

                    list.Add(new BookingTask
                    {
                        TaskType = "Washing",
                        DisplayName = $"Đang rửa - {name}",
                        SequenceOrder = seq++,
                        EstimatedDurationSeconds = serviceSec,
                        Status = BookingTaskStatus.InProgress,
                        StartedAt = DateTime.Now
                    });
                }

                // Add-ons -> AddonProcessing
                var addons = booking.BookingServices.Where(bs => bs.Service != null && bs.Service.IsAddOn).OrderBy(bs => bs.BookingServiceId);
                foreach (var bs in addons)
                {
                    string name = !string.IsNullOrWhiteSpace(bs.ServiceNameSnapshot) ? bs.ServiceNameSnapshot : (bs.Service?.ServiceName ?? "Dịch vụ bổ sung");
                    int mins = bs.EstimatedMinutesSnapshot > 0 ? bs.EstimatedMinutesSnapshot : (bs.Service?.EstimatedMinutes ?? 15);
                    int serviceSec = configuration != null ? CalculateTaskDurationSeconds(mins, configuration) : mins;

                    list.Add(new BookingTask
                    {
                        TaskType = "AddonProcessing",
                        DisplayName = $"{name} (add-on)",
                        SequenceOrder = seq++,
                        EstimatedDurationSeconds = serviceSec,
                        Status = BookingTaskStatus.Pending
                    });
                }
            }

            // AutoCapture
            list.Add(new BookingTask
            {
                TaskType = "AutoCapture",
                DisplayName = "Tự động chụp ảnh",
                SequenceOrder = seq++,
                EstimatedDurationSeconds = 0,
                Status = BookingTaskStatus.Pending
            });

            // AutoSendMail
            list.Add(new BookingTask
            {
                TaskType = "AutoSendMail",
                DisplayName = "Tự động gửi mail",
                SequenceOrder = seq++,
                EstimatedDurationSeconds = 0,
                Status = BookingTaskStatus.Pending
            });

            // WaitingCheckout
            list.Add(new BookingTask
            {
                TaskType = "WaitingCheckout",
                DisplayName = "Chờ thanh toán",
                SequenceOrder = seq++,
                EstimatedDurationSeconds = 0,
                Status = BookingTaskStatus.Pending
            });

            return list;
        }

        private static void BuildDynamicStages(BookingProgressDto dto, List<BookingTask> tasks, bool allCompleted = false)
        {
            foreach (var task in tasks)
            {
                dto.Stages.Add(new ProgressStageItemDto
                {
                    StageKey = task.TaskType,
                    DisplayName = task.DisplayName,
                    IsCompleted = allCompleted || task.Status == BookingTaskStatus.Completed,
                    IsActive = !allCompleted && task.Status == BookingTaskStatus.InProgress
                });
            }
        }
    }
}
