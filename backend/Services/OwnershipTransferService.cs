using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Helpers;

namespace Auto_Wash.Services
{
    public class OcrVerificationResult
    {
        public bool OcrVerified { get; set; }
        public string? DetectedPlate { get; set; }
        public bool VehicleExists { get; set; }
        public bool ActiveRequestExists { get; set; }
        public bool OtpSent { get; set; }
        public string? Message { get; set; }
        // Vehicle info for transfer mode
        public string? Brand { get; set; }
        public string? Model { get; set; }
        public string? VehicleClass { get; set; }
    }

    public class OwnershipTransferService
    {
        private readonly AutoWashDbContext _context;
        private readonly IOcrService _ocrService;
        private readonly OtpService _otpService;

        public OwnershipTransferService(AutoWashDbContext context, IOcrService ocrService, OtpService otpService)
        {
            _context = context;
            _ocrService = ocrService;
            _otpService = otpService;
        }

        public async Task<bool> IsVehicleLockedAsync(int vehicleId)
        {
            return await _context.OwnershipTransferRequests
                .AnyAsync(r => r.VehicleId == vehicleId && 
                               (r.Status == OwnershipTransferStatus.PendingAdminApproval || 
                                r.Status == OwnershipTransferStatus.PendingAdminReview));
        }

        public async Task<OcrVerificationResult> VerifyImageOcrAndCheckExistsAsync(
            int customerId, string licensePlate, string registrationImageUrl)
        {
            string normPlate = LicensePlateHelper.Normalize(licensePlate);
            if (!LicensePlateHelper.IsValidVietnameseLicensePlate(normPlate))
            {
                return new OcrVerificationResult
                {
                    OcrVerified = false,
                    Message = "Biển số xe không hợp lệ hoặc đầu số tỉnh thành không tồn tại!"
                };
            }

            var (ocrSuccess, ocrPlate, ocrMessage) = await _ocrService.PerformOcrAsync(registrationImageUrl, normPlate);
            if (!ocrSuccess)
            {
                string msg = ocrMessage.Contains("Unable to detect a valid license plate from the uploaded image")
                    ? "Unable to detect a valid license plate from the uploaded image."
                    : ocrMessage;

                return new OcrVerificationResult
                {
                    OcrVerified = false,
                    Message = msg
                };
            }

            string normOcrPlate = LicensePlateHelper.Normalize(ocrPlate);
            if (normOcrPlate != normPlate)
            {
                return new OcrVerificationResult
                {
                    OcrVerified = false,
                    DetectedPlate = ocrPlate,
                    Message = "The license plate detected from the image does not match the entered plate."
                };
            }

            bool exists = await _context.Vehicles.AnyAsync(v => v.LicensePlate == normPlate);
            if (exists)
            {
                var vehicle = await _context.Vehicles.FirstOrDefaultAsync(v => v.LicensePlate == normPlate);
                bool activeRequestExists = vehicle != null && await _context.OwnershipTransferRequests
                    .AnyAsync(r => r.VehicleId == vehicle.VehicleId && 
                                   (r.Status == OwnershipTransferStatus.PendingOwnerConfirmation ||
                                    r.Status == OwnershipTransferStatus.PendingAdminApproval ||
                                    r.Status == OwnershipTransferStatus.PendingAdminReview));

                return new OcrVerificationResult
                {
                    OcrVerified = true,
                    DetectedPlate = ocrPlate,
                    VehicleExists = true,
                    ActiveRequestExists = activeRequestExists,
                    Brand = vehicle?.Brand,
                    Model = vehicle?.Model,
                    VehicleClass = vehicle?.VehicleClass,
                    Message = activeRequestExists 
                        ? "An ownership transfer request for this vehicle is already being processed."
                        : "This vehicle is already linked to another customer account."
                };
            }

            // Generate OTP for registration
            var customer = await _context.Customers
                .Include(c => c.Account)
                .FirstOrDefaultAsync(c => c.CustomerId == customerId);

            if (customer?.Account == null || string.IsNullOrEmpty(customer.Account.Email))
            {
                return new OcrVerificationResult
                {
                    OcrVerified = true,
                    DetectedPlate = ocrPlate,
                    VehicleExists = false,
                    OtpSent = false,
                    Message = "Không tìm thấy địa chỉ email của khách hàng."
                };
            }

            string otpCode;
            try
            {
                otpCode = await _otpService.GenerateAndSaveOtpAsync(customer.Account.Email, "VehicleRegistration", normPlate);
            }
            catch (Exception ex)
            {
                return new OcrVerificationResult
                {
                    OcrVerified = true,
                    DetectedPlate = ocrPlate,
                    VehicleExists = false,
                    OtpSent = false,
                    Message = $"Lỗi tạo mã OTP: {ex.Message}"
                };
            }

            // Send OTP email
            try
            {
                string emailSubject = "[AutoWash Pro] Mã OTP đăng ký phương tiện";
                string emailBody = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);'>
                      <div style='background-color: #0f172a; padding: 24px; text-align: center;'>
                        <h1 style='color: #0ea5e9; margin: 0; font-size: 24px; font-weight: bold;'>AutoWash Pro</h1>
                      </div>
                      <div style='padding: 24px; background-color: #ffffff; color: #334155;'>
                        <h2 style='color: #1e293b; margin-top: 0; font-size: 20px; font-weight: bold;'>Xác thực đăng ký phương tiện</h2>
                        <p>Xin chào <strong>{customer.Account.FullName}</strong>,</p>
                        <p>Chúng tôi đã nhận được yêu cầu đăng ký phương tiện mới với biển số <strong>{licensePlate}</strong>.</p>
                        <p>Vui lòng nhập mã OTP sau để hoàn tất quá trình xác thực:</p>
                        <div style='background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0ea5e9; border-radius: 8px; margin: 20px 0;'>
                          {otpCode}
                        </div>
                        <p style='color: #64748b; font-size: 14px;'>Mã OTP này có hiệu lực trong vòng 5 phút.</p>
                      </div>
                      <div style='background-color: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;'>
                        Đây là email tự động. Vui lòng không trả lời email này.
                      </div>
                    </div>";

                await _otpService.SendEmailAsync(customer.Account.Email, emailSubject, emailBody);
            }
            catch (Exception ex)
            {
                return new OcrVerificationResult
                {
                    OcrVerified = true,
                    DetectedPlate = ocrPlate,
                    VehicleExists = false,
                    OtpSent = false,
                    Message = ex.Message
                };
            }

