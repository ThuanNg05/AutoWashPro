using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Helpers;
using Auto_Wash.DTOs.Vehicle;

namespace Auto_Wash.Services
{
    public class VehicleService
    {
        private readonly AutoWashDbContext _context;
        private readonly OtpService _otpService;
        private readonly IVehicleMasterDataService _masterDataService;

        public VehicleService(AutoWashDbContext context, OtpService otpService, IVehicleMasterDataService masterDataService)
        {
            _context = context;
            _otpService = otpService;
            _masterDataService = masterDataService;
        }

        public async Task<List<VehicleDto>> GetCustomerVehiclesAsync(int customerId)
        {
            return await _context.Vehicles
                .Where(v => v.CustomerId == customerId)
                .Select(v => new VehicleDto
                {
                    VehicleId = v.VehicleId,
                    CustomerId = v.CustomerId,
                    LicensePlate = v.LicensePlate,
                    Brand = v.Brand,
                    Model = v.Model,
                    VehicleClass = v.VehicleClass,
                    RegisteredAt = v.RegisteredAt,
                    HasActiveBooking = _context.Bookings
                        .WhereActive()
                        .Any(b => b.VehicleId == v.VehicleId)
                })
                .ToListAsync();
        }

        public async Task<bool> IsPlateRegisteredAsync(string licensePlate)
        {
            string norm = LicensePlateHelper.Normalize(licensePlate);
            return await _context.Vehicles
                .AnyAsync(v => v.LicensePlate == norm);
        }

        public async Task<string> SendVehicleOtpAsync(string email, string licensePlate)
        {
            string normPlate = LicensePlateHelper.Normalize(licensePlate);
            if (string.IsNullOrWhiteSpace(normPlate))
            {
                throw new ArgumentException("Biển số xe không được để trống!");
            }
            if (normPlate.Length > 10)
            {
                throw new ArgumentException("Biển số xe quá dài (tối đa 10 ký tự sau khi chuẩn hóa)!");
            }

            return await _otpService.GenerateAndSaveOtpAsync(email, "AddVehicle", normPlate);
        }

        public async Task<bool> VerifyVehicleOtpAsync(string email, string code, string licensePlate)
        {
            string normPlate = LicensePlateHelper.Normalize(licensePlate);
            if (string.IsNullOrWhiteSpace(normPlate))
            {
                return false;
            }
            if (normPlate.Length > 10)
            {
                return false;
            }

            return await _otpService.VerifyOtpAsync(email, code, "AddVehicle", normPlate);
        }

        public async Task SaveVehicleAsync(int customerId, string licensePlate, string brand, string model, string vehicleClass)
        {
            string normPlate = LicensePlateHelper.Normalize(licensePlate);
            if (string.IsNullOrWhiteSpace(normPlate))
            {
                throw new ArgumentException("Biển số xe không được để trống!");
            }
            if (normPlate.Length > 10)
            {
                throw new ArgumentException("Biển số xe quá dài (tối đa 10 ký tự sau khi chuẩn hóa)!");
            }
            
            // Check duplicate after normalization
            bool exists = await IsPlateRegisteredAsync(normPlate);
            if (exists)
            {
                throw new InvalidOperationException("Biển số xe này đã được đăng ký trên hệ thống!");
            }

            // Resolve and normalize vehicle info against master data.
            // The client-supplied vehicleClass is ignored — master data determines it.
            var resolved = NormalizeVehicleInput(brand, model);

            var vehicle = new Vehicle
            {
                CustomerId = customerId,
                LicensePlate = normPlate,
                Brand = resolved.Brand,
                Model = resolved.Model,
                VehicleClass = resolved.VehicleClass
            };

            _context.Vehicles.Add(vehicle);
            await _context.SaveChangesAsync();
        }

        public async Task<(bool success, string message)> UpdateVehicleAsync(int customerId, int vehicleId, string brand, string model, string vehicleClass)
        {
            var vehicle = await _context.Vehicles
                .FirstOrDefaultAsync(v => v.CustomerId == customerId && v.VehicleId == vehicleId);

            if (vehicle == null)
            {
                return (false, "Không tìm thấy phương tiện tương ứng của bạn!");
            }

            // Resolve and normalize vehicle info against master data.
            // The client-supplied vehicleClass is ignored — master data determines it.
            var resolved = NormalizeVehicleInput(brand, model);

            vehicle.Brand = resolved.Brand;
            vehicle.Model = resolved.Model;
            vehicle.VehicleClass = resolved.VehicleClass;

            await _context.SaveChangesAsync();
            return (true, "Cập nhật phương tiện thành công!");
        }

