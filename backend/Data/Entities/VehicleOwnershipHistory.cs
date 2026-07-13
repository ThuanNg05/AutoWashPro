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

        // Navigation properties
        [ForeignKey("VehicleId")]
        public virtual Vehicle Vehicle { get; set; } = null!;

        [ForeignKey("CustomerId")]
        public virtual Customer Customer { get; set; } = null!;

        [ForeignKey("TransferRequestId")]
        public virtual OwnershipTransferRequest? TransferRequest { get; set; }
    }
}
