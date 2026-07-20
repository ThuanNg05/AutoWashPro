using System.ComponentModel.DataAnnotations;

namespace Auto_Wash.DTOs.Admin
{
    public class ClaimGiftRequestDto
    {
        [Required]
        public string VoucherCode { get; set; } = string.Empty;
        public string? StaffNotes { get; set; }
    }
}
