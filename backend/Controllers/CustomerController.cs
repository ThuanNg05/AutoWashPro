using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Auto_Wash.Services;
using Auto_Wash.Helpers;
using Auto_Wash.DTOs.Customer;
using Auto_Wash.DTOs.Common;

namespace Auto_Wash.Controllers
{
    /// <summary>
    /// API Quản lý thông tin hồ sơ, ưu đãi và thông báo của khách hàng.
    /// </summary>
    [ApiController]
    [Route("api/v1/customer")]
    public class CustomerController : ControllerBase
    {
        private readonly CustomerService _customerService;
        private readonly AuthContextService _authContextService;
        private readonly OtpService _otpService;

        public CustomerController(CustomerService customerService, 
                                  AuthContextService authContextService, 
                                  OtpService otpService)
        {
            _customerService = customerService;
            _authContextService = authContextService;
            _otpService = otpService;
        }

        /// <summary>
        /// Cập nhật thông tin hồ sơ của khách hàng (Họ tên, số điện thoại).
        /// </summary>
        /// <param name="request">Thông tin hồ sơ cần cập nhật.</param>
        /// <response code="200">Cập nhật hồ sơ thành công.</response>
        /// <response code="400">Dữ liệu đầu vào không hợp lệ hoặc sai số điện thoại.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        /// <response code="404">Không tìm thấy tài khoản tương ứng.</response>
        [HttpPatch("profile")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var account = await _authContextService.GetCurrentAccountAsync();
            if (account == null)
            {
                return Unauthorized(new MessageResponse { Success = false, Message = "Bạn chưa đăng nhập!" });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.FullName))
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Thông tin không hợp lệ!" });
            }

