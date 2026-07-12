namespace Auto_Wash.DTOs.Common
{
    public class SuccessResponse
    {
        public bool Success { get; set; } = true;
    }

    public class MessageResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
