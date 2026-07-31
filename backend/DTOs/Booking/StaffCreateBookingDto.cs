using System.Collections.Generic;

namespace Auto_Wash.DTOs.Booking
{
    /// <summary>
    /// Payload khi staff đặt lịch hộ một khách hàng cụ thể (trang Rebook).
    /// Khác CreateBookingDto ở chỗ mang theo CustomerId thay vì lấy từ session.
    /// </summary>
    public class StaffCreateBookingDto
    {
        public int CustomerId { get; set; }
        public string LicensePlate { get; set; } = string.Empty;
        public string MainServiceName { get; set; } = string.Empty;
        public List<string>? AddOnServiceNames { get; set; } = new();
        public string BookingDate { get; set; } = string.Empty;
        public string BookingTime { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }
}