            if (!string.IsNullOrWhiteSpace(request.Phone) && !PhoneHelper.IsValidVietnamesePhone(request.Phone))
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Số điện thoại không đúng định dạng Việt Nam (ví dụ: 0912345678)!" });
            }

            bool success = await _customerService.UpdateProfileAsync(account.AccountId, request.FullName, request.Phone);
            if (!success)
            {
                return NotFound(new MessageResponse { Success = false, Message = "Không tìm thấy tài khoản!" });
            }

            return Ok(new MessageResponse { Success = true, Message = "Cập nhật hồ sơ thành công!" });
        }

        /// <summary>
        /// Gửi mã OTP khôi phục mật khẩu đến email khách hàng.
        /// </summary>
        /// <param name="request">Email cần nhận mã OTP.</param>
        /// <response code="200">Gửi OTP thành công.</response>
        /// <response code="400">Email không hợp lệ hoặc thiếu thông tin.</response>
        [HttpPost("send-email-otp")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> SendEmailOtp([FromBody] SendEmailOtpRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Email không hợp lệ!" });
            }

            string code = await _otpService.GenerateAndSaveOtpAsync(request.Email, "ForgotPassword");

            string subject = "AutoWash OTP Verification";
            string body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);'>
                    <div style='text-align: center; margin-bottom: 25px;'>
                        <h2 style='color: #0f172a; margin: 0; font-size: 1.5rem; font-weight: 700;'>AutoWash <span style='color: #06b6d4;'>Pro</span></h2>
                        <p style='color: #64748b; font-size: 0.85rem; margin: 5px 0 0 0;'>Smart Car Wash Solutions</p>
                    </div>
                    <div style='border-top: 1px solid #f1f5f9; padding-top: 25px; text-align: center;'>
                        <p style='color: #334155; font-size: 1rem; margin-bottom: 20px;'>Your OTP code is: <strong style='color: #06b6d4; font-size: 1.15rem;'>{code}</strong>. This code expires in 5 minutes.</p>
                        <div style='background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 15px; display: inline-block; font-size: 1.75rem; font-weight: 700; letter-spacing: 6px; color: #0f172a; margin-bottom: 20px;'>
                            {code}
                        </div>
                    </div>
                    <div style='border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; margin-top: 25px;'>
                        <p style='font-size: 0.75rem; color: #94a3b8; margin: 0;'>This is an automated verification email. Please do not reply.</p>
                    </div>
                </div>";

            await _otpService.SendEmailOtpAsync(request.Email.Trim(), subject, body);

            return Ok(new MessageResponse { Success = true, Message = $"Mã OTP đã được gửi đến email {request.Email}!" });
        }

        /// <summary>
        /// Xác thực mã OTP và tiến hành thay đổi mật khẩu mới.
        /// </summary>
        /// <param name="request">Thông tin email, mã OTP, mật khẩu cũ (nếu có), và mật khẩu mới.</param>
        /// <response code="200">Thay đổi mật khẩu thành công.</response>
        /// <response code="400">Mã OTP không hợp lệ, hết hạn hoặc thông tin không hợp lệ.</response>
        [HttpPost("verify-email-change-password")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> VerifyEmailAndChangePassword([FromBody] VerifyEmailAndChangePasswordRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.OtpCode) || string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Dữ liệu không hợp lệ!" });
            }

            var result = await _customerService.VerifyEmailAndChangePasswordAsync(request.Email, request.OtpCode, request.CurrentPassword ?? "", request.NewPassword, _otpService);
            if (!result.success)
            {
                return BadRequest(new MessageResponse { Success = false, Message = result.message });
            }

            return Ok(new MessageResponse { Success = true, Message = result.message });
        }

        /// <summary>
        /// Lấy danh sách ví voucher (khuyến mãi) khả dụng của khách hàng.
        /// </summary>
        /// <response code="200">Lấy danh sách thành công.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpGet("~/api/v1/vouchers")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetVouchers()
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new MessageResponse { Success = false, Message = "Bạn chưa đăng nhập!" });
            }

            var vouchers = await _customerService.GetVouchersAsync(customer.CustomerId);
            return Ok(new { success = true, vouchers });
        }

        /// <summary>
        /// Lấy danh sách thông báo cá nhân của khách hàng.
        /// </summary>
        /// <response code="200">Lấy danh sách thông báo thành công.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpGet("~/api/v1/notifications")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetNotifications()
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new MessageResponse { Success = false, Message = "Bạn chưa đăng nhập!" });
            }

            var list = await _customerService.GetNotificationsAsync(customer.CustomerId);
            return Ok(new { success = true, notifications = list });
        }

        /// <summary>
        /// Đánh dấu một thông báo đã đọc.
        /// </summary>
        /// <param name="id">ID thông báo cần đánh dấu.</param>
        /// <response code="200">Đánh dấu thành công.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpPatch("~/api/v1/notifications/{id}/read")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> MarkNotificationAsRead(int id)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new MessageResponse { Success = false, Message = "Bạn chưa đăng nhập!" });
            }

            await _customerService.MarkNotificationAsReadAsync(customer.CustomerId, id);
            return Ok(new SuccessResponse());
        }

        /// <summary>
        /// Lấy danh sách quà tặng đổi điểm loyalty khả dụng trên hệ thống.
        /// </summary>
        /// <response code="200">Lấy danh sách quà đổi điểm thành công.</response>
        [HttpGet("~/api/v1/rewards")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetRewards()
        {
            var rewards = await _customerService.GetRewardsAsync();
            return Ok(new { success = true, rewards });
        }

        /// <summary>
        /// Lấy trạng thái điểm và phân hạng thành viên (Loyalty) của khách hàng.
        /// </summary>
        /// <response code="200">Lấy thông tin thành công.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        /// <response code="404">Không tìm thấy thông tin khách hàng tương ứng.</response>
        [HttpGet("loyalty-status")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetLoyaltyStatus()
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new MessageResponse { Success = false, Message = "Bạn chưa đăng nhập!" });
            }

            var status = await _customerService.GetLoyaltyStatusAsync(customer.CustomerId);
            if (status == null)
            {
                return NotFound(new MessageResponse { Success = false, Message = "Không tìm thấy khách hàng." });
            }
            return Ok(new { success = true, status });
        }

        /// <summary>
        /// Đổi điểm tích lũy lấy quà tặng (voucher).
        /// </summary>
        /// <param name="request">ID quà tặng muốn đổi điểm.</param>
        /// <response code="200">Đổi quà thành công.</response>
        /// <response code="400">Không đủ điểm hoặc quà tặng đã hết hạn/hết số lượng.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpPost("redeem-reward")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> RedeemReward([FromBody] RedeemRewardRequest request)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new MessageResponse { Success = false, Message = "Bạn chưa đăng nhập!" });
            }

            if (request == null || request.RewardId <= 0)
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Dữ liệu không hợp lệ!" });
            }

            var result = await _customerService.RedeemRewardAsync(customer.CustomerId, request.RewardId);
            if (!result.success)
            {
                return BadRequest(new MessageResponse { Success = false, Message = result.message });
            }

            return Ok(new MessageResponse { Success = true, Message = result.message });
        }
    }
}
