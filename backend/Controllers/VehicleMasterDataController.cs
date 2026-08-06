using Microsoft.AspNetCore.Mvc;
using Auto_Wash.Services;
using Auto_Wash.DTOs.Vehicle;

namespace Auto_Wash.Controllers
{
    /// <summary>
    /// Provides vehicle master data (brands and models) for frontend dropdowns.
    /// This controller is read-only and does not require authentication.
    /// </summary>
    [ApiController]
    [Route("api/vehicle-master")]
    public class VehicleMasterDataController : Controller
    {
        private readonly IVehicleMasterDataService _masterDataService;

        public VehicleMasterDataController(IVehicleMasterDataService masterDataService)
        {
            _masterDataService = masterDataService;
        }

        /// <summary>
        /// Lấy danh sách tất cả hãng xe có trong hệ thống.
        /// </summary>
        /// <response code="200">Danh sách hãng xe.</response>
        [HttpGet("brands")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult GetBrands()
        {
            var brands = _masterDataService.GetBrands();
            return Ok(brands);
        }

        /// <summary>
        /// Lấy danh sách dòng xe theo hãng, bao gồm phân khúc (VehicleClass).
        /// </summary>
        /// <param name="brand">Tên hãng xe (case-insensitive).</param>
        /// <response code="200">Danh sách dòng xe với phân khúc.</response>
        /// <response code="400">Hãng xe không hợp lệ hoặc không tồn tại.</response>
        [HttpGet("models")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public IActionResult GetModels([FromQuery] string? brand)
        {
            if (string.IsNullOrWhiteSpace(brand))
            {
                return BadRequest(new { success = false, message = "Vui lòng cung cấp tên hãng xe." });
            }

            if (!_masterDataService.BrandExists(brand))
            {
                return BadRequest(new { success = false, message = $"Hãng xe '{brand.Trim()}' không tồn tại trong hệ thống." });
            }

            var models = _masterDataService.GetModels(brand);
            return Ok(models);
        }
    }
}
