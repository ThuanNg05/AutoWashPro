using System.ComponentModel.DataAnnotations;

namespace Auto_Wash.DTOs.OwnershipTransfer
{
    public class CreateTransferRequestDto
    {
        [Required]
        public string LicensePlate { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }
    }
}