            return new OcrVerificationResult
            {
                OcrVerified = true,
                DetectedPlate = ocrPlate,
                VehicleExists = false,
                OtpSent = true,
                Message = "OCR Verification Passed. OTP sent to your email."
            };
        }

        public async Task<(bool success, string message, int? vehicleId)> RegisterVehicleOcrAsync(
            int customerId, string licensePlate, string brand, string model, string vehicleClass, string registrationImageUrl, string otpCode)
        {
            string normPlate = LicensePlateHelper.Normalize(licensePlate);
            if (!LicensePlateHelper.IsValidVietnameseLicensePlate(normPlate))
            {
                return (false, "Biển số xe không hợp lệ hoặc đầu số tỉnh thành không tồn tại!", null);
            }

            var customer = await _context.Customers
                .Include(c => c.Account)
                .FirstOrDefaultAsync(c => c.CustomerId == customerId);

            if (customer?.Account == null || string.IsNullOrEmpty(customer.Account.Email))
            {
                return (false, "Không tìm thấy thông tin tài khoản khách hàng.", null);
            }

            // Verify OTP
            bool isOtpValid = await _otpService.VerifyOtpAsync(customer.Account.Email, otpCode, "VehicleRegistration", normPlate);
            if (!isOtpValid)
            {
                return (false, "Mã OTP không chính xác hoặc đã hết hạn.", null);
            }

            bool exists = await _context.Vehicles.AnyAsync(v => v.LicensePlate == normPlate);
            if (exists)
            {
                return (false, "Biển số xe này đã tồn tại trên hệ thống. Vui lòng sử dụng chức năng chuyển nhượng.", null);
            }

            var vehicle = new Vehicle
            {
                CustomerId = customerId,
                LicensePlate = normPlate,
                Brand = brand.Trim(),
                Model = model.Trim(),
                VehicleClass = vehicleClass.Trim(),
                RegistrationImageUrl = registrationImageUrl,
                RegisteredAt = DateTime.Now
            };

            _context.Vehicles.Add(vehicle);
            await _context.SaveChangesAsync();

            var history = new VehicleOwnershipHistory
            {
                VehicleId = vehicle.VehicleId,
                CustomerId = customerId,
                FromDate = DateTime.Now,
                ToDate = null,
                TransferType = "InitialRegistration",
                TransferRequestId = null
            };

            _context.VehicleOwnershipHistories.Add(history);
            await _context.SaveChangesAsync();

            // Send in-app notification
            try
            {
                var notification = new Notification
                {
                    CustomerId = customerId,
                    Title = "Đăng ký xe thành công",
                    Message = $"Chúc mừng! Xe {licensePlate} ({brand} {model}) đã được đăng ký thành công vào garage của bạn.",
                    Type = "InitialRegistration",
                    IsRead = false,
                    CreatedAt = DateTime.Now
                };
                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[NOTIFICATION ERROR] Failed to send registration notification: {ex.Message}");
            }

            // Send email
            try
            {
                string emailSubject = "Vehicle Registration Successful";
                string emailBody = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);'>
                      <div style='background-color: #0f172a; padding: 24px; text-align: center;'>
                        <h1 style='color: #0ea5e9; margin: 0; font-size: 24px; font-weight: bold;'>AutoWash Pro</h1>
                      </div>
                      <div style='padding: 24px; background-color: #ffffff; color: #334155;'>
                        <h2 style='color: #1e293b; margin-top: 0; font-size: 20px; font-weight: bold;'>Vehicle Registration Successful</h2>
                        <p>Xin chào <strong>{customer.Account.FullName}</strong>,</p>
                        <p>Chúc mừng bạn đã đăng ký phương tiện mới thành công trên hệ thống AutoWash Pro. Chi tiết phương tiện của bạn:</p>
                        <table style='width: 100%; border-collapse: collapse; margin-top: 15px;'>
                          <tr style='border-bottom: 1px solid #f1f5f9;'>
                            <td style='padding: 10px 0; color: #64748b; font-weight: bold;'>Tên khách hàng:</td>
                            <td style='padding: 10px 0; color: #1e293b; text-align: right;'>{customer.Account.FullName}</td>
                          </tr>
                          <tr style='border-bottom: 1px solid #f1f5f9;'>
                            <td style='padding: 10px 0; color: #64748b; font-weight: bold;'>Biển số xe:</td>
                            <td style='padding: 10px 0; color: #1e293b; text-align: right; font-family: monospace; font-weight: bold;'>{licensePlate}</td>
                          </tr>
                          <tr style='border-bottom: 1px solid #f1f5f9;'>
                            <td style='padding: 10px 0; color: #64748b; font-weight: bold;'>Hãng xe:</td>
                            <td style='padding: 10px 0; color: #1e293b; text-align: right;'>{brand}</td>
                          </tr>
                          <tr style='border-bottom: 1px solid #f1f5f9;'>
                            <td style='padding: 10px 0; color: #64748b; font-weight: bold;'>Model:</td>
                            <td style='padding: 10px 0; color: #1e293b; text-align: right;'>{model}</td>
                          </tr>
                          <tr style='border-bottom: 1px solid #f1f5f9;'>
                            <td style='padding: 10px 0; color: #64748b; font-weight: bold;'>Phân khúc xe:</td>
                            <td style='padding: 10px 0; color: #1e293b; text-align: right;'>{vehicleClass}</td>
                          </tr>
                          <tr>
                            <td style='padding: 10px 0; color: #64748b; font-weight: bold;'>Ngày đăng ký:</td>
                            <td style='padding: 10px 0; color: #1e293b; text-align: right;'>{DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss")}</td>
                          </tr>
                        </table>
                      </div>
                      <div style='background-color: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;'>
                        Đây là email tự động. Vui lòng không trả lời email này.
                      </div>
                    </div>";

                await _otpService.SendEmailAsync(customer.Account.Email, emailSubject, emailBody);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EMAIL ERROR] Failed to send registration success email: {ex.Message}");
            }

