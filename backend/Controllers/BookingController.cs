using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Services;
using Auto_Wash.DTOs.Booking;
using Auto_Wash.DTOs.Common;
using Auto_Wash.Helpers;

namespace Auto_Wash.Controllers
{
    /// <summary>
    /// API Quản lý đặt lịch rửa xe của khách hàng.
    /// </summary>
    [ApiController]
    [Route("api/v1/bookings")]
    public class BookingController : ControllerBase
    {
        private readonly AuthContextService _authContextService;
        private readonly Auto_Wash.Services.BookingService _bookingService;
        private readonly AutoWashDbContext _context;
        private readonly IConfiguration _configuration;

        public BookingController(AuthContextService authContextService,
                                 Auto_Wash.Services.BookingService bookingService,
                                 AutoWashDbContext context,
                                 IConfiguration configuration)
        {
            _authContextService = authContextService;
            _bookingService = bookingService;
            _context = context;
            _configuration = configuration;
        }

        /// <summary>
        /// Lấy danh sách các dịch vụ rửa xe (bao gồm cả add-on).
        /// </summary>
        /// <response code="200">Lấy danh sách dịch vụ thành công.</response>
        [HttpGet("~/api/v1/services")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetServices()
        {
            var services = await _context.Services
                .Where(s => s.IsActive)
                .OrderBy(s => s.IsAddOn)
                .ThenBy(s => s.BasePrice)
                .ToListAsync();

            return Ok(new { success = true, services });
        }

        /// <summary>
        /// Tạo mới một lịch đặt xe (Booking).
        /// </summary>
        /// <param name="request">Thông tin chi tiết lịch đặt.</param>
        /// <response code="200">Đặt lịch thành công.</response>
        /// <response code="400">Dữ liệu không hợp lệ hoặc trùng lịch hẹn.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpPost]
        [ProducesResponseType(typeof(CreateBookingResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> CreateBooking([FromBody] CreateBookingDto request)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new MessageResponse { Success = false, Message = "Bạn chưa đăng nhập!" });
            }

            var result = await _bookingService.CreateBookingAsync(customer, request);
            if (!result.success)
            {
                return BadRequest(new MessageResponse { Success = false, Message = result.message });
            }

            return Ok(new CreateBookingResponse { Success = true, BookingId = result.bookingId });
        }

        /// <summary>
        /// Lấy lịch sử rửa xe của khách hàng.
        /// </summary>
        /// <response code="200">Lấy danh sách thành công.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpGet("history")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetWashHistory()
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new MessageResponse { Success = false, Message = "Bạn chưa đăng nhập!" });
            }

            var bookingsList = await _bookingService.GetWashHistoryAsync(customer.CustomerId);
            var bookings = bookingsList
                .Select(b => new
                {
                    id = b.BookingId.ToString(),
                    vehicle = b.Vehicle.LicensePlate,
                    mainService = b.BookingServices.Where(bs => !bs.Service.IsAddOn).Select(bs => bs.Service.ServiceName).FirstOrDefault() ?? "Rửa xe",
                    status = b.Status == BookingStatus.Pending ? "Pending Confirmation"
                           : b.Status == BookingStatus.Confirmed ? "Confirmed"
                           : b.Status == BookingStatus.CheckedIn ? "Checked In"
                           : b.Status == BookingStatus.Completed ? "Completed"
                           : b.Status == BookingStatus.Cancelled ? "Cancelled"
                           : "In Progress",
                    queueStatus = b.Queues.FirstOrDefault()?.Status.ToString(),
                    bookingDate = b.ScheduledAt.ToString("yyyy-MM-dd"),
                    bookingTime = b.ScheduledAt.ToString("HH:mm"),
                    price = b.FinalPrice,
                    points = b.PointsEarned,
                    hasReview = b.Stars.HasValue,
                    progressTracking = BookingWorkflowConfig.GetProgressForBooking(b, b.Queues.FirstOrDefault())
                })
                .ToList();

