using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Services;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Helpers;
using Auto_Wash.DTOs.OwnershipTransfer;

namespace Auto_Wash.Controllers
{
    public class OwnershipTransferController : Controller
    {
        private readonly OwnershipTransferService _transferService;
        private readonly AuthContextService _authContextService;
        private readonly AutoWashDbContext _context;

        public OwnershipTransferController(
            OwnershipTransferService transferService,
            AuthContextService authContextService,
            AutoWashDbContext context)
        {
            _transferService = transferService;
            _authContextService = authContextService;
            _context = context;
        }

        private bool IsAdminOrStaff()
        {
            var role = HttpContext.Session.GetString("UserRole");
            return string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(role, "staff", StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Kiểm tra biển số xe trên hệ thống trước khi bắt đầu chuyển nhượng.
        /// </summary>
        /// <param name="licensePlate">Biển số xe cần kiểm tra.</param>
        /// <response code="200">Kiểm tra thành công (trả về trạng thái xe đã tồn tại hay chưa, có thuộc về người dùng hiện tại không).</response>
        /// <response code="400">Biển số xe trống.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpGet]
        [Route("api/ownership-transfer/check-plate")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> CheckPlate(string licensePlate)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để thực hiện thao tác này!" });
            }

            if (string.IsNullOrWhiteSpace(licensePlate))
            {
                return BadRequest(new { success = false, message = "Biển số xe không được để trống!" });
            }

            string normPlate = LicensePlateHelper.Normalize(licensePlate);
            var vehicle = await _context.Vehicles
                .FirstOrDefaultAsync(v => v.LicensePlate == normPlate);

            if (vehicle == null)
            {
                return Ok(new { success = true, exists = false, message = "Biển số xe chưa có trên hệ thống." });
            }

            if (vehicle.CustomerId == customer.CustomerId)
            {
                return Ok(new { success = true, exists = true, isOwn = true, message = "Bạn đã đăng ký xe này rồi." });
            }

            return Ok(new { success = true, exists = true, isOwn = false, brand = vehicle.Brand, model = vehicle.Model, vehicleClass = vehicle.VehicleClass, message = "This vehicle is already linked to another customer account." });
        }

        /// <summary>
        /// Xác thực hình ảnh đăng ký xe qua OCR để trích xuất biển số.
        /// </summary>
        /// <param name="request">Đường dẫn ảnh đăng ký và biển số nhập tay.</param>
        /// <response code="200">Xác thực OCR thành công.</response>
        /// <response code="400">Thiếu thông tin hoặc biển số không trùng khớp.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpPost]
        [Route("api/ownership-transfer/verify-image-ocr")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> VerifyImageOcr([FromBody] VerifyImageOcrRequest request)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để thực hiện thao tác này!" });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.LicensePlate) || string.IsNullOrWhiteSpace(request.RegistrationImageUrl))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập đầy đủ biển số xe và hình ảnh đăng ký xe." });
            }

            try
            {
                var result = await _transferService.VerifyImageOcrAndCheckExistsAsync(
                    customer.CustomerId,
                    request.LicensePlate,
                    request.RegistrationImageUrl);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { ocrVerified = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Đăng ký xe mới chưa có trên hệ thống bằng ảnh OCR và mã OTP.
        /// </summary>
        /// <param name="request">Thông tin chi tiết xe, ảnh và mã OTP.</param>
        /// <response code="200">Đăng ký xe qua OCR thành công.</response>
        /// <response code="400">OTP không chính xác hoặc dữ liệu xe lỗi.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpPost]
        [Route("api/ownership-transfer/register")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> RegisterVehicleOcr([FromBody] RegisterOcrRequest request)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để thực hiện thao tác này!" });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.LicensePlate) ||
                string.IsNullOrWhiteSpace(request.Brand) || string.IsNullOrWhiteSpace(request.Model) ||
                string.IsNullOrWhiteSpace(request.VehicleClass) || string.IsNullOrWhiteSpace(request.RegistrationImageUrl) ||
                string.IsNullOrWhiteSpace(request.OtpCode))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập đầy đủ thông tin phương tiện, hình ảnh đăng ký và mã OTP." });
            }

            try
            {
                var result = await _transferService.RegisterVehicleOcrAsync(
                    customer.CustomerId,
                    request.LicensePlate,
                    request.Brand,
                    request.Model,
                    request.VehicleClass,
                    request.RegistrationImageUrl,
                    request.OtpCode);

                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }

                return Ok(new { success = true, message = result.message, vehicleId = result.vehicleId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Yêu cầu gửi mã OTP để bắt đầu thủ tục chuyển nhượng xe đang thuộc sở hữu của người khác.
        /// </summary>
        /// <param name="request">Biển số xe cần chuyển nhượng.</param>
        /// <response code="200">Gửi OTP thành công.</response>
        /// <response code="400">Yêu cầu không hợp lệ hoặc xe không tồn tại.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpPost]
        [Route("api/ownership-transfer/request-otp")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> RequestTransferOtp([FromBody] SendTransferOtpRequest request)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để thực hiện thao tác này!" });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.LicensePlate))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập biển số xe." });
            }

            try
            {
                var result = await _transferService.SendTransferOtpForExistingVehicleAsync(customer.CustomerId, request.LicensePlate);
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
        /// Gửi yêu cầu chuyển nhượng xe (từ chủ xe mới gửi sang chủ cũ).
        /// </summary>
        /// <param name="request">Biển số xe, ảnh OCR và mã OTP.</param>
        /// <response code="200">Tạo yêu cầu chuyển nhượng thành công.</response>
        /// <response code="400">Yêu cầu không hợp lệ hoặc sai OTP.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpPost]
        [Route("api/ownership-transfer/request")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> CreateTransferRequest([FromBody] TransferRequestModel request)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để thực hiện thao tác này!" });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.LicensePlate) || string.IsNullOrWhiteSpace(request.RegistrationImageUrl) || string.IsNullOrWhiteSpace(request.OtpCode))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập đầy đủ biển số xe, hình ảnh đăng ký xe và mã OTP." });
            }

