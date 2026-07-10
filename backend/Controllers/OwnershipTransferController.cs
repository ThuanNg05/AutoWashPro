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

        [HttpGet]
        [Route("api/ownership-transfer/check-plate")]
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

        [HttpPost]
        [Route("api/ownership-transfer/verify-image-ocr")]
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

        [HttpPost]
        [Route("api/ownership-transfer/register")]
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

        [HttpPost]
        [Route("api/ownership-transfer/request-otp")]
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

        [HttpPost]
        [Route("api/ownership-transfer/request")]
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

        [HttpPost]
        [Route("api/ownership-transfer/{id}/owner-decision")]
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

        [HttpPost]
        [Route("api/ownership-transfer/{id}/cancel")]
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

        [HttpPost]
        [Route("api/ownership-transfer/{id}/admin-decision")]
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

        [HttpGet]
        [Route("api/ownership-transfer/customer/sent")]
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

        [HttpGet]
        [Route("api/ownership-transfer/customer/received")]
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

        [HttpGet]
        [Route("api/ownership-transfer/admin/requests")]
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

        [HttpGet]
        [Route("api/ownership-transfer/vehicle/{id}/history")]
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

        [HttpPost]
        [Route("api/ownership-transfer/upload")]
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

    // Models for request binding
    public class VerifyImageOcrRequest
    {
        public string LicensePlate { get; set; } = string.Empty;
        public string RegistrationImageUrl { get; set; } = string.Empty;
    }

    public class RegisterOcrRequest
    {
        public string LicensePlate { get; set; } = string.Empty;
        public string Brand { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public string VehicleClass { get; set; } = string.Empty;
        public string RegistrationImageUrl { get; set; } = string.Empty;
        public string OtpCode { get; set; } = string.Empty;
    }

    public class TransferRequestModel
    {
        public string LicensePlate { get; set; } = string.Empty;
        public string RegistrationImageUrl { get; set; } = string.Empty;
        public string? Reason { get; set; }
        public string OtpCode { get; set; } = string.Empty;
    }

    public class SendTransferOtpRequest
    {
        public string LicensePlate { get; set; } = string.Empty;
    }

    public class OwnerDecisionModel
    {
        public string Decision { get; set; } = string.Empty; // Approve or Reject
    }

    public class AdminDecisionModel
    {
        public bool Approve { get; set; }
        public string? Reason { get; set; }
    }
}
