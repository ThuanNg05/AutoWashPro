using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auto_Wash.Data.Entities
{
    [Table("tier_change_logs")]
    public class TierChangeLog
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int LogId { get; set; }

        [Required]
        [ForeignKey("Customer")]
        public int CustomerId { get; set; }

        [ForeignKey("FromTier")]
        public int? FromTierId { get; set; }

        [Required]
        [ForeignKey("ToTier")]
        public int ToTierId { get; set; }

        [MaxLength(20)]
        public string ChangeType { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Reason { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // Navigation properties
        public virtual Customer Customer { get; set; } = null!;
        public virtual Tier? FromTier { get; set; }
        public virtual Tier ToTier { get; set; } = null!;
    }
}
