using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Auto_Wash.Services;
using Auto_Wash.DTOs.Booking;

namespace Auto_Wash.Controllers
{
    public class AdminBookingController : Controller
    {
        private readonly AdminBookingService _adminBookingService;

        public AdminBookingController(AdminBookingService adminBookingService)
        {
            _adminBookingService = adminBookingService;
        }

        private bool IsAdminOrStaff()
        {
            var role = HttpContext.Session.GetString("UserRole");
            return string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(role, "staff", StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Lấy toàn bộ danh sách lịch đặt xe trên hệ thống (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <response code="200">Lấy danh sách thành công.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpGet]
        [Route("api/admin/bookings")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetBookings()
        {
            if (!IsAdminOrStaff()) return Unauthorized(new { success = false, message = "Bạn không có quyền thực hiện hành động này!" });

            try
            {
                var bookings = await _adminBookingService.GetAdminBookingsAsync();
                return Ok(new { success = true, bookings });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy thông tin chi tiết một lịch đặt xe cụ thể (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <param name="id">ID lịch đặt cần xem.</param>
        /// <response code="200">Lấy thông tin chi tiết thành công.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        /// <response code="404">Không tìm thấy lịch đặt.</response>
        [HttpGet]
        [Route("api/admin/bookings/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetBookingDetail(int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized(new { success = false, message = "Bạn không có quyền thực hiện hành động này!" });

            try
            {
                var booking = await _adminBookingService.GetBookingDetailAsync(id);
                if (booking == null)
                {
                    return NotFound(new { success = false, message = "Không tìm thấy đơn đặt lịch này!" });
                }
                return Ok(new { success = true, booking });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Phê duyệt xác nhận lịch đặt xe (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <param name="id">ID lịch đặt cần xác nhận.</param>
        /// <response code="200">Xác nhận lịch đặt thành công.</response>
        /// <response code="400">Lịch đặt không khả dụng để xác nhận.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpPut]
        [Route("api/admin/bookings/{id}/confirm")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> ConfirmBooking(int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized(new { success = false, message = "Bạn không có quyền thực hiện hành động này!" });

            try
            {
                var result = await _adminBookingService.ConfirmBookingAsync(id);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }
                return Ok(new { success = true, message = result.message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Hủy lịch đặt xe từ phía quản trị viên (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <param name="id">ID lịch đặt cần hủy.</param>
        /// <param name="request">Lý do hủy lịch.</param>
        /// <response code="200">Hủy lịch đặt thành công.</response>
        /// <response code="400">Thiếu lý do hoặc trạng thái lịch không cho phép hủy.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpPut]
        [Route("api/admin/bookings/{id}/cancel")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> CancelBooking(int id, [FromBody] CancelBookingDto request)
        {
            if (!IsAdminOrStaff()) return Unauthorized(new { success = false, message = "Bạn không có quyền thực hiện hành động này!" });
            Console.WriteLine($"[CANCEL BOOKING] BookingId={id}");

            if (request == null)
            {
                Console.WriteLine("[CANCEL BOOKING] Request NULL");
                return BadRequest(new
                {
                    success = false,
                    message = "Không nhận được dữ liệu hủy lịch."
                });
            }

            Console.WriteLine($"[CANCEL BOOKING] Reason={request.Reason}");

            if (string.IsNullOrWhiteSpace(request.Reason))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Lý do hủy là bắt buộc."
                });
            }

            try
            {
                var result = await _adminBookingService.CancelBookingAsync(id, request.Reason);

                if (!result.success)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = result.message
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = result.message
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CANCEL BOOKING ERROR] {ex}");
                return StatusCode(500, new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        /// <summary>
        /// Check-in xe đã đến tiệm và chuyển thông tin vào hàng đợi (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <param name="id">ID lịch đặt cần check-in.</param>
        /// <response code="200">Check-in thành công.</response>
        /// <response code="400">Đơn hàng chưa thanh toán hoặc trạng thái không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpPut]
        [Route("api/admin/bookings/{id}/checkin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> CheckInBooking(int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized(new { success = false, message = "Bạn không có quyền thực hiện hành động này!" });

            try
            {
                var result = await _adminBookingService.CheckInBookingAsync(id);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }
                return Ok(new { success = true, message = result.message, queueId = result.queueId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Dời lịch hẹn cho khách hàng từ phía quản trị viên (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <param name="id">ID lịch đặt cần dời.</param>
        /// <param name="request">Ngày giờ dời lịch mới và lý do.</param>
        /// <response code="200">Dời lịch thành công.</response>
        /// <response code="400">Khung giờ mới bị trùng hoặc dữ liệu đổi lịch bị thiếu.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpPut]
        [Route("api/admin/bookings/{id}/reschedule")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> RescheduleBooking(int id, [FromBody] RescheduleBookingDto request)
        {
            if (!IsAdminOrStaff()) return Unauthorized(new { success = false, message = "Bạn không có quyền thực hiện hành động này!" });

            if (request == null)
            {
                return BadRequest(new { success = false, message = "Không nhận được dữ liệu đổi lịch." });
            }

            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                    .SelectMany(x => x.Errors)
                    .Select(x => x.ErrorMessage));
                return BadRequest(new { success = false, message = $"Dữ liệu không hợp lệ: {errors}" });
            }

            if (!DateTime.TryParse(request.ScheduledAt, out DateTime newScheduledAt))
            {
                return BadRequest(new { success = false, message = "Thời gian hẹn mới không đúng định dạng." });
            }

            try
            {
                var result = await _adminBookingService.RescheduleBookingAsync(id, newScheduledAt, request.Reason);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }
                return Ok(new { success = true, message = result.message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
