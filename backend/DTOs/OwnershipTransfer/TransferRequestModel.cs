namespace Auto_Wash.DTOs.OwnershipTransfer
{
    public class TransferRequestModel
    {
        public string LicensePlate { get; set; } = string.Empty;
        public string RegistrationImageUrl { get; set; } = string.Empty;
        public string? Reason { get; set; }
        public string OtpCode { get; set; } = string.Empty;
    }
}
