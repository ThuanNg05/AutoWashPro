using System;
using System.Collections.Generic;
using System.Linq;
using Auto_Wash.Data.Entities;
using Auto_Wash.DTOs;

namespace Auto_Wash.Helpers
{
    public static class BookingWorkflowConfig
    {
        public const int CheckInSeconds = 15;
        public const int DryingSeconds = 15;

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

            if (booking != null && booking.Status == BookingStatus.WaitingCheckout)
            {
                dto.CurrentStage = "Chờ thanh toán";
                dto.Progress = 95;
                dto.RemainingSeconds = 0;
                BuildDynamicStages(dto, orderedTasks);
                return dto;
            }

            if (booking != null && booking.Status == BookingStatus.Completed)
            {
                dto.CurrentStage = "Hoàn tất";
                dto.Progress = 100;
                dto.RemainingSeconds = 0;
                BuildDynamicStages(dto, orderedTasks, allCompleted: true);
                return dto;
            }

            if (queue != null && queue.Status == QueueStatus.Completed)
            {
                dto.CurrentStage = "Hoàn tất";
                dto.Progress = 100;
                dto.RemainingSeconds = 0;
                BuildDynamicStages(dto, orderedTasks, allCompleted: true);
                return dto;
            }

            // Active task evaluation
            var activeTask = orderedTasks.FirstOrDefault(t => t.Status == BookingTaskStatus.InProgress);
            var timedTasks = orderedTasks.Where(t => t.EstimatedDurationSeconds > 0).ToList();
            var timedCompleted = timedTasks.Count(t => t.Status == BookingTaskStatus.Completed);

            if (activeTask != null)
            {
                dto.CurrentStage = activeTask.DisplayName;

                if (timedTasks.Count > 0)
                {
                    double baseProgress = (double)timedCompleted / timedTasks.Count * 100;
                    if (activeTask.EstimatedDurationSeconds > 0 && activeTask.StartedAt.HasValue)
                    {
                        var taskElapsed = (DateTime.Now - activeTask.StartedAt.Value).TotalSeconds;
                        var taskFraction = Math.Min(1.0, taskElapsed / activeTask.EstimatedDurationSeconds);
                        baseProgress += taskFraction / timedTasks.Count * 100;
                    }
                    dto.Progress = Math.Min(95, (int)baseProgress);
                }
                else
                {
                    dto.Progress = (int)((double)orderedTasks.Count(t => t.Status == BookingTaskStatus.Completed) / orderedTasks.Count * 100);
                }
            }
            else
            {
                dto.CurrentStage = orderedTasks.FirstOrDefault()?.DisplayName ?? "Đã check-in";
                dto.Progress = 0;
            }

            dto.RemainingSeconds = CalculateRemainingSeconds(orderedTasks);
            BuildDynamicStages(dto, orderedTasks);

            if (queue == null && booking != null && booking.Status != BookingStatus.CheckedIn
                && booking.Status != BookingStatus.Completed && booking.Status != BookingStatus.Washing)
            {
                dto.Progress = 0;
                foreach (var stage in dto.Stages)
                {
                    stage.IsActive = false;
                }
            }

            return dto;
        }

        private static List<BookingTask> GenerateFallbackTasksFromBooking(Booking? booking)
        {
            var list = new List<BookingTask>();
            if (booking == null) return list;

            int seq = 1;
            list.Add(new BookingTask
            {
                TaskType = "CheckIn",
                DisplayName = "Đã check-in",
                SequenceOrder = seq++,
                EstimatedDurationSeconds = 15,
                Status = BookingTaskStatus.Completed
            });

            if (booking.BookingServices != null)
            {
                foreach (var bs in booking.BookingServices)
                {
                    string name = !string.IsNullOrWhiteSpace(bs.ServiceNameSnapshot) ? bs.ServiceNameSnapshot : (bs.Service?.ServiceName ?? "Dịch vụ");
                    int mins = bs.EstimatedMinutesSnapshot > 0 ? bs.EstimatedMinutesSnapshot : (bs.Service?.EstimatedMinutes ?? 30);
                    bool isAddOn = bs.Service?.IsAddOn ?? false;
                    list.Add(new BookingTask
                    {
                        TaskType = isAddOn ? "AddonProcessing" : "Washing",
                        DisplayName = isAddOn ? $"{name} (add-on)" : $"Đang rửa - {name}",
                        SequenceOrder = seq++,
                        EstimatedDurationSeconds = mins * 60,
                        Status = BookingTaskStatus.Pending
                    });
                }
            }

            list.Add(new BookingTask
            {
                TaskType = "Drying",
                DisplayName = "Đã sấy khô",
                SequenceOrder = seq++,
                EstimatedDurationSeconds = 15,
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
