using System;
using System.Collections.Generic;
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
        public OwnershipTransferStatus Status { get; set; } = OwnershipTransferStatus.Pending;

        [MaxLength(500)]
        public string? Description { get; set; }

        public DateTime SubmittedAt { get; set; } = DateTime.Now;

        public DateTime? ReviewedAt { get; set; }

        public int? ReviewedBy { get; set; } // AccountId of Admin/Staff

        [MaxLength(500)]
        public string? RejectReason { get; set; }

        // Navigation properties
        [ForeignKey("VehicleId")]
        public virtual Vehicle Vehicle { get; set; } = null!;

        [ForeignKey("CurrentOwnerCustomerId")]
        public virtual Customer CurrentOwner { get; set; } = null!;

        [ForeignKey("RequestedCustomerId")]
        public virtual Customer RequestedCustomer { get; set; } = null!;

        [ForeignKey("ReviewedBy")]
        public virtual Account? ReviewedByAccount { get; set; }

        public virtual ICollection<OwnershipTransferDocument> Documents { get; set; } = new List<OwnershipTransferDocument>();
    }
}
