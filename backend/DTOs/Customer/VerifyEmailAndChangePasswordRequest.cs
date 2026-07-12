namespace Auto_Wash.DTOs.Customer
{
    public class VerifyEmailAndChangePasswordRequest
    {
        public string Email { get; set; } = string.Empty;
        public string OtpCode { get; set; } = string.Empty;
        public string? CurrentPassword { get; set; }
        public string NewPassword { get; set; } = string.Empty;
    }
}
