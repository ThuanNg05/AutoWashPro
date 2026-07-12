namespace Auto_Wash.DTOs.OwnershipTransfer
{
    public class VerifyImageOcrRequest
    {
        public string LicensePlate { get; set; } = string.Empty;
        public string RegistrationImageUrl { get; set; } = string.Empty;
    }
}
