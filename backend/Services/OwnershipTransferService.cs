using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Helpers;

namespace Auto_Wash.Services
{
    public class OwnershipTransferService
    {
        private readonly AutoWashDbContext _context;
        private readonly OtpService _otpService;
        private readonly ILogger<OwnershipTransferService> _logger;

        private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".pdf", ".jpg", ".jpeg", ".png"
        };

        private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "application/pdf", "image/jpeg", "image/png"
        };

        private static readonly HashSet<string> BlockedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".exe", ".zip", ".rar", ".dll", ".bat", ".js", ".html"
        };

        private const int MaxFileCount = 5;
        private const int MaxFileSize = 10 * 1024 * 1024; // 10 MB

        public OwnershipTransferService(AutoWashDbContext context, OtpService otpService, ILogger<OwnershipTransferService> logger)
        {
            _context = context;
            _otpService = otpService;
            _logger = logger;
        }

        public async Task<bool> IsVehicleLockedAsync(int vehicleId)
        {
            return await _context.OwnershipTransferRequests
                .AnyAsync(r => r.VehicleId == vehicleId &&
                               r.Status == OwnershipTransferStatus.Pending);
        }

        public async Task<(bool success, string message, int? requestId)> CreateTransferRequestAsync(
            int requestedCustomerId, string licensePlate, string? description)
        {
            string normPlate = LicensePlateHelper.Normalize(licensePlate);
            if (!LicensePlateHelper.IsValidVietnameseLicensePlate(normPlate))
            {
                return (false, "Biển số xe không hợp lệ hoặc đầu số tỉnh thành không tồn tại!", null);
            }

            var vehicle = await _context.Vehicles
                .Include(v => v.Customer)
                    .ThenInclude(c => c.Account)
                .FirstOrDefaultAsync(v => v.LicensePlate == normPlate);

            if (vehicle == null)
            {
                return (false, "Không tìm thấy phương tiện tương ứng trên hệ thống.", null);
            }

            if (vehicle.CustomerId == requestedCustomerId)
            {
                return (false, "Phương tiện này đã thuộc quyền sở hữu của bạn.", null);
            }

            // Duplicate transfer prevention
            bool activeRequestExists = await _context.OwnershipTransferRequests
                .AnyAsync(r => r.VehicleId == vehicle.VehicleId &&
                               r.Status == OwnershipTransferStatus.Pending);
            if (activeRequestExists)
            {
                return (false, "DUPLICATE_CONFLICT", null);
            }

            var request = new OwnershipTransferRequest
            {
                VehicleId = vehicle.VehicleId,
                CurrentOwnerCustomerId = vehicle.CustomerId,
                RequestedCustomerId = requestedCustomerId,
                Status = OwnershipTransferStatus.Pending,
                Description = description,
                SubmittedAt = DateTime.Now
            };

            _context.OwnershipTransferRequests.Add(request);
            await _context.SaveChangesAsync();

            // Send in-app notification to requester
            try
            {
                var notification = new Notification
                {
                    CustomerId = requestedCustomerId,
                    Title = "Yêu cầu chuyển quyền đã được gửi",
                    Message = $"Biển số: {vehicle.LicensePlate} - Ngày gửi: {request.SubmittedAt.ToString("yyyy-MM-dd")}",
                    Type = "OwnershipTransfer",
                    IsRead = false,
                    CreatedAt = DateTime.Now
                };
                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send transfer notification for request {RequestId}", request.TransferRequestId);
            }

            // Send email notification to requester
            try
            {
                var requester = await _context.Customers
                    .Include(c => c.Account)
                    .FirstOrDefaultAsync(c => c.CustomerId == requestedCustomerId);

                if (requester?.Account != null && !string.IsNullOrEmpty(requester.Account.Email))
                {
                    string emailSubject = "[AutoWash Pro] Yêu cầu chuyển quyền đã được gửi";
                    string emailBody = GetTransferEmailBody(
                        requester.Account.FullName,
                        vehicle.LicensePlate,
                        vehicle.Brand ?? "Unknown",
                        vehicle.Model ?? "Unknown",
                        "Chờ duyệt",
                        "Ngày gửi",
                        request.SubmittedAt.ToString("dd/MM/yyyy HH:mm"),
                        "Gửi yêu cầu chuyển quyền thành công",
                        "Thông tin chi tiết yêu cầu",
                        "#93c5fd",
                        "#f0f9ff",
                        "<p>Yêu cầu chuyển nhượng xe đã được gửi thành công lên hệ thống AutoWash Pro và đang chờ Admin xét duyệt.</p>"
                    );

                    await _otpService.SendEmailAsync(requester.Account.Email, emailSubject, emailBody);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send transfer submission email for request {RequestId}", request.TransferRequestId);
            }

            return (true, "Yêu cầu chuyển nhượng đã được gửi thành công.", request.TransferRequestId);
        }

        public (bool success, string message) ValidateFiles(IFormFileCollection files)
        {
            if (files == null || files.Count == 0)
            {
                return (false, "Vui lòng tải lên ít nhất một tài liệu chứng minh quyền sở hữu.");
            }

            if (files.Count > MaxFileCount)
            {
                return (false, $"Số lượng tệp tin tối đa là {MaxFileCount}.");
            }

            foreach (var file in files)
            {
                if (file.Length == 0)
                {
                    return (false, $"Tệp tin '{file.FileName}' trống.");
                }

                if (file.Length > MaxFileSize)
                {
                    return (false, $"Tệp tin '{file.FileName}' vượt quá giới hạn 10MB.");
                }

                var ext = Path.GetExtension(file.FileName);
                if (BlockedExtensions.Contains(ext))
                {
                    return (false, $"Loại tệp tin '{ext}' không được phép tải lên.");
                }

                if (!AllowedExtensions.Contains(ext))
                {
                    return (false, $"Chỉ chấp nhận tệp tin PDF, JPG, JPEG, PNG. Tệp '{file.FileName}' không hợp lệ.");
                }

                if (!AllowedMimeTypes.Contains(file.ContentType))
                {
                    return (false, $"MIME type '{file.ContentType}' của tệp '{file.FileName}' không hợp lệ.");
                }
            }

            return (true, string.Empty);
        }

        public async Task<(bool success, string message)> UploadDocumentsAsync(
            int requestId, int customerId, IFormFileCollection files)
        {
            var request = await _context.OwnershipTransferRequests
                .FirstOrDefaultAsync(r => r.TransferRequestId == requestId);

            if (request == null)
            {
                return (false, "Yêu cầu chuyển nhượng không tồn tại.");
            }

            if (request.RequestedCustomerId != customerId)
            {
                return (false, "Bạn không có quyền tải tài liệu cho yêu cầu này.");
            }

            if (request.Status != OwnershipTransferStatus.Pending)
            {
                return (false, "Yêu cầu này đã được xử lý, không thể tải thêm tài liệu.");
            }

            var uploadDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "transfers", $"request_{requestId}");
            if (!Directory.Exists(uploadDir))
            {
                Directory.CreateDirectory(uploadDir);
            }

            foreach (var file in files)
            {
                var ext = Path.GetExtension(file.FileName);
                var storedFileName = $"{Guid.NewGuid()}{ext}";
                var filePath = Path.Combine(uploadDir, storedFileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var document = new OwnershipTransferDocument
                {
                    TransferRequestId = requestId,
                    FileName = file.FileName,
                    StoredFileName = storedFileName,
                    FilePath = $"/uploads/transfers/request_{requestId}/{storedFileName}",
                    ContentType = file.ContentType,
                    FileSize = file.Length,
                    UploadedAt = DateTime.Now
                };

                _context.OwnershipTransferDocuments.Add(document);
            }

            await _context.SaveChangesAsync();

            return (true, "Tải tài liệu thành công.");
        }

        public async Task<object> GetCustomerRequestsAsync(int customerId)
        {
            var list = await _context.OwnershipTransferRequests
                .Include(r => r.Vehicle)
                .Include(r => r.CurrentOwner)
                    .ThenInclude(c => c.Account)
                .Include(r => r.Documents)
                .Where(r => r.RequestedCustomerId == customerId)
                .OrderByDescending(r => r.SubmittedAt)
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
                    description = r.Description,
                    submittedAt = r.SubmittedAt,
                    reviewedAt = r.ReviewedAt,
                    rejectReason = r.RejectReason,
                    documentCount = r.Documents.Count
                })
                .ToListAsync();

            return list;
        }

        public async Task<(bool success, string message)> CancelTransferRequestAsync(int customerId, int requestId)
        {
            var request = await _context.OwnershipTransferRequests
                .Include(r => r.Vehicle)
                .Include(r => r.RequestedCustomer)
                    .ThenInclude(c => c.Account)
                .FirstOrDefaultAsync(r => r.TransferRequestId == requestId);

            if (request == null)
            {
                return (false, "Yêu cầu chuyển nhượng không tồn tại.");
            }

            if (request.RequestedCustomerId != customerId)
            {
                return (false, "Bạn không có quyền hủy yêu cầu chuyển nhượng này.");
            }

            if (request.Status != OwnershipTransferStatus.Pending)
            {
                return (false, "Yêu cầu này đã được xử lý, không thể hủy.");
            }

            request.Status = OwnershipTransferStatus.Cancelled;
            request.RejectReason = "Khách hàng tự hủy yêu cầu.";
            request.ReviewedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            // Send notification
            try
            {
                var notification = new Notification
                {
                    CustomerId = request.RequestedCustomerId,
                    Title = "Bạn đã hủy yêu cầu chuyển quyền.",
                    Message = $"Yêu cầu chuyển quyền cho xe {request.Vehicle?.LicensePlate ?? "Unknown"} đã được bạn hủy.",
                    Type = "OwnershipTransfer",
                    IsRead = false,
                    CreatedAt = DateTime.Now
                };
                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send cancel in-app notification for request {RequestId}", requestId);
            }

            // Capture data for background cancel email
            string? requesterEmail = request.RequestedCustomer?.Account?.Email;
            string? requesterName = request.RequestedCustomer?.Account?.FullName;
            string licensePlate = request.Vehicle?.LicensePlate ?? "Unknown";
            string brand = request.Vehicle?.Brand ?? "Unknown";
            string model = request.Vehicle?.Model ?? "Unknown";
            string dateStr = DateTime.Now.ToString("dd/MM/yyyy HH:mm");

            // Send cancel email notification in the background
            _ = Task.Run(async () =>
            {
                if (!string.IsNullOrEmpty(requesterEmail))
                {
                    try
                    {
                        string emailBody = GetTransferEmailBody(
                            requesterName ?? "Khách hàng",
                            licensePlate,
                            brand,
                            model,
                            "Đã hủy",
                            "Ngày hủy",
                            dateStr,
                            "Bạn đã hủy yêu cầu chuyển quyền",
                            "Thông tin chi tiết yêu cầu",
                            "#cbd5e1",
                            "#f8fafc",
                            "<p>Bạn đã chủ động hủy bỏ yêu cầu chuyển quyền sở hữu cho phương tiện dưới đây. Yêu cầu đã đóng lại.</p>"
                        );

                        await _otpService.SendEmailAsync(requesterEmail, "[AutoWash Pro] Yêu cầu chuyển quyền đã được hủy", emailBody);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send cancel email for request {RequestId}", requestId);
                    }
                }
            });

            return (true, "Đã hủy yêu cầu chuyển nhượng thành công.");
        }

        public async Task<object> GetAdminRequestsAsync(string? status, string? search)
        {
            var query = _context.OwnershipTransferRequests
                .Include(r => r.Vehicle)
                .Include(r => r.CurrentOwner)
                    .ThenInclude(c => c.Account)
                .Include(r => r.RequestedCustomer)
                    .ThenInclude(c => c.Account)
                .Include(r => r.Documents)
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
                .OrderByDescending(r => r.SubmittedAt)
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
                    status = r.Status.ToString(),
                    description = r.Description,
                    submittedAt = r.SubmittedAt,
                    reviewedAt = r.ReviewedAt,
                    rejectReason = r.RejectReason,
                    documentCount = r.Documents.Count
                })
                .ToListAsync();

            return list;
        }

        public async Task<object?> GetRequestDetailAsync(int requestId)
        {
            var r = await _context.OwnershipTransferRequests
                .Include(r => r.Vehicle)
                .Include(r => r.CurrentOwner)
                    .ThenInclude(c => c.Account)
                .Include(r => r.RequestedCustomer)
                    .ThenInclude(c => c.Account)
                .Include(r => r.Documents)
                .Include(r => r.ReviewedByAccount)
                .FirstOrDefaultAsync(r => r.TransferRequestId == requestId);

            if (r == null) return null;

            return new
            {
                requestId = r.TransferRequestId,
                vehicleId = r.VehicleId,
                vehiclePlate = r.Vehicle.LicensePlate,
                brand = r.Vehicle.Brand,
                model = r.Vehicle.Model,
                vehicleClass = r.Vehicle.VehicleClass,
                currentOwnerName = r.CurrentOwner.Account.FullName,
                currentOwnerEmail = r.CurrentOwner.Account.Email,
                currentOwnerPhone = r.CurrentOwner.Account.Phone,
                requestedOwnerName = r.RequestedCustomer.Account.FullName,
                requestedOwnerEmail = r.RequestedCustomer.Account.Email,
                requestedOwnerPhone = r.RequestedCustomer.Account.Phone,
                status = r.Status.ToString(),
                description = r.Description,
                submittedAt = r.SubmittedAt,
                reviewedAt = r.ReviewedAt,
                reviewedByName = r.ReviewedByAccount?.FullName,
                rejectReason = r.RejectReason,
                documents = r.Documents.Select(d => new
                {
                    documentId = d.DocumentId,
                    fileName = d.FileName,
                    contentType = d.ContentType,
                    fileSize = d.FileSize,
                    uploadedAt = d.UploadedAt,
                    filePath = d.FilePath
                }).ToList()
            };
        }

        public async Task<(bool success, string message)> ApproveRequestAsync(int adminAccountId, int requestId)
        {
            var totalSw = System.Diagnostics.Stopwatch.StartNew();
            var stepSw = System.Diagnostics.Stopwatch.StartNew();

            // Load Request
            var request = await _context.OwnershipTransferRequests
                .Include(r => r.Vehicle)
                .Include(r => r.RequestedCustomer)
                    .ThenInclude(rc => rc.Account)
                .Include(r => r.CurrentOwner)
                    .ThenInclude(co => co.Account)
                .FirstOrDefaultAsync(r => r.TransferRequestId == requestId);

            _logger.LogInformation("[BENCHMARK] Load Request took {Time}ms", stepSw.ElapsedMilliseconds);
            stepSw.Restart();

            if (request == null)
            {
                return (false, "Yêu cầu chuyển quyền không tồn tại.");
            }

            if (request.Status != OwnershipTransferStatus.Pending)
            {
                return (false, "Yêu cầu đã được xử lý.");
            }

            // Load Vehicle
            var vehicle = await _context.Vehicles.FirstOrDefaultAsync(v => v.VehicleId == request.VehicleId);
            _logger.LogInformation("[BENCHMARK] Load Vehicle took {Time}ms", stepSw.ElapsedMilliseconds);
            stepSw.Restart();

            if (vehicle == null)
            {
                return (false, "Phương tiện không tồn tại trên hệ thống.");
            }

            // Validation
            if (vehicle.CustomerId != request.CurrentOwnerCustomerId || request.CurrentOwner == null)
            {
                return (false, "Thông tin chủ xe hiện tại không chính xác.");
            }

            if (request.RequestedCustomer == null)
            {
                return (false, "Khách hàng yêu cầu không tồn tại.");
            }

            _logger.LogInformation("[BENCHMARK] Validation took {Time}ms", stepSw.ElapsedMilliseconds);
            stepSw.Restart();

            var strategy = _context.Database.CreateExecutionStrategy();
            var approveResult = await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    DateTime now = DateTime.Now;
                    int oldOwnerId = vehicle.CustomerId;

                    // Step 2: Transfer ownership (update existing vehicle)
                    vehicle.CustomerId = request.RequestedCustomerId;

                    // Step 3: Update Request
                    request.Status = OwnershipTransferStatus.Approved;
                    request.ReviewedBy = adminAccountId;
                    request.ReviewedAt = now;

                    // Step 4: Ownership History
                    // Close previous active history if it exists
                    var activeHistory = await _context.VehicleOwnershipHistories
                        .FirstOrDefaultAsync(h => h.VehicleId == request.VehicleId && h.ToDate == null);
                    if (activeHistory != null)
                    {
                        activeHistory.ToDate = now;
                    }

                    // Create new history record
                    var newHistory = new VehicleOwnershipHistory
                    {
                        VehicleId = request.VehicleId,
                        CustomerId = request.RequestedCustomerId,
                        FromDate = now,
                        ToDate = null,
                        TransferRequestId = request.TransferRequestId,
                        TransferType = "OwnershipTransfer",
                        OldOwnerId = oldOwnerId,
                        NewOwnerId = request.RequestedCustomerId,
                        ApprovedBy = adminAccountId,
                        ApprovedAt = now
                    };
                    _context.VehicleOwnershipHistories.Add(newHistory);

                    // SaveChangesAsync
                    var saveChangesSw = System.Diagnostics.Stopwatch.StartNew();
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("[BENCHMARK] SaveChangesAsync took {Time}ms", saveChangesSw.ElapsedMilliseconds);

                    // CommitAsync
                    var commitSw = System.Diagnostics.Stopwatch.StartNew();
                    await transaction.CommitAsync();
                    _logger.LogInformation("[BENCHMARK] CommitAsync took {Time}ms", commitSw.ElapsedMilliseconds);

                    // Send in-app notification to requester (New Owner) & Old Owner
                    try
                    {
                        var notifNewOwner = new Notification
                        {
                            CustomerId = request.RequestedCustomerId,
                            Title = "Bạn đã trở thành chủ sở hữu phương tiện",
                            Message = $"Xe {request.Vehicle?.LicensePlate ?? "Unknown"} đã xuất hiện trong Garage của bạn.",
                            Type = "OwnershipTransfer",
                            IsRead = false,
                            CreatedAt = now
                        };
                        _context.Notifications.Add(notifNewOwner);

                        var notifOldOwner = new Notification
                        {
                            CustomerId = oldOwnerId,
                            Title = "Xe đã được chuyển khỏi tài khoản của bạn",
                            Message = $"Quyền sở hữu xe {request.Vehicle?.LicensePlate ?? "Unknown"} đã được chuyển sang chủ mới.",
                            Type = "OwnershipTransfer",
                            IsRead = false,
                            CreatedAt = now
                        };
                        _context.Notifications.Add(notifOldOwner);

                        await _context.SaveChangesAsync();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send approval in-app notifications for request {RequestId}", requestId);
                    }

                    // Log audit trail using ILogger
                    _logger.LogInformation("Approved ownership transfer: License Plate={LicensePlate}, Old Owner={OldOwner}, New Owner={NewOwner}, Admin={Admin}, Approved Time={ApprovedTime}, Result=Success",
                        vehicle.LicensePlate, oldOwnerId, request.RequestedCustomerId, adminAccountId, now);

                    return (true, "Duyệt yêu cầu chuyển nhượng xe thành công!");
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Transaction failed for approving ownership transfer request {RequestId}", requestId);
                    throw;
                }
            });

            // Capture data for background emails to prevent DbContext thread access issues
            string? ownerEmail = request.CurrentOwner?.Account?.Email;
            string? ownerName = request.CurrentOwner?.Account?.FullName;
            string? requesterEmail = request.RequestedCustomer?.Account?.Email;
            string? requesterName = request.RequestedCustomer?.Account?.FullName;
            string licensePlate = request.Vehicle?.LicensePlate ?? "Unknown";
            string brand = request.Vehicle?.Brand ?? "Unknown";
            string model = request.Vehicle?.Model ?? "Unknown";
            string dateStr = DateTime.Now.ToString("dd/MM/yyyy HH:mm");

            // Send email notifications in the background
            _ = Task.Run(async () =>
            {
                var bgSw = System.Diagnostics.Stopwatch.StartNew();

                // Send Email to Current Owner (Old Owner)
                if (!string.IsNullOrEmpty(ownerEmail))
                {
                    try
                    {
                        var emailSw = System.Diagnostics.Stopwatch.StartNew();
                        string emailBody = GetTransferEmailBody(
                            ownerName ?? "Khách hàng",
                            licensePlate,
                            brand,
                            model,
                            "Đã duyệt",
                            "Ngày xử lý",
                            dateStr,
                            "Chuyển quyền phương tiện thành công",
                            "Thông tin phương tiện đã chuyển giao",
                            "#fca5a5",
                            "#fef2f2",
                            "<p>Chúng tôi xin thông báo phương tiện dưới đây của bạn đã được chuyển giao thành công sang chủ sở hữu mới. Xe đã được gỡ khỏi Garage của bạn.</p>"
                        );

                        await _otpService.SendEmailAsync(ownerEmail, "[AutoWash Pro] Xe đã được chuyển khỏi tài khoản của bạn", emailBody);
                        _logger.LogInformation("[BENCHMARK] Send Email to Current Owner took {Time}ms", emailSw.ElapsedMilliseconds);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send transfer approval email to old owner for request {RequestId}", requestId);
                    }
                }

                // Send Email to New Owner
                if (!string.IsNullOrEmpty(requesterEmail))
                {
                    try
                    {
                        var emailSw = System.Diagnostics.Stopwatch.StartNew();
                        string emailBody = GetTransferEmailBody(
                            requesterName ?? "Khách hàng",
                            licensePlate,
                            brand,
                            model,
                            "Đã duyệt",
                            "Ngày xử lý",
                            dateStr,
                            "Chuyển quyền phương tiện thành công",
                            "Thông tin phương tiện sở hữu",
                            "#bbf7d0",
                            "#f0fdf4",
                            "<p>Chúc mừng bạn! Yêu cầu chuyển nhượng xe của bạn đã được Quản trị viên phê duyệt. Xe đã chính thức xuất hiện trong Garage của bạn.</p>"
                        );

                        await _otpService.SendEmailAsync(requesterEmail, "[AutoWash Pro] Yêu cầu chuyển quyền đã được phê duyệt", emailBody);
                        _logger.LogInformation("[BENCHMARK] Send Email to New Owner took {Time}ms", emailSw.ElapsedMilliseconds);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send transfer approval email to new owner for request {RequestId}", requestId);
                    }
                }

                _logger.LogInformation("[BENCHMARK] Background email sending task completed in {Time}ms", bgSw.ElapsedMilliseconds);
            });

            _logger.LogInformation("[BENCHMARK] Return Response took {Time}ms", stepSw.ElapsedMilliseconds);
            _logger.LogInformation("[BENCHMARK] ApproveRequestAsync TOTAL execution took {Time}ms", totalSw.ElapsedMilliseconds);

            return approveResult;
        }

        public async Task<(bool success, string message)> RejectRequestAsync(
            int adminAccountId, int requestId, string rejectReason)
        {
            var totalSw = System.Diagnostics.Stopwatch.StartNew();
            var stepSw = System.Diagnostics.Stopwatch.StartNew();

            if (string.IsNullOrWhiteSpace(rejectReason))
            {
                return (false, "Lý do từ chối là bắt buộc.");
            }

            // Load Request
            var request = await _context.OwnershipTransferRequests
                .Include(r => r.Vehicle)
                .Include(r => r.RequestedCustomer)
                    .ThenInclude(rc => rc.Account)
                .FirstOrDefaultAsync(r => r.TransferRequestId == requestId);

            _logger.LogInformation("[BENCHMARK] Load Request took {Time}ms", stepSw.ElapsedMilliseconds);
            stepSw.Restart();

            if (request == null)
            {
                return (false, "Yêu cầu chuyển quyền không tồn tại.");
            }

            // Validation
            if (request.Status != OwnershipTransferStatus.Pending)
            {
                return (false, "Yêu cầu đã được xử lý.");
            }

            _logger.LogInformation("[BENCHMARK] Validation took {Time}ms", stepSw.ElapsedMilliseconds);
            stepSw.Restart();

            var strategy = _context.Database.CreateExecutionStrategy();
            var rejectResult = await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    DateTime now = DateTime.Now;
                    request.Status = OwnershipTransferStatus.Rejected;
                    request.ReviewedBy = adminAccountId;
                    request.ReviewedAt = now;
                    request.RejectReason = rejectReason;

                    // SaveChangesAsync
                    var saveChangesSw = System.Diagnostics.Stopwatch.StartNew();
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("[BENCHMARK] SaveChangesAsync took {Time}ms", saveChangesSw.ElapsedMilliseconds);

                    // CommitAsync
                    var commitSw = System.Diagnostics.Stopwatch.StartNew();
                    await transaction.CommitAsync();
                    _logger.LogInformation("[BENCHMARK] CommitAsync took {Time}ms", commitSw.ElapsedMilliseconds);

                    // Send in-app notification to requester
                    try
                    {
                        var notif = new Notification
                        {
                            CustomerId = request.RequestedCustomerId,
                            Title = "Yêu cầu chuyển quyền bị từ chối",
                            Message = $"Lý do: {rejectReason}",
                            Type = "OwnershipTransfer",
                            IsRead = false,
                            CreatedAt = now
                        };
                        _context.Notifications.Add(notif);
                        await _context.SaveChangesAsync();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send rejection in-app notification for request {RequestId}", requestId);
                    }

                    // Log audit trail using ILogger
                    _logger.LogInformation("Rejected ownership transfer: License Plate={LicensePlate}, Old Owner={OldOwner}, New Owner={NewOwner}, Admin={Admin}, Rejected Time={RejectedTime}, Reject Reason={RejectReason}, Result=Rejected",
                        request.Vehicle?.LicensePlate, request.CurrentOwnerCustomerId, request.RequestedCustomerId, adminAccountId, now, rejectReason);

                    return (true, "Từ chối yêu cầu chuyển quyền phương tiện thành công.");
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Transaction failed for rejecting ownership transfer request {RequestId}", requestId);
                    throw;
                }
            });

            // Capture data for background email to prevent DbContext thread access issues
            string? requesterEmail = request.RequestedCustomer?.Account?.Email;
            string? requesterName = request.RequestedCustomer?.Account?.FullName;
            string licensePlate = request.Vehicle?.LicensePlate ?? "Unknown";
            string brand = request.Vehicle?.Brand ?? "Unknown";
            string model = request.Vehicle?.Model ?? "Unknown";
            string dateStr = DateTime.Now.ToString("dd/MM/yyyy HH:mm");

            // Send email notification in the background
            _ = Task.Run(async () =>
            {
                var bgSw = System.Diagnostics.Stopwatch.StartNew();
                if (!string.IsNullOrEmpty(requesterEmail))
                {
                    try
                    {
                        var emailSw = System.Diagnostics.Stopwatch.StartNew();
                        string emailBody = GetTransferEmailBody(
                            requesterName ?? "Khách hàng",
                            licensePlate,
                            brand,
                            model,
                            "Từ chối",
                            "Ngày xử lý",
                            dateStr,
                            "Yêu cầu chuyển quyền bị từ chối",
                            "Thông tin chi tiết yêu cầu",
                            "#fca5a5",
                            "#fef2f2",
                            "<p>Yêu cầu chuyển nhượng xe của bạn đã bị Quản trị viên từ chối do thông tin đính kèm chưa hợp lệ hoặc thiếu chứng minh sở hữu.</p>",
                            rejectReason
                        );

                        await _otpService.SendEmailAsync(requesterEmail, "[AutoWash Pro] Yêu cầu chuyển quyền bị từ chối", emailBody);
                        _logger.LogInformation("[BENCHMARK] Send Email to New Owner took {Time}ms", emailSw.ElapsedMilliseconds);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send transfer rejection email to requester {RequesterId} for request {RequestId}", request.RequestedCustomerId, requestId);
                    }
                }

                _logger.LogInformation("[BENCHMARK] Background email sending task completed in {Time}ms", bgSw.ElapsedMilliseconds);
            });

            _logger.LogInformation("[BENCHMARK] Return Response took {Time}ms", stepSw.ElapsedMilliseconds);
            _logger.LogInformation("[BENCHMARK] RejectRequestAsync TOTAL execution took {Time}ms", totalSw.ElapsedMilliseconds);

            return rejectResult;
        }

        public async Task<OwnershipTransferDocument?> GetDocumentAsync(int documentId)
        {
            return await _context.OwnershipTransferDocuments
                .FirstOrDefaultAsync(d => d.DocumentId == documentId);
        }

        public async Task<object> GetVehicleOwnershipHistoryAsync(int vehicleId)
        {
            var history = await _context.VehicleOwnershipHistories
                .Include(h => h.Customer)
                    .ThenInclude(c => c.Account)
                .Where(h => h.VehicleId == vehicleId)
                .OrderBy(h => h.FromDate)
                .Select(h => new
                {
                    historyId = h.HistoryId,
                    customerName = h.Customer.Account.FullName,
                    email = h.Customer.Account.Email,
                    fromDate = h.FromDate,
                    toDate = h.ToDate,
                    transferType = h.TransferType,
                    oldOwnerId = h.OldOwnerId,
                    newOwnerId = h.NewOwnerId,
                    approvedBy = h.ApprovedBy,
                    approvedAt = h.ApprovedAt
                })
                .ToListAsync();

            return history;
        }

        private string GetTransferEmailBody(
            string customerName, 
            string licensePlate, 
            string brand, 
            string model, 
            string status, 
            string dateLabel, 
            string dateValue, 
            string titleText, 
            string alertTitle, 
            string alertColor, 
            string alertBg, 
            string mainContentHtml, 
            string? rejectReason = null)
        {
            string rejectReasonSection = "";
            if (!string.IsNullOrEmpty(rejectReason))
            {
                rejectReasonSection = $@"
                <div style='background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 12px; margin-top: 16px; color: #991b1b; font-size: 14px;'>
                    <strong>Lý do từ chối:</strong> {rejectReason}
                </div>";
            }

            return $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"">
  <div style=""background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 24px; text-align: center;"">
    <h1 style=""color: #0ea5e9; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;"">AutoWash Pro</h1>
  </div>
  <div style=""padding: 24px; background-color: #ffffff; color: #334155;"">
    <h2 style=""color: #1e293b; margin-top: 0; font-size: 20px; font-weight: bold; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;"">{titleText}</h2>
    <p>Xin chào <strong>{customerName}</strong>,</p>
    {mainContentHtml}

    <div style=""background: {alertBg}; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid {alertColor};"">
      <h3 style=""margin: 0 0 12px 0; color: #0f172a; font-size: 15px; font-weight: bold; text-align: center;"">{alertTitle}</h3>
      <table style=""width: 100%; border-collapse: collapse; font-size: 13px;"">
        <tr>
          <td style=""padding: 6px 0; color: #64748b; width: 40%;"">Biển số xe:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold;"">{licensePlate}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b;"">Hãng xe / Dòng xe:</td>
          <td style=""padding: 6px 0; color: #0f172a;"">{brand} {model}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b;"">{dateLabel}:</td>
          <td style=""padding: 6px 0; color: #0f172a;"">{dateValue}</td>
        </tr>
        <tr>
          <td style=""padding: 6px 0; color: #64748b;"">Trạng thái:</td>
          <td style=""padding: 6px 0; color: #0f172a; font-weight: bold;"">{status}</td>
        </tr>
      </table>
      {rejectReasonSection}
    </div>

    <p style=""color: #0284c7; font-weight: bold; text-align: center; margin-top: 24px;"">Cảm ơn bạn đã luôn đồng hành cùng AutoWash Pro!</p>
  </div>
  <div style=""background-color: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;"">
    Đây là email tự động từ hệ thống AutoWash Pro. Vui lòng không trả lời trực tiếp email này.
  </div>
</div>";
        }
    }
}
