using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Auto_Wash.Services;
using Auto_Wash.DTOs.Admin;
using Auto_Wash.DTOs.Reward;

namespace Auto_Wash.Controllers
{
    public class AdminController : Controller
    {
        private readonly AdminService _adminService;
        private readonly AuthContextService _authContextService;

        public AdminController(AdminService adminService, AuthContextService authContextService)
        {
            _adminService = adminService;
            _authContextService = authContextService;
        }

        private bool IsAdminOrStaff()
        {
            var role = HttpContext.Session.GetString("UserRole");
            return string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(role, "staff", StringComparison.OrdinalIgnoreCase);
        }

        // ── Dashboard Stats API ───────────────────────────────────────

        [HttpGet]
        public async Task<IActionResult> DashboardStats([FromQuery] DateTime? fromDate = null, [FromQuery] DateTime? toDate = null, [FromQuery] string groupBy = "day")
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var stats = await _adminService.GetDashboardStatsAsync(fromDate, toDate, groupBy);
                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ── Loyalty Config API ────────────────────────────────────────

        [HttpGet]
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

        [HttpPost]
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

        [HttpGet]
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

        [HttpPost]
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

        [HttpGet]
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

        [HttpPost]
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

        [HttpPost]
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

        [HttpPost]
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

        [HttpGet]
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

        [HttpGet]
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

        [HttpPost]
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

        [HttpGet]
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

        [HttpPost]
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

        [HttpPost]
        public async Task<IActionResult> ClaimGift([FromBody] ClaimGiftRequestDto request)
        {
            if (!IsAdminOrStaff()) return Unauthorized();
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ." });
            }

            var staffAccount = await _authContextService.GetCurrentAccountAsync();
            if (staffAccount == null)
            {
                return Unauthorized(new { success = false, message = "Không tìm thấy tài khoản nhân viên." });
            }

            try
            {
                var result = await _adminService.ClaimPhysicalGiftAsync(request.VoucherCode, staffAccount.AccountId, request.StaffNotes);
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

        // ── Voucher & Reward Management API ─────────────────────────────

        [HttpGet]
        public async Task<IActionResult> GetAdminRewards([FromQuery] string? search, [FromQuery] string? type, [FromQuery] string? status)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var rewards = await _adminService.GetAdminRewardsAsync(search, type, status);
                return Ok(new { success = true, rewards });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateReward([FromBody] CreateRewardRequestDto request)
        {
            if (!IsAdminOrStaff()) return Unauthorized();
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ." });
            }

            try
            {
                var result = await _adminService.CreateRewardAsync(request);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }
                return Ok(new { success = true, message = result.message, rewardId = result.rewardId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> UpdateReward([FromQuery] int id, [FromBody] UpdateRewardRequestDto request)
        {
            if (!IsAdminOrStaff()) return Unauthorized();
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ." });
            }

            try
            {
                var result = await _adminService.UpdateRewardAsync(id, request);
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
        public async Task<IActionResult> ToggleRewardStatus([FromQuery] int id)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var success = await _adminService.ToggleRewardStatusAsync(id);
                if (!success) return NotFound(new { success = false, message = "Không tìm thấy phần thưởng." });
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetRewardRedemptions([FromQuery] string? search, [FromQuery] string? status, [FromQuery] string? type)
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var redemptions = await _adminService.GetRewardRedemptionsAsync(search, status, type);
                return Ok(new { success = true, redemptions });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetRewardStats()
        {
            if (!IsAdminOrStaff()) return Unauthorized();

            try
            {
                var stats = await _adminService.GetRewardStatsAsync();
                return Ok(new { success = true, stats });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
