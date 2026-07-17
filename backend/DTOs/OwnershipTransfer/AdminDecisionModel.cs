using System.ComponentModel.DataAnnotations;

namespace Auto_Wash.DTOs.OwnershipTransfer
{
    public class AdminRejectDto
    {
        [Required]
        public string RejectReason { get; set; } = string.Empty;
    }
}
