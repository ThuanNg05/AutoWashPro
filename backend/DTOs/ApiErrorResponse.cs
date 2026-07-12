using System.Collections.Generic;

namespace Auto_Wash.DTOs
{
    public class ApiErrorResponse
    {
        public bool Success { get; set; } = false;
        public string Message { get; set; } = string.Empty;
        public string? ErrorCode { get; set; }
        public List<string>? ValidationErrors { get; set; }
    }
}
