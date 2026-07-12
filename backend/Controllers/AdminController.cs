using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Auto_Wash.Services;
using Auto_Wash.DTOs.Admin;

namespace Auto_Wash.Controllers
{
    public class AdminController : Controller
    {
        private readonly AdminService _adminService;

        public AdminController(AdminService adminService)
        {
            _adminService = adminService;
        }

        private bool IsAdminOrStaff()
        {
            var role = HttpContext.Session.GetString("UserRole");
            return string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(role, "staff", StringComparison.OrdinalIgnoreCase);
        }

        // ── Dashboard Stats API ───────────────────────────────────────

        /// <summary>
        /// Lấy thống kê tổng hợp số liệu cho màn hình Dashboard quản trị (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <response code="200">Lấy thống kê thành công.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpGet]
        [Route("Admin/DashboardStats")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> DashboardStats()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var stats = await _adminService.GetDashboardStatsAsync();
                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ── Loyalty Config API ────────────────────────────────────────

        /// <summary>
        /// Lấy cấu hình các hạng thành viên và quy tắc tích lũy điểm Loyalty (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <response code="200">Lấy cấu hình thành công.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpGet]
        [Route("Admin/GetLoyaltyConfig")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetLoyaltyConfig()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var config = await _adminService.GetLoyaltyConfigAsync();
                return Ok(config);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Cập nhật cấu hình hạng thành viên và quy tắc tích lũy điểm (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <param name="request">Bảng cấu hình các hạng thành viên mới.</param>
        /// <response code="200">Lưu cấu hình thành công.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpPost]
        [Route("Admin/SaveLoyaltyConfig")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> SaveLoyaltyConfig([FromBody] SaveLoyaltyConfigRequestDto request)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var accountId = HttpContext.Session.GetInt32("AccountId");
                await _adminService.SaveLoyaltyConfigAsync(request, accountId);
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ── Monthly Tier Review API ───────────────────────────────────

        /// <summary>
        /// Lấy danh sách các tài khoản khách hàng chuẩn bị nâng/hạ hạng thành viên trong đợt review tháng (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <response code="200">Lấy danh sách review thành công.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpGet]
        [Route("Admin/TierReview")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> TierReview()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var reviews = await _adminService.GetTierReviewAsync();
                return Ok(reviews);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ── Run Tier Review (Apply) API ───────────────────────────────

        /// <summary>
        /// Chạy quy trình xét duyệt nâng/hạ hạng thành viên tự động và áp dụng đổi hạng (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <response code="200">Xét duyệt và nâng hạng thành công.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpPost]
        [Route("Admin/RunTierReview")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> RunTierReview()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var result = await _adminService.RunTierReviewAsync();
                return Ok(new { success = true, upgrades = result.upgrades, downgrades = result.downgrades });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ── Service Management API ─────────────────────────────────────

        /// <summary>
        /// Lấy toàn bộ danh sách dịch vụ (cả hoạt động và tạm dừng) của tiệm (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <response code="200">Lấy danh sách thành công.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpGet]
        [Route("Admin/GetServices")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetServices()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var services = await _adminService.GetAdminServicesAsync();
                return Ok(new { success = true, services });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Thêm mới hoặc cập nhật thông tin dịch vụ rửa xe (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <param name="request">Thông tin dịch vụ cần lưu.</param>
        /// <response code="200">Lưu dịch vụ thành công.</response>
        /// <response code="400">Dữ liệu dịch vụ không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpPost]
        [Route("Admin/SaveService")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> SaveService([FromBody] SaveServiceRequestDto request)
        {
            if (!IsAdminOrStaff()) return Unauthorized();
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ." });
            }

            try
            {
                await _adminService.SaveServiceAsync(request);
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Bật/Tắt hoạt động của một dịch vụ rửa xe (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <param name="id">ID dịch vụ cần Toggle.</param>
        /// <response code="200">Thay đổi trạng thái thành công.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        /// <response code="404">Không tìm thấy dịch vụ tương ứng.</response>
        [HttpPost]
        [Route("Admin/ToggleService")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ToggleService([FromQuery] int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var success = await _adminService.ToggleServiceStatusAsync(id);
                if (!success) return NotFound(new { success = false, message = "Không tìm thấy dịch vụ." });
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Xóa dịch vụ rửa xe khỏi hệ thống (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <param name="id">ID dịch vụ cần xóa.</param>
        /// <response code="200">Xóa dịch vụ thành công.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        /// <response code="404">Không tìm thấy dịch vụ tương ứng.</response>
        [HttpPost]
        [Route("Admin/DeleteService")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteService([FromQuery] int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var success = await _adminService.DeleteServiceAsync(id);
                if (!success) return NotFound(new { success = false, message = "Không tìm thấy dịch vụ." });
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ── Customer Management API ────────────────────────────────────

        /// <summary>
        /// Tìm kiếm và lấy danh sách khách hàng (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <param name="search">Tên hoặc số điện thoại cần tìm kiếm.</param>
        /// <response code="200">Lấy danh sách thành công.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpGet]
        [Route("Admin/GetCustomers")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetCustomers([FromQuery] string? search)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var customers = await _adminService.GetCustomersAsync(search);
                return Ok(new { success = true, customers });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy thông tin chi tiết một khách hàng bao gồm xe, điểm tích lũy (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <param name="id">ID khách hàng.</param>
        /// <response code="200">Lấy chi tiết thành công.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        /// <response code="404">Không tìm thấy khách hàng.</response>
        [HttpGet]
        [Route("Admin/GetCustomerDetail")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetCustomerDetail([FromQuery] int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var detail = await _adminService.GetCustomerDetailAsync(id);
                if (detail == null) return NotFound(new { success = false, message = "Không tìm thấy khách hàng." });
                return Ok(new { success = true, customer = detail });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Cộng/Trừ điểm tích lũy thủ công cho khách hàng (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <param name="request">ID khách hàng, số điểm thay đổi và lý do điều chỉnh.</param>
        /// <response code="200">Điều chỉnh điểm thành công.</response>
        /// <response code="400">Dữ liệu điều chỉnh điểm không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        /// <response code="404">Không tìm thấy khách hàng.</response>
        [HttpPost]
        [Route("Admin/AdjustCustomerPoints")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> AdjustCustomerPoints([FromBody] AdjustPointsRequestDto request)
        {
            if (!IsAdminOrStaff()) return Unauthorized();
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ." });
            }

            try
            {
                var staffAccountId = HttpContext.Session.GetInt32("AccountId");
                var success = await _adminService.AdjustCustomerPointsAsync(request.CustomerId, request.PointsChange, request.Reason, staffAccountId);
                if (!success) return NotFound(new { success = false, message = "Không tìm thấy khách hàng." });
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách voucher khuyến mại có thể cấp phát trực tiếp cho khách hàng (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <response code="200">Lấy danh sách voucher thành công.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpGet]
        [Route("Admin/GetAvailableVouchers")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetAvailableVouchers()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var vouchers = await _adminService.GetAvailableVouchersAsync();
                return Ok(new { success = true, vouchers });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Cấp phát thủ công một voucher cho khách hàng (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <param name="request">ID khách hàng và ID quà tặng/voucher muốn tặng.</param>
        /// <response code="200">Cấp phát voucher thành công.</response>
        /// <response code="400">Dữ liệu cấp phát không hợp lệ.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        /// <response code="404">Không tìm thấy khách hàng hoặc voucher.</response>
        [HttpPost]
        [Route("Admin/AssignVoucher")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> AssignVoucher([FromBody] AssignVoucherRequestDto request)
        {
            if (!IsAdminOrStaff()) return Unauthorized();
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ." });
            }

            try
            {
                var success = await _adminService.AssignVoucherAsync(request.CustomerId, request.RewardId);
                if (!success) return NotFound(new { success = false, message = "Không tìm thấy khách hàng hoặc voucher." });
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