            return (true, "Đăng ký phương tiện mới thành công!", vehicle.VehicleId);
        }

        public async Task<(bool success, string message)> SendTransferOtpForExistingVehicleAsync(int customerId, string licensePlate)
        {
            string normPlate = LicensePlateHelper.Normalize(licensePlate);
            var customer = await _context.Customers
                .Include(c => c.Account)
                .FirstOrDefaultAsync(c => c.CustomerId == customerId);

            if (customer?.Account == null || string.IsNullOrEmpty(customer.Account.Email))
            {
                return (false, "Không tìm thấy địa chỉ email của khách hàng.");
            }

            string otpCode;
            try
            {
                otpCode = await _otpService.GenerateAndSaveOtpAsync(customer.Account.Email, "VehicleRegistration", normPlate);
            }
            catch (Exception ex)
            {
                return (false, $"Lỗi tạo mã OTP: {ex.Message}");
            }

            try
            {
                string emailSubject = "[AutoWash Pro] Mã OTP yêu cầu chuyển nhượng xe";
                string emailBody = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);'>
                      <div style='background-color: #0f172a; padding: 24px; text-align: center;'>
                        <h1 style='color: #0ea5e9; margin: 0; font-size: 24px; font-weight: bold;'>AutoWash Pro</h1>
                      </div>
                      <div style='padding: 24px; background-color: #ffffff; color: #334155;'>
                        <h2 style='color: #1e293b; margin-top: 0; font-size: 20px; font-weight: bold;'>Xác thực yêu cầu chuyển nhượng xe</h2>
                        <p>Xin chào <strong>{customer.Account.FullName}</strong>,</p>
                        <p>Chúng tôi đã nhận được yêu cầu chuyển nhượng quyền sở hữu phương tiện với biển số <strong>{licensePlate}</strong>.</p>
                        <p>Vui lòng nhập mã OTP sau để hoàn tất quá trình xác thực:</p>
                        <div style='background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0ea5e9; border-radius: 8px; margin: 20px 0;'>
                          {otpCode}
                        </div>
                        <p style='color: #64748b; font-size: 14px;'>Mã OTP này có hiệu lực trong vòng 5 phút.</p>
                      </div>
                      <div style='background-color: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;'>
                        Đây là email tự động. Vui lòng không trả lời email này.
                      </div>
                    </div>";

                await _otpService.SendEmailAsync(customer.Account.Email, emailSubject, emailBody);
            }
            catch (Exception ex)
            {
                return (false, $"Lỗi gửi email: {ex.Message}");
            }

            return (true, "Mã OTP đã được gửi đến email của bạn.");
        }

        public async Task<(bool success, string message, int? requestId)> CreateTransferRequestAsync(
            int requestedCustomerId, string licensePlate, string registrationImageUrl, string? reason, string otpCode)
        {
            string normPlate = LicensePlateHelper.Normalize(licensePlate);
            var customer = await _context.Customers
                .Include(c => c.Account)
                .FirstOrDefaultAsync(c => c.CustomerId == requestedCustomerId);

            if (customer?.Account == null || string.IsNullOrEmpty(customer.Account.Email))
            {
                return (false, "Không tìm thấy thông tin tài khoản khách hàng.", null);
            }

            // Verify OTP
            bool isOtpValid = await _otpService.VerifyOtpAsync(customer.Account.Email, otpCode, "VehicleRegistration", normPlate);
            if (!isOtpValid)
            {
                return (false, "Mã OTP không chính xác hoặc đã hết hạn.", null);
            }

            var vehicle = await _context.Vehicles
                .Include(v => v.Customer)
                    .ThenInclude(c => c.Account)
                .FirstOrDefaultAsync(v => v.LicensePlate == normPlate);

            if (vehicle == null)
            {
                return (false, "Không tìm thấy phương tiện tương ứng trên hệ thống để thực hiện yêu cầu chuyển nhượng sở hữu.", null);
            }

            if (vehicle.CustomerId == requestedCustomerId)
            {
                return (false, "Phương tiện này đã thuộc quyền sở hữu của bạn.", null);
            }

            // Strong Duplicate Protection Check
            bool activeRequestExists = await _context.OwnershipTransferRequests
                .AnyAsync(r => r.VehicleId == vehicle.VehicleId && 
                               (r.Status == OwnershipTransferStatus.PendingOwnerConfirmation ||
                                r.Status == OwnershipTransferStatus.PendingAdminApproval ||
                                r.Status == OwnershipTransferStatus.PendingAdminReview));
            if (activeRequestExists)
            {
                return (false, "Xe này đang có một yêu cầu chuyển nhượng hoạt động khác. Không thể tạo yêu cầu mới.", null);
            }

            bool customerHasActiveRequest = await _context.OwnershipTransferRequests
                .AnyAsync(r => r.RequestedCustomerId == requestedCustomerId && 
                               r.VehicleId == vehicle.VehicleId &&
                               (r.Status == OwnershipTransferStatus.PendingOwnerConfirmation ||
                                r.Status == OwnershipTransferStatus.PendingAdminApproval ||
                                r.Status == OwnershipTransferStatus.PendingAdminReview));
            if (customerHasActiveRequest)
            {
                return (false, "Bạn đã gửi một yêu cầu chuyển nhượng cho xe này rồi và đang chờ xử lý.", null);
            }

            var (ocrSuccess, ocrPlate, ocrMessage) = await _ocrService.PerformOcrAsync(registrationImageUrl, normPlate);
            if (!ocrSuccess)
            {
                return (false, $"Nhận diện thất bại: {ocrMessage}", null);
            }

            if (LicensePlateHelper.Normalize(ocrPlate) != normPlate)
            {
                return (false, $"Biển số nhận diện từ giấy đăng ký ({ocrPlate}) không trùng khớp với biển số nhập vào ({licensePlate}).", null);
            }

            var request = new OwnershipTransferRequest
            {
                VehicleId = vehicle.VehicleId,
                CurrentOwnerCustomerId = vehicle.CustomerId,
                RequestedCustomerId = requestedCustomerId,
                RegistrationImageUrl = registrationImageUrl,
                OcrPlate = ocrPlate,
                Status = OwnershipTransferStatus.PendingOwnerConfirmation,
                OwnerDecision = "Pending",
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
                Reason = reason
            };

            _context.OwnershipTransferRequests.Add(request);
            await _context.SaveChangesAsync();

            // Send Notifications to Current Owner
            try
            {
                var requestingCustomer = await _context.Customers
                    .Include(c => c.Account)
                    .FirstOrDefaultAsync(c => c.CustomerId == requestedCustomerId);
                string reqName = requestingCustomer?.Account?.FullName ?? "Một khách hàng";
                string actionUrl = "/customer/vehicles?tab=requests";

                var notification = new Notification
                {
                    CustomerId = vehicle.CustomerId,
                    Title = "Yêu cầu chuyển nhượng sở hữu xe",
                    Message = $"{reqName} đã gửi yêu cầu chuyển quyền sở hữu xe {vehicle.LicensePlate} của bạn. Vui lòng xác nhận tại: {actionUrl}",
                    Type = "OwnershipTransfer",
                    IsRead = false,
                    CreatedAt = DateTime.Now
                };
                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();

                if (vehicle.Customer?.Account != null && !string.IsNullOrEmpty(vehicle.Customer.Account.Email))
                {
                    string emailSubject = "[AutoWash Pro] Yêu cầu chuyển nhượng quyền sở hữu xe";
                    string emailBody = $@"
                        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);'>
                          <div style='background-color: #0f172a; padding: 24px; text-align: center;'>
                            <h1 style='color: #0ea5e9; margin: 0; font-size: 24px; font-weight: bold;'>AutoWash Pro</h1>
                          </div>
                          <div style='padding: 24px; background-color: #ffffff; color: #334155;'>
                            <h2 style='color: #1e293b; margin-top: 0; font-size: 20px; font-weight: bold;'>Yêu cầu chuyển nhượng sở hữu xe</h2>
                            <p>Xin chào <strong>{vehicle.Customer.Account.FullName}</strong>,</p>
                            <p>Khách hàng <strong>{reqName}</strong> đã gửi yêu cầu chuyển nhượng quyền sở hữu xe biển số <strong>{vehicle.LicensePlate}</strong> của bạn.</p>
                            <p>Vui lòng đăng nhập vào ứng dụng AutoWash Pro và truy cập trang quản lý phương tiện để phê duyệt hoặc từ chối yêu cầu này.</p>
                            <p style='margin-top: 25px; text-align: center;'>
                              <a href='http://localhost:5173/customer/vehicles?tab=requests' style='background-color: #0ea5e9; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;'>Xử lý yêu cầu</a>
                            </p>
                          </div>
                          <div style='background-color: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;'>
                            Đây là email tự động. Vui lòng không trả lời email này.
                          </div>
                        </div>";

                    await _otpService.SendEmailAsync(vehicle.Customer.Account.Email, emailSubject, emailBody);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[NOTIFICATION ERROR] Failed to notify owner: {ex.Message}");
            }

            return (true, "Yêu cầu chuyển nhượng đã được gửi đi và đang chờ chủ sở hữu hiện tại xác nhận.", request.TransferRequestId);
        }

        public async Task<(bool success, string message)> CancelTransferRequestAsync(int customerId, int requestId)
        {
            var request = await _context.OwnershipTransferRequests
                .FirstOrDefaultAsync(r => r.TransferRequestId == requestId);

            if (request == null)
            {
                return (false, "Yêu cầu chuyển nhượng không tồn tại.");
            }

            if (request.RequestedCustomerId != customerId)
            {
                return (false, "Bạn không có quyền hủy yêu cầu chuyển nhượng này.");
            }

            if (request.Status != OwnershipTransferStatus.PendingOwnerConfirmation)
            {
                return (false, "Yêu cầu này đã được phản hồi hoặc chuyển sang Admin xử lý, không thể tự hủy.");
            }

            request.Status = OwnershipTransferStatus.Cancelled;
            request.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return (true, "Đã hủy yêu cầu chuyển nhượng thành công.");
        }

        public async Task<(bool success, string message)> ConfirmTransferRequestAsync(
            int currentOwnerCustomerId, int requestId, string decision)
        {
            var request = await _context.OwnershipTransferRequests
                .Include(r => r.Vehicle)
                .Include(r => r.RequestedCustomer)
                    .ThenInclude(rc => rc.Account)
                .FirstOrDefaultAsync(r => r.TransferRequestId == requestId);

            if (request == null)
            {
                return (false, "Yêu cầu chuyển nhượng không tồn tại.");
            }

            if (request.CurrentOwnerCustomerId != currentOwnerCustomerId)
            {
                return (false, "Bạn không có quyền quyết định cho yêu cầu chuyển nhượng này.");
            }

            if (request.Status != OwnershipTransferStatus.PendingOwnerConfirmation)
            {
                return (false, "Yêu cầu chuyển nhượng này đã được xử lý hoặc đã hết hạn phản hồi.");
            }

            DateTime now = DateTime.Now;
            request.OwnerConfirmedAt = now;
            request.UpdatedAt = now;

            if (decision.Equals("Approve", StringComparison.OrdinalIgnoreCase))
            {
                request.Status = OwnershipTransferStatus.PendingAdminApproval;
                request.OwnerDecision = "Approved";

                try
                {
                    string actionUrl = "/customer/vehicles?tab=requests";
                    var notif = new Notification
                    {
                        CustomerId = request.RequestedCustomerId,
                        Title = "Chủ xe đã đồng ý chuyển nhượng sở hữu",
                        Message = $"Chủ xe đã đồng ý yêu cầu chuyển nhượng xe {request.Vehicle.LicensePlate}. Yêu cầu hiện tại đang chờ Quản trị viên duyệt: {actionUrl}",
                        Type = "OwnershipTransfer",
                        IsRead = false,
                        CreatedAt = now
                    };
                    _context.Notifications.Add(notif);
                    await _context.SaveChangesAsync();

                    if (request.RequestedCustomer?.Account != null && !string.IsNullOrEmpty(request.RequestedCustomer.Account.Email))
                    {
                        string emailSubject = "[AutoWash Pro] Chủ xe đã đồng ý yêu cầu chuyển nhượng xe";
                        string emailBody = $@"
                            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);'>
                              <div style='background-color: #0f172a; padding: 24px; text-align: center;'>
                                <h1 style='color: #0ea5e9; margin: 0; font-size: 24px; font-weight: bold;'>AutoWash Pro</h1>
                              </div>
                              <div style='padding: 24px; background-color: #ffffff; color: #334155;'>
                                <h2 style='color: #1e293b; margin-top: 0; font-size: 20px; font-weight: bold;'>Chủ xe đã đồng ý chuyển nhượng xe</h2>
                                <p>Xin chào <strong>{request.RequestedCustomer.Account.FullName}</strong>,</p>
                                <p>Chủ sở hữu hiện tại của xe biển số <strong>{request.Vehicle.LicensePlate}</strong> đã đồng ý với yêu cầu chuyển nhượng sở hữu của bạn.</p>
                                <p>Yêu cầu hiện đã được chuyển tới Ban Quản Trị để xét duyệt lần cuối.</p>
                              </div>
                              <div style='background-color: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;'>
                                Đây là email tự động. Vui lòng không trả lời email này.
                              </div>
                            </div>";
                        await _otpService.SendEmailAsync(request.RequestedCustomer.Account.Email, emailSubject, emailBody);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[EMAIL ERROR] Failed to send owner approval notification/email: {ex.Message}");
                }

                return (true, "Đồng ý chuyển nhượng sở hữu thành công. Yêu cầu đã được chuyển tới Quản trị viên để xét duyệt cuối cùng.");
            }
            else if (decision.Equals("Reject", StringComparison.OrdinalIgnoreCase))
            {
                request.Status = OwnershipTransferStatus.Rejected;
                request.OwnerDecision = "Rejected";

                try
                {
                    string actionUrl = "/customer/vehicles?tab=requests";
                    var notif = new Notification
                    {
                        CustomerId = request.RequestedCustomerId,
                        Title = "Yêu cầu chuyển nhượng xe bị từ chối",
                        Message = $"Chủ sở hữu hiện tại của xe {request.Vehicle.LicensePlate} đã từ chối yêu cầu chuyển nhượng của bạn. Chi tiết: {actionUrl}",
                        Type = "OwnershipTransfer",
                        IsRead = false,
                        CreatedAt = now
                    };
                    _context.Notifications.Add(notif);
                    await _context.SaveChangesAsync();

                    if (request.RequestedCustomer?.Account != null && !string.IsNullOrEmpty(request.RequestedCustomer.Account.Email))
                    {
                        string emailSubject = "[AutoWash Pro] Yêu cầu chuyển nhượng xe bị từ chối";
                        string emailBody = $@"
                            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);'>
                              <div style='background-color: #0f172a; padding: 24px; text-align: center;'>
                                <h1 style='color: #0ea5e9; margin: 0; font-size: 24px; font-weight: bold;'>AutoWash Pro</h1>
                              </div>
                              <div style='padding: 24px; background-color: #ffffff; color: #334155;'>
                                <h2 style='color: #1e293b; margin-top: 0; font-size: 20px; font-weight: bold;'>Yêu cầu chuyển nhượng bị từ chối</h2>
                                <p>Xin chào <strong>{request.RequestedCustomer.Account.FullName}</strong>,</p>
                                <p>Chủ sở hữu hiện tại của xe biển số <strong>{request.Vehicle.LicensePlate}</strong> đã từ chối yêu cầu chuyển nhượng sở hữu của bạn.</p>
                              </div>
                              <div style='background-color: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;'>
                                Đây là email tự động. Vui lòng không trả lời email này.
                              </div>
                            </div>";
                        await _otpService.SendEmailAsync(request.RequestedCustomer.Account.Email, emailSubject, emailBody);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[EMAIL ERROR] Failed to send owner rejection notification/email: {ex.Message}");
                }

                return (true, "Từ chối chuyển nhượng sở hữu thành công.");
            }

            return (false, "Hành động của chủ xe không hợp lệ.");
        }

        public async Task<(bool success, string message)> ProcessAdminRequestAsync(
            int adminAccountId, int requestId, bool approve, string? adminReason)
        {
            var request = await _context.OwnershipTransferRequests
                .Include(r => r.Vehicle)
                    .ThenInclude(v => v.Customer)
                        .ThenInclude(c => c.Account)
                .Include(r => r.RequestedCustomer)
                    .ThenInclude(rc => rc.Account)
                .FirstOrDefaultAsync(r => r.TransferRequestId == requestId);

            if (request == null)
            {
                return (false, "Yêu cầu chuyển nhượng không tồn tại.");
            }

            DateTime now = DateTime.Now;

            if (!approve)
            {
                request.Status = OwnershipTransferStatus.Rejected;
                request.ApprovedBy = adminAccountId;
                request.ApprovedAt = now;
                request.UpdatedAt = now;
                request.Reason = adminReason ?? "Quản trị viên từ chối.";

                await _context.SaveChangesAsync();

                try
                {
                    string actionUrl = "/customer/vehicles?tab=requests";
                    var notif = new Notification
                    {
                        CustomerId = request.RequestedCustomerId,
                        Title = "Yêu cầu chuyển nhượng bị Admin từ chối",
                        Message = $"Quản trị viên đã từ chối yêu cầu chuyển nhượng xe {request.Vehicle.LicensePlate}. Lý do: {request.Reason}. Xem tại: {actionUrl}",
                        Type = "OwnershipTransfer",
                        IsRead = false,
                        CreatedAt = now
                    };
                    _context.Notifications.Add(notif);
                    await _context.SaveChangesAsync();

                    if (request.RequestedCustomer?.Account != null && !string.IsNullOrEmpty(request.RequestedCustomer.Account.Email))
                    {
                        string emailSubject = "[AutoWash Pro] Yêu cầu chuyển nhượng xe bị Admin từ chối";
                        string emailBody = $@"
                            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);'>
                              <div style='background-color: #0f172a; padding: 24px; text-align: center;'>
                                <h1 style='color: #0ea5e9; margin: 0; font-size: 24px; font-weight: bold;'>AutoWash Pro</h1>
                              </div>
                              <div style='padding: 24px; background-color: #ffffff; color: #334155;'>
                                <h2 style='color: #1e293b; margin-top: 0; font-size: 20px; font-weight: bold;'>Yêu cầu chuyển nhượng bị Admin từ chối</h2>
                                <p>Xin chào <strong>{request.RequestedCustomer.Account.FullName}</strong>,</p>
                                <p>Ban Quản Trị đã từ chối yêu cầu chuyển nhượng xe biển số <strong>{request.Vehicle.LicensePlate}</strong> của bạn.</p>
                                <p><strong>Lý do từ chối:</strong> {request.Reason}</p>
                              </div>
                              <div style='background-color: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;'>
                                Đây là email tự động. Vui lòng không trả lời email này.
                              </div>
                            </div>";
                        await _otpService.SendEmailAsync(request.RequestedCustomer.Account.Email, emailSubject, emailBody);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[EMAIL ERROR] Failed to send admin rejection notification/email: {ex.Message}");
                }

                return (true, "Từ chối yêu cầu chuyển nhượng xe thành công.");
            }

            // ── ADMIN APPROVAL VALIDATION ORDER ──

            // 1. Request status is valid
            if (request.Status != OwnershipTransferStatus.PendingAdminApproval && 
                request.Status != OwnershipTransferStatus.PendingAdminReview)
            {
                return (false, "Trạng thái yêu cầu không hợp lệ để duyệt.");
            }

            // 2. Vehicle is still owned by CurrentOwner
            if (request.Vehicle.CustomerId != request.CurrentOwnerCustomerId)
            {
                return (false, "Chủ xe hiện tại trên hệ thống không khớp với thông tin yêu cầu ban đầu.");
            }

            // 3. Vehicle has no active bookings
            bool hasActiveBookings = await _context.Bookings
                .Where(b => b.Status != BookingStatus.Completed && b.Status != BookingStatus.Cancelled && b.Status != BookingStatus.NoShow)
                .AnyAsync(b => b.VehicleId == request.VehicleId);
            if (hasActiveBookings)
            {
                return (false, "Không thể chuyển nhượng xe khi đang có lịch đặt hẹn hoạt động.");
            }

            // 4. Vehicle is not already transferred
            if (request.Vehicle.CustomerId == request.RequestedCustomerId)
            {
                return (false, "Chuyển nhượng không thể thực hiện vì xe đã thuộc sở hữu của khách hàng yêu cầu.");
            }

            // 5. Complete ownership transfer
            request.Status = OwnershipTransferStatus.Approved;
            request.ApprovedBy = adminAccountId;
            request.ApprovedAt = now;
            request.UpdatedAt = now;

            int oldOwnerId = request.Vehicle.CustomerId;
            request.Vehicle.CustomerId = request.RequestedCustomerId;

            // Close previous history record
            var activeHistory = await _context.VehicleOwnershipHistories
                .FirstOrDefaultAsync(h => h.VehicleId == request.VehicleId && h.ToDate == null);
            if (activeHistory != null)
            {
                activeHistory.ToDate = now;
            }

            // Create new ownership history record
            var newHistory = new VehicleOwnershipHistory
            {
                VehicleId = request.VehicleId,
                CustomerId = request.RequestedCustomerId,
                FromDate = now,
                ToDate = null,
                TransferRequestId = request.TransferRequestId,
                TransferType = "OwnershipTransfer"
            };
            _context.VehicleOwnershipHistories.Add(newHistory);

            await _context.SaveChangesAsync();

            // Send in-app notifications
            string actionUrlForNewOwner = "/customer/vehicles?tab=requests";
            try
            {
                var notifNewOwner = new Notification
                {
                    CustomerId = request.RequestedCustomerId,
                    Title = "Yêu cầu chuyển nhượng xe đã duyệt",
                    Message = $"Chúc mừng! Admin đã duyệt chuyển nhượng xe {request.Vehicle.LicensePlate} thành công cho bạn. Xem chi tiết: {actionUrlForNewOwner}",
                    Type = "OwnershipTransfer",
                    IsRead = false,
                    CreatedAt = now
                };
                _context.Notifications.Add(notifNewOwner);
            }
            catch {}

            try
            {
                var notifOldOwner = new Notification
                {
                    CustomerId = oldOwnerId,
                    Title = "Chuyển nhượng xe thành công",
                    Message = $"Xe biển số {request.Vehicle.LicensePlate} của bạn đã được chuyển quyền sở hữu thành công sang khách hàng khác. Chi tiết: {actionUrlForNewOwner}",
                    Type = "OwnershipTransfer",
                    IsRead = false,
                    CreatedAt = now
                };
                _context.Notifications.Add(notifOldOwner);
            }
            catch {}

            await _context.SaveChangesAsync();

            // Send email notifications
            try
            {
                if (request.RequestedCustomer?.Account != null && !string.IsNullOrEmpty(request.RequestedCustomer.Account.Email))
                {
                    string newOwnerEmailBody = $@"
                        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;'>
                          <div style='background-color: #0f172a; padding: 24px; text-align: center;'>
                            <h1 style='color: #0ea5e9; margin: 0;'>AutoWash Pro</h1>
                          </div>
                          <div style='padding: 24px;'>
                            <h2>Chuyển nhượng sở hữu xe thành công</h2>
                            <p>Xin chào <strong>{request.RequestedCustomer.Account.FullName}</strong>,</p>
                            <p>Yêu cầu chuyển nhượng xe biển số <strong>{request.Vehicle.LicensePlate}</strong> của bạn đã được Quản trị viên phê duyệt thành công.</p>
                            <p>Phương tiện này đã được thêm vào Garage xe của bạn.</p>
                          </div>
                        </div>";
                    await _otpService.SendEmailAsync(request.RequestedCustomer.Account.Email, "[AutoWash Pro] Chuyển nhượng sở hữu xe thành công", newOwnerEmailBody);
                }

                if (request.Vehicle?.Customer?.Account != null && !string.IsNullOrEmpty(request.Vehicle.Customer.Account.Email))
                {
                    string oldOwnerEmailBody = $@"
                        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;'>
                          <div style='background-color: #0f172a; padding: 24px; text-align: center;'>
                            <h1 style='color: #0ea5e9; margin: 0;'>AutoWash Pro</h1>
                          </div>
                          <div style='padding: 24px;'>
                            <h2>Chuyển nhượng xe thành công</h2>
                            <p>Xin chào <strong>{request.Vehicle.Customer.Account.FullName}</strong>,</p>
                            <p>Xe biển số <strong>{request.Vehicle.LicensePlate}</strong> của bạn đã được hoàn tất chuyển quyền sở hữu thành công sang khách hàng <strong>{request.RequestedCustomer?.Account?.FullName}</strong>.</p>
                          </div>
                        </div>";
                    await _otpService.SendEmailAsync(request.Vehicle.Customer.Account.Email, "[AutoWash Pro] Chuyển nhượng xe thành công", oldOwnerEmailBody);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EMAIL ERROR] Failed to send admin approval emails: {ex.Message}");
            }

            return (true, "Duyệt yêu cầu chuyển nhượng xe thành công!");
        }

        public async Task ProcessTimeoutsAsync(int timeoutDays)
        {
            var cutoff = DateTime.Now.AddDays(-timeoutDays);

            var expiredRequests = await _context.OwnershipTransferRequests
                .Where(r => r.Status == OwnershipTransferStatus.PendingOwnerConfirmation && r.CreatedAt < cutoff)
                .ToListAsync();

            if (expiredRequests.Any())
            {
                foreach (var req in expiredRequests)
                {
                    req.Status = OwnershipTransferStatus.PendingAdminReview;
                    req.OwnerDecision = "Timeout";
                    req.UpdatedAt = DateTime.Now;
                }

                await _context.SaveChangesAsync();
            }
        }
    }
}
