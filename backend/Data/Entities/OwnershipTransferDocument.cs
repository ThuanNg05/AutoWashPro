using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("ownershiptransferdocuments")]
    public class OwnershipTransferDocument
    {
        [Key]
        public int DocumentId { get; set; }

        [Required]
        public int TransferRequestId { get; set; }

        [Required]
        [MaxLength(255)]
        public string FileName { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string StoredFileName { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string FilePath { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string ContentType { get; set; } = string.Empty;

        public long FileSize { get; set; }

        public DateTime UploadedAt { get; set; } = DateTime.Now;

        // Navigation properties
        [ForeignKey("TransferRequestId")]
        public virtual OwnershipTransferRequest TransferRequest { get; set; } = null!;
    }
}
