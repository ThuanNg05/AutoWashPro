using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("ownershiptransferrequests")]
    public class OwnershipTransferRequest
    {
        [Key]
        public int TransferRequestId { get; set; }

        [Required]
        public int VehicleId { get; set; }

        [Required]
        public int CurrentOwnerCustomerId { get; set; }

        [Required]
        public int RequestedCustomerId { get; set; }

        [Required]
        [MaxLength(500)]
        public string RegistrationImageUrl { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string OcrPlate { get; set; } = string.Empty;

        [Required]
        public OwnershipTransferStatus Status { get; set; } = OwnershipTransferStatus.PendingOwnerConfirmation;

        [Required]
        [MaxLength(20)]
        public string OwnerDecision { get; set; } = "Pending"; // Pending, Approved, Rejected, Timeout

        public DateTime? OwnerConfirmedAt { get; set; }

        public int? ApprovedBy { get; set; } // AccountId of Admin/Staff

        public DateTime? ApprovedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [MaxLength(500)]
        public string? Reason { get; set; }

        // Navigation properties
        [ForeignKey("VehicleId")]
        public virtual Vehicle Vehicle { get; set; } = null!;

        [ForeignKey("CurrentOwnerCustomerId")]
        public virtual Customer CurrentOwner { get; set; } = null!;

        [ForeignKey("RequestedCustomerId")]
        public virtual Customer RequestedCustomer { get; set; } = null!;

        [ForeignKey("ApprovedBy")]
        public virtual Account? ApprovedByAccount { get; set; }
    }
}
