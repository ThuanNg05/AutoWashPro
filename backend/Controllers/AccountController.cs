using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Auto_Wash.Services;
using Auto_Wash.DTOs.Account;
using Auto_Wash.DTOs.Common;
using Auto_Wash.Helpers;
using Auto_Wash.Data.Entities;

namespace Auto_Wash.Controllers
{
    /// <summary>
    /// API Xác thực và Quản lý tài khoản người dùng.
    /// </summary>
    [ApiController]
    [Route("api/v1/account")]
    public class AccountController : ControllerBase
    {
        private readonly AccountService _accountService;
        private readonly OtpService _otpService;

        public AccountController(AccountService accountService, OtpService otpService)
        {
            _accountService = accountService;
            _otpService = otpService;
        }

        private async Task<object> SetupSessionAndBuildResponseAsync(Account account, bool isNewUser = false)
        {
            var roleStr = account.Role == AccountRole.Admin ? "admin" : account.Role == AccountRole.Staff ? "staff" : "customer";
            HttpContext.Session.SetString("UserRole", roleStr);
            HttpContext.Session.SetString("UserName", account.FullName);
            HttpContext.Session.SetString("UserEmail", account.Email ?? "");
            HttpContext.Session.SetInt32("AccountId", account.AccountId);

            string? tier = null;
            int? points = null;
            int? customerId = null;

            if (account.Role == AccountRole.Customer)
            {
                var customer = await _accountService.GetCustomerProfileAsync(account.AccountId);
                if (customer != null)
                {
                    customerId = customer.CustomerId;
                    tier = customer.Tier?.TierName;
                    points = customer.PointBalance;
                    HttpContext.Session.SetInt32("CustomerId", customer.CustomerId);
                }
            }

            return new
            {
                success = true,
                isNewUser = isNewUser,
                role = roleStr,
                accountId = account.AccountId,
                customerId = customerId,
                fullName = account.FullName,
                name = account.FullName, // backward compatibility
                email = account.Email,
                phone = account.Phone,
                tier = tier ?? "Member",
                points = points ?? 0
            };
        }

        /// <summary>
        /// Đăng nhập bằng tên tài khoản/email/số điện thoại và mật khẩu.
        /// </summary>
        /// <param name="request">Thông tin định danh và mật khẩu.</param>
        /// <response code="200">Đăng nhập thành công, thiết lập phiên Cookie Session.</response>
        /// <response code="400">Thiếu thông tin hoặc định dạng không hợp lệ.</response>
        [HttpPost("login")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Identifier) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new MessageResponse { Success = false, Message = "Vui lòng điền đầy đủ thông tin!" });

            var account = await _accountService.AuthenticateAsync(request.Identifier, request.Password);
            if (account == null)
                return Ok(new MessageResponse { Success = false, Message = "Tài khoản hoặc mật khẩu không đúng!" });

