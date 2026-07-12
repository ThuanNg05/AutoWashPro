namespace Auto_Wash.DTOs.OwnershipTransfer
{
    public class RegisterOcrRequest
    {
        public string LicensePlate { get; set; } = string.Empty;
        public string Brand { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public string VehicleClass { get; set; } = string.Empty;
        public string RegistrationImageUrl { get; set; } = string.Empty;
        public string OtpCode { get; set; } = string.Empty;
    }
}
