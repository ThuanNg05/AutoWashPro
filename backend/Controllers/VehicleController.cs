    using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Auto_Wash.Services;
using Auto_Wash.DTOs.Vehicle;
using Auto_Wash.Helpers;

namespace Auto_Wash.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VehicleController : Controller
    {
        private readonly VehicleService _vehicleService;
        private readonly AuthContextService _authContextService;
        private readonly OtpService _otpService;

        public VehicleController(VehicleService vehicleService, AuthContextService authContextService, OtpService otpService)
        {
            _vehicleService = vehicleService;
            _authContextService = authContextService;
            _otpService = otpService;
        }

        /// <summary>
        /// Lấy danh sách toàn bộ phương tiện của khách hàng đang đăng nhập.
        /// </summary>
        /// <response code="200">Lấy danh sách thành công.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpGet("GetVehicles")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetVehicles()
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để xem danh sách phương tiện!" });
            }

            try
            {
                var list = await _vehicleService.GetCustomerVehiclesAsync(customer.CustomerId);
                return Ok(new { success = true, vehicles = list });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Gửi mã OTP xác nhận đăng ký phương tiện đến email khách hàng.
        /// </summary>
        /// <param name="request">Thông tin phương tiện đăng ký (biển số xe, phân khúc, hãng, dòng xe).</param>
        /// <response code="200">Gửi mã OTP thành công.</response>
        /// <response code="400">Dữ liệu đầu vào không hợp lệ hoặc thiếu thông tin.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        /// <response code="409">Biển số xe đã tồn tại trên hệ thống.</response>
        [HttpPost("send-otp")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> SendVehicleOtp([FromBody] CreateVehicleDto request)
        {
            var account = await _authContextService.GetCurrentAccountAsync();
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (account == null || customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để đăng ký phương tiện!" });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.LicensePlate))
            {
                return BadRequest(new { success = false, message = "Biển số xe không được để trống!" });
            }

            string normPlate = LicensePlateHelper.Normalize(request.LicensePlate);
            if (!LicensePlateHelper.IsValidVietnameseLicensePlate(normPlate))
            {
                return BadRequest(new { success = false, message = "Biển số xe không hợp lệ hoặc đầu số tỉnh thành không tồn tại!" });
            }

            try
            {
                bool exists = await _vehicleService.IsPlateRegisteredAsync(normPlate);
                if (exists)
                {
                    return Conflict(new { message = "Biển số xe đã được đăng ký." });
                }

                if (string.IsNullOrEmpty(account.Email))
                {
                    return BadRequest(new { success = false, message = "Không tìm thấy email của tài khoản để nhận mã OTP!" });
                }

                string code = await _vehicleService.SendVehicleOtpAsync(account.Email, normPlate);

                string subject = "AutoWash OTP Verification";
                string body = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);'>
                        <div style='text-align: center; margin-bottom: 25px;'>
                            <h2 style='color: #0f172a; margin: 0; font-size: 1.5rem; font-weight: 700;'>AutoWash <span style='color: #06b6d4;'>Pro</span></h2>
                            <p style='color: #64748b; font-size: 0.85rem; margin: 5px 0 0 0;'>Smart Car Wash Solutions</p>
                        </div>
                        <div style='border-top: 1px solid #f1f5f9; padding-top: 25px; text-align: center;'>
                            <p style='color: #334155; margin-bottom: 15px;'>Đăng ký biển số xe: <strong>{normPlate}</strong></p>
                            <p style='color: #334155; font-size: 1rem; margin-bottom: 20px;'>Your OTP code is: <strong style='color: #06b6d4; font-size: 1.15rem;'>{code}</strong>. This code expires in 5 minutes.</p>
                            <div style='background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 15px; display: inline-block; font-size: 1.75rem; font-weight: 700; letter-spacing: 6px; color: #0f172a; margin-bottom: 20px;'>
                                {code}
                            </div>
                        </div>
                        <div style='border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; margin-top: 25px;'>
                            <p style='font-size: 0.75rem; color: #94a3b8; margin: 0;'>This is an automated verification email. Please do not reply.</p>
                        </div>
                    </div>";

                await _otpService.SendEmailOtpAsync(account.Email, subject, body);

                return Ok(new { success = true, message = $"Mã OTP đã được gửi đến email {account.Email}!" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Xác thực mã OTP và lưu thông tin đăng ký phương tiện mới.
        /// </summary>
        /// <param name="request">Thông tin phương tiện và mã OTP xác thực.</param>
        /// <response code="200">Đăng ký phương tiện thành công.</response>
        /// <response code="400">Sai mã OTP hoặc dữ liệu biển số xe không hợp lệ.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        /// <response code="409">Biển số xe đã được đăng ký trước đó.</response>
        [HttpPost("verify-otp")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> VerifyVehicleOtpAndSave([FromBody] VerifyVehicleOtpDto request)
        {
            var account = await _authContextService.GetCurrentAccountAsync();
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (account == null || customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để đăng ký phương tiện!" });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.LicensePlate) || string.IsNullOrWhiteSpace(request.OtpCode))
            {
                return BadRequest(new { success = false, message = "Dữ liệu xác thực không hợp lệ!" });
            }

            string normPlate = LicensePlateHelper.Normalize(request.LicensePlate);
            if (!LicensePlateHelper.IsValidVietnameseLicensePlate(normPlate))
            {
                return BadRequest(new { success = false, message = "Biển số xe không hợp lệ hoặc đầu số tỉnh thành không tồn tại!" });
            }

            try
            {
                if (string.IsNullOrEmpty(account.Email))
                {
                    return BadRequest(new { success = false, message = "Không tìm thấy email liên kết với tài khoản!" });
                }

                bool exists = await _vehicleService.IsPlateRegisteredAsync(normPlate);
                if (exists)
                {
                    return Conflict(new { message = "Biển số xe đã được đăng ký." });
                }

                bool otpValid = await _vehicleService.VerifyVehicleOtpAsync(account.Email, request.OtpCode, normPlate);
                if (!otpValid)
                {
                    return BadRequest(new { success = false, message = "Mã OTP không hợp lệ hoặc đã hết hạn!" });
                }

                Console.WriteLine($"[VEHICLE REGISTRATION LOG] LicensePlate: {normPlate}, Brand: {request.Brand}, Model: {request.Model}, VehicleClass: {request.VehicleClass}");

                // VehicleClass from the client is passed through but the service will
                // override it with the correct value from master data.
                await _vehicleService.SaveVehicleAsync(
                    customer.CustomerId, 
                    normPlate, 
                    request.Brand, 
                    request.Model, 
                    request.VehicleClass);

                return Ok(new { success = true, message = "Đăng ký phương tiện thành công!" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Cập nhật thông tin phương tiện (hãng xe, dòng xe, phân khúc).
        /// </summary>
        /// <param name="id">ID phương tiện cần cập nhật.</param>
        /// <param name="request">Dữ liệu hãng xe, dòng xe, phân khúc cập nhật.</param>
        /// <response code="200">Cập nhật thông tin thành công.</response>
        /// <response code="400">Dữ liệu cập nhật không hợp lệ.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> UpdateVehicle(int id, [FromBody] UpdateVehicleDto request)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để sửa thông tin phương tiện!" });
            }

            if (request == null)
            {
                return BadRequest(new { success = false, message = "Dữ liệu cập nhật không hợp lệ." });
            }

            try
            {
                // VehicleClass from the client is passed through but the service will
                // override it with the correct value from master data.
                var result = await _vehicleService.UpdateVehicleAsync(customer.CustomerId, id, request.Brand, request.Model, request.VehicleClass);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }

                return Ok(new { success = true, message = result.message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Xóa phương tiện của khách hàng (chỉ thực hiện được khi không có lịch đặt hoạt động).
        /// </summary>
        /// <param name="id">ID phương tiện cần xóa.</param>
        /// <response code="200">Xóa phương tiện thành công.</response>
        /// <response code="400">Không thể xóa xe do đang có lịch đặt hoạt động.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> DeleteVehicle(int id)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để thực hiện thao tác này!" });
            }

            try
            {
                var result = await _vehicleService.DeleteVehicleByIdAsync(customer.CustomerId, id);
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
        /// Lấy danh sách phương tiện kèm thông tin tóm tắt (lần rửa gần nhất, lịch hẹn sắp tới,
        /// trạng thái chuyển quyền) cho trang Quản lý Phương tiện.
        /// </summary>
        /// <response code="200">Lấy danh sách tóm tắt thành công.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpGet("GetVehicleSummaries")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetVehicleSummaries()
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để xem danh sách phương tiện!" });
            }

            try
            {
                var list = await _vehicleService.GetVehicleSummariesAsync(customer.CustomerId);
                return Ok(new { success = true, vehicles = list });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}