            try
            {
                var result = await _transferService.CreateTransferRequestAsync(
                    customer.CustomerId,
                    request.LicensePlate,
                    request.RegistrationImageUrl,
                    request.Reason,
                    request.OtpCode);

                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }

                return Ok(new { success = true, message = result.message, requestId = result.requestId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Chủ xe hiện tại xác nhận Đồng ý hoặc Từ chối yêu cầu chuyển nhượng.
        /// </summary>
        /// <param name="id">ID của yêu cầu chuyển nhượng.</param>
        /// <param name="request">Quyết định chuyển nhượng (Approve hoặc Reject).</param>
        /// <response code="200">Xử lý quyết định thành công.</response>
        /// <response code="400">Quyết định không hợp lệ hoặc yêu cầu đã quá hạn.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpPost]
        [Route("api/ownership-transfer/{id}/owner-decision")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> ConfirmTransferRequest(int id, [FromBody] OwnerDecisionModel request)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để thực hiện thao tác này!" });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.Decision))
            {
                return BadRequest(new { success = false, message = "Quyết định không hợp lệ!" });
            }

            try
            {
                var result = await _transferService.ConfirmTransferRequestAsync(
                    customer.CustomerId,
                    id,
                    request.Decision);

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
        /// Người mua xe hủy bỏ yêu cầu chuyển nhượng do chính mình gửi.
        /// </summary>
        /// <param name="id">ID của yêu cầu chuyển nhượng.</param>
        /// <response code="200">Hủy yêu cầu thành công.</response>
        /// <response code="400">Không thể hủy do yêu cầu ở trạng thái không cho phép.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpPost]
        [Route("api/ownership-transfer/{id}/cancel")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> CancelTransferRequest(int id)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để thực hiện thao tác này!" });
            }

            try
            {
                var result = await _transferService.CancelTransferRequestAsync(customer.CustomerId, id);
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
        /// Admin hoặc nhân viên phê duyệt chính thức đơn chuyển nhượng (sau khi chủ cũ đồng ý).
        /// </summary>
        /// <param name="id">ID của yêu cầu chuyển nhượng.</param>
        /// <param name="request">Quyết định phê duyệt (Đồng ý/Từ chối) và lý do.</param>
        /// <response code="200">Admin xử lý đơn thành công.</response>
        /// <response code="400">Yêu cầu không khả dụng để phê duyệt.</response>
        /// <response code="401">Không có quyền Admin/Staff.</response>
        [HttpPost]
        [Route("api/ownership-transfer/{id}/admin-decision")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> ProcessAdminRequest(int id, [FromBody] AdminDecisionModel request)
        {
            if (!IsAdminOrStaff())
            {
                return Unauthorized(new { success = false, message = "Bạn không có quyền thực hiện thao tác này!" });
            }

            var adminAccountId = HttpContext.Session.GetInt32("AccountId");
            if (!adminAccountId.HasValue)
            {
                return Unauthorized(new { success = false, message = "Tài khoản quản trị không hợp lệ." });
            }

            if (request == null)
            {
                return BadRequest(new { success = false, message = "Yêu cầu không hợp lệ!" });
            }

            try
            {
                var result = await _transferService.ProcessAdminRequestAsync(
                    adminAccountId.Value,
                    id,
                    request.Approve,
                    request.Reason);

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
        /// Lấy danh sách các yêu cầu chuyển nhượng xe do khách hàng hiện tại đã gửi đi.
        /// </summary>
        /// <response code="200">Lấy danh sách thành công.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpGet]
        [Route("api/ownership-transfer/customer/sent")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetCustomerSentRequests()
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để thực hiện thao tác này!" });
            }

            try
            {
                var list = await _context.OwnershipTransferRequests
                    .Include(r => r.Vehicle)
                    .Include(r => r.CurrentOwner)
                        .ThenInclude(c => c.Account)
                    .Where(r => r.RequestedCustomerId == customer.CustomerId)
                    .OrderByDescending(r => r.CreatedAt)
                    .Select(r => new
                    {
                        requestId = r.TransferRequestId,
                        vehiclePlate = r.Vehicle.LicensePlate,
                        brand = r.Vehicle.Brand,
                        model = r.Vehicle.Model,
                        vehicleClass = r.Vehicle.VehicleClass,
                        currentOwnerName = r.CurrentOwner.Account.FullName,
                        currentOwnerEmail = r.CurrentOwner.Account.Email,
                        status = r.Status.ToString(),
                        ownerDecision = r.OwnerDecision,
                        createdAt = r.CreatedAt,
                        ownerConfirmedAt = r.OwnerConfirmedAt,
                        approvedAt = r.ApprovedAt,
                        updatedAt = r.UpdatedAt,
                        registrationImageUrl = r.RegistrationImageUrl,
                        ocrPlate = r.OcrPlate,
                        reason = r.Reason
                    })
                    .ToListAsync();

                return Ok(new { success = true, requests = list });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách các yêu cầu chuyển nhượng xe do người khác gửi tới khách hàng hiện tại.
        /// </summary>
        /// <response code="200">Lấy danh sách thành công.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpGet]
        [Route("api/ownership-transfer/customer/received")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetCustomerReceivedRequests()
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để thực hiện thao tác này!" });
            }

            try
            {
                var list = await _context.OwnershipTransferRequests
                    .Include(r => r.Vehicle)
                    .Include(r => r.RequestedCustomer)
                        .ThenInclude(c => c.Account)
                    .Where(r => r.CurrentOwnerCustomerId == customer.CustomerId)
                    .OrderByDescending(r => r.CreatedAt)
                    .Select(r => new
                    {
                        requestId = r.TransferRequestId,
                        vehiclePlate = r.Vehicle.LicensePlate,
                        brand = r.Vehicle.Brand,
                        model = r.Vehicle.Model,
                        vehicleClass = r.Vehicle.VehicleClass,
                        requestedOwnerName = r.RequestedCustomer.Account.FullName,
                        requestedOwnerEmail = r.RequestedCustomer.Account.Email,
                        status = r.Status.ToString(),
                        ownerDecision = r.OwnerDecision,
                        createdAt = r.CreatedAt,
                        ownerConfirmedAt = r.OwnerConfirmedAt,
                        approvedAt = r.ApprovedAt,
                        updatedAt = r.UpdatedAt,
                        registrationImageUrl = r.RegistrationImageUrl,
                        ocrPlate = r.OcrPlate,
                        reason = r.Reason
                    })
                    .ToListAsync();

                return Ok(new { success = true, requests = list });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách tất cả các yêu cầu chuyển nhượng trên hệ thống (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <param name="status">Trạng thái lọc yêu cầu chuyển nhượng.</param>
        /// <param name="search">Từ khóa tìm kiếm theo biển số hoặc tên khách hàng.</param>
        /// <response code="200">Lấy danh sách thành công.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpGet]
        [Route("api/ownership-transfer/admin/requests")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetAdminRequests(string? status, string? search)
        {
            if (!IsAdminOrStaff())
            {
                return Unauthorized(new { success = false, message = "Bạn không có quyền thực hiện thao tác này!" });
            }

            try
            {
                var query = _context.OwnershipTransferRequests
                    .Include(r => r.Vehicle)
                    .Include(r => r.CurrentOwner)
                        .ThenInclude(c => c.Account)
                    .Include(r => r.RequestedCustomer)
                        .ThenInclude(c => c.Account)
                    .AsQueryable();

                if (!string.IsNullOrEmpty(status))
                {
                    if (Enum.TryParse<OwnershipTransferStatus>(status, true, out var statusEnum))
                    {
                        query = query.Where(r => r.Status == statusEnum);
                    }
                }

                if (!string.IsNullOrEmpty(search))
                {
                    var cleanSearch = search.Trim().ToLower();
                    query = query.Where(r =>
                        r.Vehicle.LicensePlate.ToLower().Contains(cleanSearch) ||
                        r.CurrentOwner.Account.FullName.ToLower().Contains(cleanSearch) ||
                        r.RequestedCustomer.Account.FullName.ToLower().Contains(cleanSearch)
                    );
                }

                var list = await query
                    .OrderByDescending(r => r.CreatedAt)
                    .Select(r => new
                    {
                        requestId = r.TransferRequestId,
                        vehicleId = r.VehicleId,
                        vehiclePlate = r.Vehicle.LicensePlate,
                        brand = r.Vehicle.Brand,
                        model = r.Vehicle.Model,
                        vehicleClass = r.Vehicle.VehicleClass,
                        currentOwnerName = r.CurrentOwner.Account.FullName,
                        currentOwnerEmail = r.CurrentOwner.Account.Email,
                        requestedOwnerName = r.RequestedCustomer.Account.FullName,
                        requestedOwnerEmail = r.RequestedCustomer.Account.Email,
                        registrationImageUrl = r.RegistrationImageUrl,
                        ocrPlate = r.OcrPlate,
                        ownerDecision = r.OwnerDecision,
                        status = r.Status.ToString(),
                        createdAt = r.CreatedAt,
                        ownerConfirmedAt = r.OwnerConfirmedAt,
                        approvedAt = r.ApprovedAt,
                        updatedAt = r.UpdatedAt,
                        reason = r.Reason
                    })
                    .ToListAsync();

                return Ok(new { success = true, requests = list });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy lịch sử chuyển nhượng sở hữu của một phương tiện cụ thể (chỉ dành cho Admin/Staff).
        /// </summary>
        /// <param name="id">ID phương tiện cần xem lịch sử.</param>
        /// <response code="200">Lấy lịch sử thành công.</response>
        /// <response code="401">Chưa đăng nhập hoặc không có quyền Admin/Staff.</response>
        [HttpGet]
        [Route("api/ownership-transfer/vehicle/{id}/history")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetVehicleOwnershipHistory(int id)
        {
            if (!IsAdminOrStaff())
            {
                return Unauthorized(new { success = false, message = "Bạn không có quyền thực hiện thao tác này!" });
            }

            try
            {
                var history = await _context.VehicleOwnershipHistories
                    .Include(h => h.Customer)
                        .ThenInclude(c => c.Account)
                    .Where(h => h.VehicleId == id)
                    .OrderBy(h => h.FromDate)
                    .Select(h => new
                    {
                        historyId = h.HistoryId,
                        customerName = h.Customer.Account.FullName,
                        email = h.Customer.Account.Email,
                        fromDate = h.FromDate,
                        toDate = h.ToDate,
                        transferType = h.TransferType
                    })
                    .ToListAsync();

                return Ok(new { success = true, history = history });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Tải lên ảnh giấy đăng ký xe để làm thủ tục xác thực OCR.
        /// </summary>
        /// <param name="file">Tệp tin ảnh upload.</param>
        /// <response code="200">Tải tệp tin lên thành công.</response>
        /// <response code="400">Tệp tin trống hoặc không hợp lệ.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpPost]
        [Consumes("multipart/form-data")]
        [Route("api/ownership-transfer/upload")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để thực hiện thao tác này!" });
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { success = false, message = "Vui lòng chọn hình ảnh để tải lên." });
            }

            try
            {
                var uploadDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                if (!Directory.Exists(uploadDir))
                {
                    Directory.CreateDirectory(uploadDir);
                }

                var ext = Path.GetExtension(file.FileName);
                var newFileName = $"{Guid.NewGuid()}{ext}";
                if (file.FileName.ToLowerInvariant().Contains("fail"))
                {
                    newFileName = $"fail_{newFileName}";
                }
                else if (file.FileName.ToLowerInvariant().Contains("mismatch"))
                {
                    newFileName = $"mismatch_{newFileName}";
                }

                var filePath = Path.Combine(uploadDir, newFileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // Return relative URL for static file serving
                var fileUrl = $"/uploads/{newFileName}";
                return Ok(new { success = true, url = fileUrl });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