            return Ok(new { success = true, history = bookings });
        }

        /// <summary>
        /// Lấy đơn đặt lịch hoạt động hiện tại (chưa hoàn thành).
        /// </summary>
        /// <response code="200">Lấy thông tin thành công.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpGet("active")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetActiveBooking()
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new MessageResponse { Success = false, Message = "Bạn chưa đăng nhập!" });
            }

            var activeBooking = await _bookingService.GetActiveBookingAsync(customer.CustomerId);

            if (activeBooking == null)
            {
                return Ok(new { success = true, booking = (object?)null });
            }

            var mainSvcName = activeBooking.BookingServices
                .Where(bs => !bs.Service.IsAddOn)
                .Select(bs => bs.Service.ServiceName)
                .FirstOrDefault() ?? "Rửa xe";

            var queue = activeBooking.Queues.FirstOrDefault();
            bool hasQueue = queue != null;
            var queueStatusEnum = queue?.Status ?? QueueStatus.Waiting;
            string queueStatus = queueStatusEnum.ToString();

            int washStep = hasQueue ? 0 : -1;
            if (hasQueue)
            {
                if (queueStatusEnum == QueueStatus.Waiting) washStep = 0;
                else if (queueStatusEnum == QueueStatus.Washing) washStep = 1;
                else if (queueStatusEnum == QueueStatus.Drying) washStep = 2;
                else if (queueStatusEnum == QueueStatus.Completed) washStep = 3;
            }

            var progressTracking = BookingWorkflowConfig.GetProgressForBooking(activeBooking, queue);
            string eta = (queue != null ? queue.CheckInAt : activeBooking.ScheduledAt).AddSeconds(BookingWorkflowConfig.TotalDurationSeconds).ToString("HH:mm:ss");

            var bookingData = new
            {
                id = activeBooking.BookingId.ToString(),
                vehicle = activeBooking.Vehicle.LicensePlate,
                mainService = mainSvcName,
                status = activeBooking.Status == BookingStatus.Pending ? "Pending Confirmation"
                       : activeBooking.Status == BookingStatus.Confirmed ? "Confirmed"
                       : activeBooking.Status == BookingStatus.CheckedIn ? "Checked In"
                       : activeBooking.Status == BookingStatus.Completed ? "Completed"
                       : activeBooking.Status == BookingStatus.Cancelled ? "Cancelled"
                       : "In Progress",
                bookingDate = activeBooking.ScheduledAt.ToString("yyyy-MM-dd"),
                bookingTime = activeBooking.ScheduledAt.ToString("HH:mm"),
                price = activeBooking.FinalPrice,
                points = activeBooking.PointsEarned,
                hasQueue = hasQueue,
                paidAt = activeBooking.Payment?.PaidAt?.ToString("yyyy-MM-dd HH:mm:ss"),
                progressTracking = progressTracking,
                eta = eta
            };

            return Ok(new { success = true, booking = bookingData, queueStatus, washStep, progressTracking, eta });
        }

        /// <summary>
        /// Lấy chi tiết lịch đặt theo ID.
        /// </summary>
        /// <param name="id">ID lịch đặt.</param>
        /// <response code="200">Lấy thông tin thành công.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        /// <response code="404">Không tìm thấy lịch đặt.</response>
        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetBookingDetail(int id)
        {
            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new MessageResponse { Success = false, Message = "Bạn chưa đăng nhập!" });
            }

            var booking = await _bookingService.GetBookingDetailAsync(customer.CustomerId, id);
            if (booking == null)
            {
                return NotFound(new MessageResponse { Success = false, Message = "Không tìm thấy đơn đặt lịch này!" });
            }

            return Ok(new { success = true, booking });
        }

        /// <summary>
        /// Hủy lịch đặt xe.
        /// </summary>
        /// <param name="id">ID lịch đặt cần hủy.</param>
        /// <param name="request">Lý do hủy lịch.</param>
        /// <response code="200">Hủy lịch thành công.</response>
        /// <response code="400">Không thể hủy hoặc thiếu lý do.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpPatch("{id}/cancel")]
        [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> CancelBooking(int id, [FromBody] CancelBookingDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Reason))
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Lý do hủy là bắt buộc." });
            }

            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new MessageResponse { Success = false, Message = "Bạn chưa đăng nhập!" });
            }

            var result = await _bookingService.CancelBookingAsync(customer.CustomerId, id, request.Reason);
            if (!result.success)
            {
                return BadRequest(new MessageResponse { Success = false, Message = result.message });
            }

            return Ok(new MessageResponse { Success = true, Message = result.message });
        }

        /// <summary>
        /// Dời lịch đặt xe sang khung giờ mới.
        /// </summary>
        /// <param name="id">ID lịch đặt cần dời.</param>
        /// <param name="request">Thông tin thời gian mới.</param>
        /// <response code="200">Dời lịch thành công.</response>
        /// <response code="400">Khung giờ mới không khả dụng hoặc bị lỗi.</response>
        /// <response code="401">Khách hàng chưa đăng nhập.</response>
        [HttpPatch("{id}/reschedule")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> RescheduleBooking(int id, [FromBody] RescheduleBookingDto request)
        {
            if (!DateTime.TryParse(request.ScheduledAt, out DateTime newScheduledAt))
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Thời gian hẹn mới không đúng định dạng." });
            }

            var customer = await _authContextService.GetCurrentCustomerAsync();
            if (customer == null)
            {
                return Unauthorized(new MessageResponse { Success = false, Message = "Bạn chưa đăng nhập!" });
            }

            var result = await _bookingService.RescheduleBookingAsync(customer.CustomerId, id, newScheduledAt, request.Reason);
            if (!result.success)
            {
                return BadRequest(new MessageResponse { Success = false, Message = result.message });
            }

            return Ok(new MessageResponse { Success = true, Message = result.message });
        }

        /// <summary>
        /// Lấy thông tin cấu hình đặt lịch rửa xe.
        /// </summary>
        /// <response code="200">Lấy cấu hình thành công.</response>
        [HttpGet("config")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult GetBookingConfig()
        {
            int startHour = _configuration.GetValue<int>("BookingCapacityConfig:StartHour", 8);
            int endHour = _configuration.GetValue<int>("BookingCapacityConfig:EndHour", 23);
            int maxVehicles = _configuration.GetValue<int>("BookingCapacityConfig:MaxVehiclesPerSlot", 3);

            var slots = new List<string>();
            for (int h = startHour; h <= endHour; h++)
            {
                slots.Add($"{h:D2}:00");
            }

            return Ok(new { 
                success = true, 
                startHour, 
                endHour, 
                maxVehiclesPerSlot = maxVehicles, 
                slots 
            });
        }

        /// <summary>
        /// Lấy danh sách các khung giờ đã kín chỗ của một ngày.
        /// </summary>
        /// <param name="date">Ngày kiểm tra (yyyy-MM-dd).</param>
        /// <response code="200">Lấy thông tin thành công.</response>
        /// <response code="400">Ngày không hợp lệ.</response>
        [HttpGet("occupied-slots")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GetOccupiedSlots([FromQuery] string date)
        {
            if (!DateTime.TryParse(date, out DateTime parsedDate))
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Ngày không hợp lệ." });
            }

            int startHour = _configuration.GetValue<int>("BookingCapacityConfig:StartHour", 8);
            int endHour = _configuration.GetValue<int>("BookingCapacityConfig:EndHour", 23);
            int maxVehicles = _configuration.GetValue<int>("BookingCapacityConfig:MaxVehiclesPerSlot", 3);

            var dynamicSlots = new List<string>();
            for (int h = startHour; h <= endHour; h++)
            {
                dynamicSlots.Add($"{h:D2}:00");
            }

            var bookings = await _context.Bookings
                .Where(b => b.Status != BookingStatus.Completed && b.Status != BookingStatus.Cancelled && b.Status != BookingStatus.NoShow
                            && b.ScheduledAt.Date == parsedDate.Date)
                .Select(b => b.ScheduledAt.Hour)
                .ToListAsync();

            var slotCounts = bookings
                .GroupBy(h => h)
                .ToDictionary(g => g.Key, g => g.Count());

            var occupiedSlots = slotCounts
                .Where(kvp => kvp.Value >= maxVehicles)
                .Select(kvp => $"{kvp.Key:D2}:00")
                .ToList();

            var slotsStatus = dynamicSlots.ToDictionary(
                t => t,
                t => {
                    int hr = int.Parse(t.Split(':')[0]);
                    int count = slotCounts.ContainsKey(hr) ? slotCounts[hr] : 0;
                    return Math.Max(0, maxVehicles - count);
                }
            );

            return Ok(new { success = true, occupiedSlots, slotsStatus });
        }

        /// <summary>
        /// Tìm ngày khả dụng sớm nhất để đặt lịch hẹn.
        /// </summary>
        /// <param name="startDate">Ngày bắt đầu kiểm tra (yyyy-MM-dd).</param>
        /// <param name="windowDays">Số ngày kiểm tra phía sau.</param>
        /// <response code="200">Lấy thông tin thành công.</response>
        /// <response code="400">Ngày không hợp lệ.</response>
        [HttpGet("earliest-available-date")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GetEarliestAvailableDate([FromQuery] string startDate, [FromQuery] int windowDays = 7)
        {
            if (!DateTime.TryParse(startDate, out DateTime startParsed))
            {
                return BadRequest(new MessageResponse { Success = false, Message = "Ngày không hợp lệ." });
            }

            var now = DateTime.Now;
            var today = DateTime.Today;

            var endPoint = startParsed.AddDays(windowDays);
            var bookings = await _context.Bookings
                .Where(b => b.Status != BookingStatus.Completed && b.Status != BookingStatus.Cancelled && b.Status != BookingStatus.NoShow
                            && b.ScheduledAt.Date >= startParsed.Date && b.ScheduledAt.Date <= endPoint.Date)
                .Select(b => new { b.ScheduledAt.Date, b.ScheduledAt.Hour })
                .ToListAsync();

            var grouped = bookings
                .GroupBy(b => new { b.Date, b.Hour })
                .ToDictionary(g => g.Key, g => g.Count());

            int startHour = _configuration.GetValue<int>("BookingCapacityConfig:StartHour", 8);
            int endHour = _configuration.GetValue<int>("BookingCapacityConfig:EndHour", 23);
            int maxVehicles = _configuration.GetValue<int>("BookingCapacityConfig:MaxVehiclesPerSlot", 3);

            var standardHours = Enumerable.Range(startHour, endHour - startHour + 1).ToList();

            for (int i = 0; i <= windowDays; i++)
            {
                var checkDate = startParsed.AddDays(i);
                foreach (var hour in standardHours)
                {
                    if (checkDate.Date == today && checkDate.Date.AddHours(hour) < now.AddMinutes(15))
                    {
                        continue;
                    }

                    var key = new { Date = checkDate.Date, Hour = hour };
                    int count = grouped.ContainsKey(key) ? grouped[key] : 0;
                    if (count < maxVehicles)
                    {
                        return Ok(new { success = true, earliestDate = checkDate.ToString("yyyy-MM-dd") });
                    }
                }
            }

            return Ok(new { success = true, earliestDate = (string?)null });
        }
    }
}