            var responseObj = await SetupSessionAndBuildResponseAsync(account);
            return Ok(responseObj);
        }

        /// <summary>
        /// Đăng xuất tài khoản và hủy bỏ phiên làm việc Cookie Session.
        /// </summary>
        /// <response code="200">Đăng xuất thành công.</response>
        [HttpPost("logout")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            Response.Cookies.Delete("UserEmail");
            Response.Cookies.Delete("UserPhone");
            Response.Cookies.Delete("UserAvatar");
            return Ok(new SuccessResponse());
        }

        /// <summary>
        /// Lấy thông tin tài khoản đang đăng nhập hiện tại từ Session.
        /// </summary>
        /// <response code="200">Trả về trạng thái xác thực và thông tin cơ bản tài khoản.</response>
        [HttpGet("me")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> Me()
        {
            var accountId = HttpContext.Session.GetInt32("AccountId");
            if (accountId == null)
            {
                return Ok(new { isAuthenticated = false });
            }

            var account = await _accountService.GetAccountByIdAsync(accountId.Value);
            if (account == null || !account.IsActive)
            {
                HttpContext.Session.Clear();
                return Ok(new { isAuthenticated = false });
            }

            var roleStr = account.Role == AccountRole.Admin ? "admin" : account.Role == AccountRole.Staff ? "staff" : "customer";

            string? tier = null;
            int? points = null;
            int? customerId = null;

            if (account.Role == AccountRole.Customer)
            {
                var customer = await _accountService.GetCustomerProfileAsync(account.AccountId);
                if (customer != null)
                {
                    customerId = customer.CustomerId;
                    tier = customer.Tier?.TierName;
                    points = customer.PointBalance;
                }
            }

            return Ok(new
            {
                isAuthenticated = true,
                accountId = account.AccountId,
                email = account.Email,
                role = roleStr,
                customerId = customerId,
                fullName = account.FullName,
                phone = account.Phone,
                tier = tier ?? "Member",
                points = points ?? 0
            });
        }

        /// <summary>
        /// Đăng nhập bằng tài khoản Google.
        /// </summary>
        /// <param name="request">Thông tin Email và Google ID xác thực.</param>
        /// <response code="200">Đăng nhập Google thành công, hoặc chuyển hướng đăng ký nếu là tài khoản mới.</response>
        /// <response code="400">Dữ liệu đăng nhập Google không hợp lệ hoặc tài khoản bị khóa.</response>
        [HttpPost("google-login")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequestDto request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.GoogleId))
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Dữ liệu đăng nhập Google không hợp lệ!" });
            }

            // 1. Try to find the account by Google ID first
            var account = await _accountService.FindByGoogleIdAsync(request.GoogleId);

            if (account == null)
            {
                // 2. If not found by Google ID, find by Email
                account = await _accountService.FindByEmailAsync(request.Email);
            }

            if (account == null)
            {
                // New user: must complete profile
                return Ok(new { success = true, isNewUser = true });
            }

            // 3. Security check: is the account active?
            if (!account.IsActive)
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động!" });
            }

            // 4. If email matches but Google ID is not linked, attempt to link it
            if (string.IsNullOrEmpty(account.GoogleId))
            {
                await _accountService.UpdateGoogleIdAsync(account, request.GoogleId);
            }
            else if (account.GoogleId != request.GoogleId.Trim())
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Tài khoản này đã được liên kết với một tài khoản Google khác!" });
            }

            // 5. If phone is missing, prompt profile completion
            if (string.IsNullOrEmpty(account.Phone))
            {
                return Ok(new { success = true, isNewUser = true });
            }

            var responseObj = await SetupSessionAndBuildResponseAsync(account);
            return Ok(responseObj);
        }

        /// <summary>
        /// Hoàn thành đăng ký tài khoản mới đối với trường hợp đăng nhập bằng Google lần đầu.
        /// </summary>
        /// <param name="request">Thông tin số điện thoại, mật khẩu bổ sung.</param>
        /// <response code="200">Hoàn thành đăng ký thành công.</response>
        /// <response code="400">Thông tin bổ sung không hợp lệ hoặc số điện thoại trùng lặp.</response>
        [HttpPost("complete-google-signup")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CompleteGoogleSignup([FromBody] CompleteGoogleSignupRequestDto request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.GoogleId))
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Dữ liệu hoàn thành đăng ký không hợp lệ!" });
            }

            if (!PhoneHelper.IsValidVietnamesePhone(request.Phone))
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Số điện thoại không đúng định dạng Việt Nam (ví dụ: 0912345678)!" });
            }

            // Validate phone is not already in use
            var existingPhone = await _accountService.FindByPhoneAsync(request.Phone);
            if (existingPhone != null)
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Số điện thoại này đã được sử dụng bởi một tài khoản khác!" });
            }

            // Validate GoogleId is not already linked to another account
            var existingGoogle = await _accountService.FindByGoogleIdAsync(request.GoogleId);
            if (existingGoogle != null && existingGoogle.Email != request.Email.Trim())
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Tài khoản Google này đã được liên kết với một tài khoản khác!" });
            }

            var account = await _accountService.CompleteGoogleSignupAsync(request);
            var responseObj = await SetupSessionAndBuildResponseAsync(account);
            return Ok(responseObj);
        }

        /// <summary>
        /// Gửi mã OTP xác thực đăng ký tài khoản mới qua Email.
        /// </summary>
        /// <param name="request">Email cần nhận mã xác thực.</param>
        /// <response code="200">Gửi mã OTP thành công.</response>
        /// <response code="400">Email không hợp lệ hoặc đã được sử dụng.</response>
        [HttpPost("send-register-otp")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> SendRegisterOtp([FromBody] SendRegisterOtpRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Email không hợp lệ!" });
            }

            var existingEmail = await _accountService.FindByEmailAsync(request.Email);
            if (existingEmail != null)
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Email này đã được sử dụng bởi một tài khoản khác!" });
            }

            string code = await _otpService.GenerateAndSaveOtpAsync(request.Email, "Register");

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
        /// Đăng ký tài khoản khách hàng mới bằng Email, số điện thoại, mật khẩu và mã OTP xác thực.
        /// </summary>
        /// <param name="request">Thông tin chi tiết tài khoản và mã OTP.</param>
        /// <response code="200">Đăng ký tài khoản thành công.</response>
        /// <response code="400">Dữ liệu đăng ký không hợp lệ, sai OTP hoặc trùng lặp thông tin.</response>
        [HttpPost("register")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.OtpCode))
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Vui lòng điền đầy đủ tất cả các trường và mã OTP!" });
            }

            if (!PhoneHelper.IsValidVietnamesePhone(request.Phone))
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Số điện thoại không đúng định dạng Việt Nam (ví dụ: 0912345678)!" });
            }

            var existingEmail = await _accountService.FindByEmailAsync(request.Email);
            if (existingEmail != null)
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Email này đã được sử dụng bởi một tài khoản khác!" });
            }

            var existingPhone = await _accountService.FindByPhoneAsync(request.Phone);
            if (existingPhone != null)
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Số điện thoại này đã được sử dụng bởi một tài khoản khác!" });
            }

            var account = await _accountService.RegisterAccountAsync(request);
            var responseObj = await SetupSessionAndBuildResponseAsync(account);
            return Ok(responseObj);
        }
    }
}
