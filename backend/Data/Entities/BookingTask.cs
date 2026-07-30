using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("booking_tasks")]
    public class BookingTask
    {
        [Key]
        public int BookingTaskId { get; set; }

        [Required]
        public int BookingId { get; set; }

        public int? BookingServiceId { get; set; }

        [Required]
        [MaxLength(50)]
        public string TaskType { get; set; } = string.Empty;

        [MaxLength(150)]
        public string DisplayName { get; set; } = string.Empty;

        public int SequenceOrder { get; set; }

        public int EstimatedDurationSeconds { get; set; }

        public BookingTaskStatus Status { get; set; } = BookingTaskStatus.Pending;

        public DateTime? StartedAt { get; set; }

        public DateTime? CompletedAt { get; set; }

        // Navigation properties
        [ForeignKey("BookingId")]
        public virtual Booking Booking { get; set; } = null!;

        [ForeignKey("BookingServiceId")]
        public virtual BookingService? BookingService { get; set; }
    }
}
