using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("vehicleownershiphistory")]
    public class VehicleOwnershipHistory
    {
        [Key]
        public int HistoryId { get; set; }

        [Required]
        public int VehicleId { get; set; }

        [Required]
        public int CustomerId { get; set; }

        [Required]
        public DateTime FromDate { get; set; }

        public DateTime? ToDate { get; set; }

        public int? TransferRequestId { get; set; }

        [Required]
        [MaxLength(30)]
        public string TransferType { get; set; } = string.Empty; // InitialRegistration, OwnershipTransfer

        // New fields for ownership transfer tracking
        public int? OldOwnerId { get; set; }

        public int? NewOwnerId { get; set; }

        public int? ApprovedBy { get; set; } // AccountId

        public DateTime? ApprovedAt { get; set; }

        // Navigation properties
        [ForeignKey("VehicleId")]
        public virtual Vehicle Vehicle { get; set; } = null!;

        [ForeignKey("CustomerId")]
        public virtual Customer Customer { get; set; } = null!;

        [ForeignKey("TransferRequestId")]
        public virtual OwnershipTransferRequest? TransferRequest { get; set; }

        [ForeignKey("OldOwnerId")]
        public virtual Customer? OldOwner { get; set; }

        [ForeignKey("NewOwnerId")]
        public virtual Customer? NewOwner { get; set; }
    }
}
