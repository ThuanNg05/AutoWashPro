using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Auto_Wash.Services;
using Auto_Wash.DTOs.AdminQueue;
using Auto_Wash.Helpers;

namespace Auto_Wash.Controllers
{
    public class AdminQueueController : Controller
    {
        private readonly AdminQueueService _adminQueueService;

        public AdminQueueController(AdminQueueService adminQueueService)
        {
            _adminQueueService = adminQueueService;
        }

        private bool IsAdminOrStaff()
        {
            var role = HttpContext.Session.GetString("UserRole");
            return string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(role, "staff", StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Lấy danh sách hàng đợi các xe đang chờ rửa hôm nay (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <response code="200">Lấy danh sách hàng đợi thành công.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpGet]
        [Route("Admin/GetQueue")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetQueue()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var queue = await _adminQueueService.GetTodayQueueAsync();
                return Ok(queue);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Tiến hàng đợi cho một xe (chuyển sang bước tiếp theo: Chờ rửa -> Đang rửa -> Đang sấy -> Hoàn thành) (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <param name="id">ID hàng đợi.</param>
        /// <response code="200">Chuyển trạng thái hàng đợi thành công.</response>
        /// <response code="400">Yêu cầu chuyển trạng thái không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpPost]
        [Route("Admin/AdvanceQueue")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> AdvanceQueue(int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var result = await _adminQueueService.AdvanceQueueAsync(id);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }
                return Ok(new { success = true, newStatus = result.newStatus });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Cập nhật thông tin chi tiết trạng thái hàng đợi hoặc ghi chú nhân viên (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <param name="id">ID hàng đợi.</param>
        /// <param name="request">Thông tin cập nhật (Trạng thái và ghi chú).</param>
        /// <response code="200">Cập nhật thành công.</response>
        /// <response code="400">Yêu cầu cập nhật không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpPost]
        [Route("Admin/UpdateQueue")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> UpdateQueue(int id, [FromBody] UpdateQueueRequestDto request)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            if (request == null)
            {
                return BadRequest(new { success = false, message = "Dữ liệu yêu cầu không hợp lệ!" });
            }

            try
            {
                var result = await _adminQueueService.UpdateQueueAsync(id, request.Status, request.StaffNote);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }
                return Ok(new { success = true, queueId = result.queueId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Thực hiện thủ tục checkout thanh toán và hoàn tất rửa xe cho xe trong hàng đợi (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <param name="id">ID hàng đợi cần checkout.</param>
        /// <response code="200">Checkout và tính toán hóa đơn thành công.</response>
        /// <response code="400">Yêu cầu thanh toán không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpPost]
        [Route("Admin/CheckoutQueue")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> CheckoutQueue(int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var performer = HttpContext.Session.GetString("UserName") ?? "Staff";
                var result = await _adminQueueService.CheckoutQueueAsync(id, performer);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }
                return Ok(new { success = true, finalPrice = result.finalPrice, pointsEarned = result.pointsEarned });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Hủy hàng đợi cho một xe (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <param name="id">ID hàng đợi cần hủy.</param>
        /// <response code="200">Hủy hàng đợi thành công.</response>
        /// <response code="400">Không thể hủy do trạng thái không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpPost]
        [Route("Admin/SendCompletionPhotos")]
        [RequestSizeLimit(30_000_000)] // 5 ảnh x 5MB + overhead multipart
        public async Task<IActionResult> SendCompletionPhotos(int id, [FromForm] IFormFileCollection photos)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var performer = HttpContext.Session.GetString("UserName") ?? "Staff";
                var result = await _adminQueueService.SendCompletionPhotosAsync(id, photos, performer);
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

        [HttpPost]
        [Route("Admin/CancelQueue")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> CancelQueue(int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var result = await _adminQueueService.CancelQueueAsync(id);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Thêm khách hàng vãng lai (không đặt lịch trước) trực tiếp vào hàng đợi (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <param name="request">Biển số xe và tên khách hàng vãng lai.</param>
        /// <response code="200">Thêm xe vãng lai thành công.</response>
        /// <response code="400">Biển số không hợp lệ hoặc xe đang có lịch chưa hoàn tất.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpPost]
        [Route("Admin/AddWalkIn")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> AddWalkIn([FromBody] WalkInRequestDto request)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            if (request == null)
            {
                return BadRequest(new { success = false, message = "Dữ liệu yêu cầu không hợp lệ!" });
            }

            if (!LicensePlateHelper.IsValidVietnameseLicensePlate(request.LicensePlate))
            {
                return BadRequest(new { success = false, message = "Biển số xe không hợp lệ hoặc đầu số tỉnh thành không tồn tại!" });
            }

            try
            {
                var result = await _adminQueueService.AddWalkInAsync(request.LicensePlate, request.CustomerName);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }
                return Ok(new {
                    success = true,
                    queueId = result.queueId,
                    customerName = result.customerName,
                    tierName = result.tierName,
                    hasBooking = result.hasBooking,
                    bookingServices = result.bookingServices
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Route("Admin/ClearQueueToday")]
        public async Task<IActionResult> ClearQueueToday()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var today = DateTime.Today;
                var context = (Auto_Wash.Data.AutoWashDbContext)HttpContext.RequestServices.GetService(typeof(Auto_Wash.Data.AutoWashDbContext))!;
                var todayQueues = context.Queues.Where(q => q.CheckInAt.Date == today);
                context.Queues.RemoveRange(todayQueues);
                await context.SaveChangesAsync();

                return Ok(new { success = true, message = "Đã dọn dẹp sạch sẽ hàng đợi hôm nay thành công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
