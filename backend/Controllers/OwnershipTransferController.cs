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
        private readonly IWebHostEnvironment _environment;

        public OwnershipTransferController(
            OwnershipTransferService transferService,
            AuthContextService authContextService,
            AutoWashDbContext context,
            IWebHostEnvironment environment)
        {
            _transferService = transferService;
            _authContextService = authContextService;
            _context = context;
            _environment = environment;
        }

        private string? ResolveDocumentPath(OwnershipTransferDocument document)
        {
            var storedPath = document.FilePath.Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar);
            var isPrivatePath = storedPath.StartsWith($"private_uploads{Path.DirectorySeparatorChar}", StringComparison.OrdinalIgnoreCase);
            var root = isPrivatePath
                ? _environment.ContentRootPath
                : _environment.WebRootPath;

            if (string.IsNullOrWhiteSpace(root)) return null;

            var fullRoot = Path.GetFullPath(root);
            var fullPath = Path.GetFullPath(Path.Combine(fullRoot, storedPath));
            return fullPath.StartsWith(fullRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)
                ? fullPath
                : null;
        }

        private bool IsAdminOrStaff()
        {
            var role = HttpContext.Session.GetString("UserRole");
            return string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(role, "staff", StringComparison.OrdinalIgnoreCase);
        }

        private async Task<bool> CanAccessDocumentAsync(OwnershipTransferDocument document)
        {
            if (IsAdminOrStaff()) return true;

            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer != null)
            {
                var request = await _context.OwnershipTransferRequests
                    .FirstOrDefaultAsync(r => r.TransferRequestId == document.TransferRequestId);
                if (request != null && request.RequestedCustomerId == customer.CustomerId)
                {
                    return true;
                }
            }
            return false;
        }

        /// <summary>
        /// Kiểm tra biển số xe trên hệ thống.
        /// </summary>
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
        /// Gửi yêu cầu chuyển nhượng xe với tài liệu chứng minh.
        /// </summary>
        [HttpPost]
        [Consumes("multipart/form-data")]
        [Route("api/ownership-transfers")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> CreateTransferRequest(
            [FromForm] string licensePlate,
            [FromForm] string? description,
            IFormFileCollection files)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để thực hiện thao tác này!" });
            }

            if (string.IsNullOrWhiteSpace(licensePlate))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập biển số xe." });
            }

            // Validate files
            var (filesValid, filesMessage) = _transferService.ValidateFiles(files);
            if (!filesValid)
            {
                return BadRequest(new { success = false, message = filesMessage });
            }

            try
            {
                var result = await _transferService.CreateTransferRequestAsync(
                    customer.CustomerId,
                    licensePlate,
                    description);

                if (!result.success)
                {
                    if (result.message == "DUPLICATE_CONFLICT")
                    {
                        return Conflict(new { success = false, message = "An ownership transfer request for this vehicle already exists." });
                    }
                    return BadRequest(new { success = false, message = result.message });
                }

                // Upload documents
                var uploadResult = await _transferService.UploadDocumentsAsync(
                    result.requestId!.Value,
                    customer.CustomerId,
                    files);

                if (!uploadResult.success)
                {
                    return BadRequest(new { success = false, message = uploadResult.message });
                }

                return Ok(new { success = true, message = result.message, requestId = result.requestId });
            }
            catch (Exception)
            {
                return StatusCode(500, new { success = false, message = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau." });
            }
        }

        /// <summary>
        /// Lấy danh sách các yêu cầu chuyển nhượng xe do khách hàng hiện tại đã gửi.
        /// </summary>
        [HttpGet]
        [Route("api/ownership-transfers/my-requests")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetMyRequests()
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để thực hiện thao tác này!" });
            }

            try
            {
                var list = await _transferService.GetCustomerRequestsAsync(customer.CustomerId);
                return Ok(new { success = true, requests = list });
            }
            catch (Exception)
            {
                return StatusCode(500, new { success = false, message = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau." });
            }
        }

        /// <summary>
        /// Khách hàng hủy yêu cầu chuyển nhượng đang chờ xử lý.
        /// </summary>
        [HttpPost]
        [Route("api/ownership-transfers/{id}/cancel")]
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
            catch (Exception)
            {
                return StatusCode(500, new { success = false, message = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau." });
            }
        }

        /// <summary>
        /// Admin/Staff lấy danh sách tất cả yêu cầu chuyển nhượng.
        /// </summary>
        [HttpGet]
        [Route("api/admin/ownership-transfers")]
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
                var list = await _transferService.GetAdminRequestsAsync(status, search);
                return Ok(new { success = true, requests = list });
            }
            catch (Exception)
            {
                return StatusCode(500, new { success = false, message = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau." });
            }
        }

        /// <summary>
        /// Admin/Staff xem chi tiết một yêu cầu chuyển nhượng.
        /// </summary>
        [HttpGet]
        [Route("api/admin/ownership-transfers/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetRequestDetail(int id)
        {
            var isAdminOrStaff = IsAdminOrStaff();
            var customer = await _authContextService.GetCurrentCustomerAsync();

            try
            {
                var detail = await _transferService.GetRequestDetailAsync(id);
                if (detail == null)
                {
                    return NotFound(new { success = false, message = "Yêu cầu chuyển nhượng không tồn tại." });
                }

                // Check permissions: Admin/Staff OR the owner of the transfer request
                var request = await _context.OwnershipTransferRequests.FirstOrDefaultAsync(r => r.TransferRequestId == id);
                if (request == null)
                {
                    return NotFound(new { success = false, message = "Yêu cầu chuyển nhượng không tồn tại." });
                }

                bool hasPermission = isAdminOrStaff;
                if (!hasPermission && customer != null && request.RequestedCustomerId == customer.CustomerId)
                {
                    hasPermission = true;
                }

                if (!hasPermission)
                {
                    return Unauthorized(new { success = false, message = "Bạn không có quyền xem chi tiết yêu cầu này!" });
                }

                return Ok(new { success = true, request = detail });
            }
            catch (Exception)
            {
                return StatusCode(500, new { success = false, message = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau." });
            }
        }

        /// <summary>
        /// Admin/Staff phê duyệt yêu cầu chuyển nhượng.
        /// </summary>
        [HttpPut]
        [Route("api/admin/ownership-transfers/{id}/approve")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> ApproveRequest(int id)
        {
            bool isAdminOrStaff = IsAdminOrStaff();
            if (!isAdminOrStaff)
            {
                return Unauthorized(new { success = false, message = "Bạn không có quyền thực hiện thao tác này!" });
            }

            var adminAccountId = HttpContext.Session.GetInt32("AccountId");
            if (!adminAccountId.HasValue)
            {
                return Unauthorized(new { success = false, message = "Tài khoản quản trị không hợp lệ." });
            }

            try
            {
                var result = await _transferService.ApproveRequestAsync(adminAccountId.Value, id);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }

                return Ok(new { success = true, message = result.message });
            }
            catch (Exception)
            {
                return StatusCode(500, new { success = false, message = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau." });
            }
        }

        /// <summary>
        /// Admin/Staff từ chối yêu cầu chuyển nhượng.
        /// </summary>
        [HttpPut]
        [Route("api/admin/ownership-transfers/{id}/reject")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> RejectRequest(int id, [FromBody] AdminRejectDto request)
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

            if (request == null || string.IsNullOrWhiteSpace(request.RejectReason))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập lý do từ chối." });
            }

            try
            {
                var result = await _transferService.RejectRequestAsync(adminAccountId.Value, id, request.RejectReason);
                if (!result.success)
                {
                    return BadRequest(new { success = false, message = result.message });
                }

                return Ok(new { success = true, message = result.message });
            }
            catch (Exception)
            {
                return StatusCode(500, new { success = false, message = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau." });
            }
        }

        /// <summary>
        /// Xem trước tài liệu chuyển nhượng (inline). Cho phép Admin/Staff và chính khách hàng yêu cầu truy cập.
        /// </summary>
        [HttpGet]
        [Route("api/admin/ownership-transfers/document/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> PreviewDocument(int id)
        {
            var document = await _transferService.GetDocumentAsync(id);
            if (document == null)
            {
                return NotFound(new { success = false, message = "Tài liệu không tồn tại." });
            }

            if (!await CanAccessDocumentAsync(document))
            {
                return Unauthorized(new { success = false, message = "Bạn không có quyền thực hiện thao tác này!" });
            }

            var physicalPath = ResolveDocumentPath(document);
            if (physicalPath == null || !System.IO.File.Exists(physicalPath))
            {
                return NotFound(new { success = false, message = "Tệp tin không tồn tại trên máy chủ." });
            }

            var fileBytes = await System.IO.File.ReadAllBytesAsync(physicalPath);
            return File(fileBytes, document.ContentType);
        }

        /// <summary>
        /// Tải xuống tài liệu chuyển nhượng. Cho phép Admin/Staff và chính khách hàng yêu cầu truy cập.
        /// </summary>
        [HttpGet]
        [Route("api/admin/ownership-transfers/document/{id}/download")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> DownloadDocument(int id)
        {
            var document = await _transferService.GetDocumentAsync(id);
            if (document == null)
            {
                return NotFound(new { success = false, message = "Tài liệu không tồn tại." });
            }

            if (!await CanAccessDocumentAsync(document))
            {
                return Unauthorized(new { success = false, message = "Bạn không có quyền thực hiện thao tác này!" });
            }

            var physicalPath = ResolveDocumentPath(document);
            if (physicalPath == null || !System.IO.File.Exists(physicalPath))
            {
                return NotFound(new { success = false, message = "Tệp tin không tồn tại trên máy chủ." });
            }

            var fileBytes = await System.IO.File.ReadAllBytesAsync(physicalPath);
            return File(fileBytes, document.ContentType, document.FileName);
        }

        /// <summary>
        /// Lấy lịch sử chuyển nhượng sở hữu của một phương tiện (Admin/Staff).
        /// </summary>
        [HttpGet]
        [Route("api/admin/ownership-transfers/vehicle/{id}/history")]
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
                var history = await _transferService.GetVehicleOwnershipHistoryAsync(id);
                return Ok(new { success = true, history = history });
            }
            catch (Exception)
            {
                return StatusCode(500, new { success = false, message = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau." });
            }
        }

        /// <summary>
        /// Khách hàng bổ sung tài liệu cho yêu cầu chuyển quyền sở hữu đang chờ duyệt.
        /// </summary>
        [HttpPost]
        [Consumes("multipart/form-data")]
        [Route("api/ownership-transfers/{id}/documents")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> UploadAdditionalDocuments(int id, IFormFileCollection files)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để thực hiện thao tác này!" });
            }

            var (filesValid, filesMessage) = _transferService.ValidateFiles(files);
            if (!filesValid)
            {
                return BadRequest(new { success = false, message = filesMessage });
            }

            try
            {
                var uploadResult = await _transferService.UploadDocumentsAsync(id, customer.CustomerId, files);
                if (!uploadResult.success)
                {
                    return BadRequest(new { success = false, message = uploadResult.message });
                }

                return Ok(new { success = true, message = "Bổ sung tài liệu thành công." });
            }
            catch (Exception)
            {
                return StatusCode(500, new { success = false, message = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau." });
            }
        }
    }
}