        public async Task<(bool success, string message)> DeleteVehicleByIdAsync(int customerId, int vehicleId)
        {
            var vehicle = await _context.Vehicles
                .FirstOrDefaultAsync(v => v.CustomerId == customerId && v.VehicleId == vehicleId);

            if (vehicle == null)
            {
                return (false, "Không tìm thấy phương tiện tương ứng của bạn!");
            }

            // Check if vehicle has active bookings
            var hasActiveBookings = await _context.Bookings
                .WhereActive()
                .AnyAsync(b => b.VehicleId == vehicleId);
            if (hasActiveBookings)
            {
                return (false, "Không thể xóa phương tiện đã có lịch đặt lịch đang chờ xử lý.");
            }

            _context.Vehicles.Remove(vehicle);
            await _context.SaveChangesAsync();
            return (true, "Xoá phương tiện thành công!");
        }

        /// <summary>
        /// Centralised vehicle input normalization. Resolves Brand and Model against
        /// master data and determines the correct VehicleClass.
        /// 
        /// All create/update flows must use this method to avoid duplicated validation logic.
        /// 
        /// Throws <see cref="ArgumentException"/> if brand or model is invalid.
        /// </summary>
        /// <param name="brand">Brand name (case-insensitive, trimmed).</param>
        /// <param name="model">Model name (case-insensitive, trimmed).</param>
        /// <returns>Resolved result containing canonical Brand, Model, and VehicleClass.</returns>
        private VehicleResolveResult NormalizeVehicleInput(string brand, string model)
        {
            var result = _masterDataService.Resolve(brand, model);

            if (!result.IsValid)
            {
                throw new ArgumentException(result.ErrorMessage ?? "Thông tin hãng xe hoặc dòng xe không hợp lệ.");
            }

            return result;
        }

        /// <summary>
        /// Returns enriched vehicle summaries for the Vehicle Management Center.
        /// Aggregates: last wash (date + service name), upcoming booking.
        /// Read-only — does not create new business logic.
        /// </summary>
        public async Task<List<VehicleSummaryDto>> GetVehicleSummariesAsync(int customerId)
        {
            var vehicles = await _context.Vehicles
                .Where(v => v.CustomerId == customerId)
                .ToListAsync();

            if (vehicles.Count == 0)
                return new List<VehicleSummaryDto>();

            var vehicleIds = vehicles.Select(v => v.VehicleId).ToList();

            // Batch-load active bookings for all vehicles
            var activeBookingMap = await _context.Bookings
                .WhereActive()
                .Where(b => vehicleIds.Contains(b.VehicleId))
                .GroupBy(b => b.VehicleId)
                .ToDictionaryAsync(g => g.Key, g => true);

            // Batch-load upcoming bookings (next active booking per vehicle, sorted by scheduled date)
            var upcomingBookings = await _context.Bookings
                .WhereActive()
                .Where(b => vehicleIds.Contains(b.VehicleId))
                .OrderBy(b => b.ScheduledAt)
                .GroupBy(b => b.VehicleId)
                .Select(g => g.First())
                .ToListAsync();
            var upcomingMap = upcomingBookings.ToDictionary(b => b.VehicleId);

            // Batch-load last completed booking per vehicle (most recent CompletedAt)
            var lastCompletedBookings = await _context.Bookings
                .Where(b => vehicleIds.Contains(b.VehicleId) && b.Status == BookingStatus.Completed)
                .OrderByDescending(b => b.CompletedAt)
                .GroupBy(b => b.VehicleId)
                .Select(g => g.First())
                .ToListAsync();
            var lastWashMap = lastCompletedBookings.ToDictionary(b => b.VehicleId);

            // Batch-load service names for last completed bookings
            var lastWashBookingIds = lastCompletedBookings.Select(b => b.BookingId).ToList();
            var serviceNameMap = await _context.BookingServices
                .Where(bs => lastWashBookingIds.Contains(bs.BookingId) && bs.Service.Category != ServiceCategory.AddOn)
                .GroupBy(bs => bs.BookingId)
                .ToDictionaryAsync(
                    g => g.Key,
                    g => g.First().ServiceNameSnapshot);

            return vehicles.Select(v =>
            {
                upcomingMap.TryGetValue(v.VehicleId, out var upcoming);
                lastWashMap.TryGetValue(v.VehicleId, out var lastWash);
                string? lastWashService = null;
                if (lastWash != null)
                    serviceNameMap.TryGetValue(lastWash.BookingId, out lastWashService);

                return new VehicleSummaryDto
                {
                    VehicleId = v.VehicleId,
                    CustomerId = v.CustomerId,
                    LicensePlate = v.LicensePlate,
                    Brand = v.Brand,
                    Model = v.Model,
                    VehicleClass = v.VehicleClass,
                    RegisteredAt = v.RegisteredAt,
                    HasActiveBooking = activeBookingMap.ContainsKey(v.VehicleId),
                    LastWashDate = lastWash?.CompletedAt,
                    LastWashServiceName = lastWashService,
                    UpcomingBooking = upcoming != null ? new UpcomingBookingSummary
                    {
                        BookingId = upcoming.BookingId,
                        ScheduledAt = upcoming.ScheduledAt,
                        Status = upcoming.Status.ToString()
                    } : null
                };
            }).ToList();
        }
    }
}

