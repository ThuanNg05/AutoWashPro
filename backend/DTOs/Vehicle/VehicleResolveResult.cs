namespace Auto_Wash.DTOs.Vehicle
{
    /// <summary>
    /// Result of resolving a Brand/Model pair against vehicle master data.
    /// Contains canonical values from the master data source.
    /// </summary>
    public class VehicleResolveResult
    {
        public bool IsValid { get; set; }

        /// <summary>Canonical brand identifier (slug) from master data.</summary>
        public string BrandId { get; set; } = string.Empty;

        /// <summary>Canonical brand display name from master data.</summary>
        public string Brand { get; set; } = string.Empty;

        /// <summary>Canonical model identifier (slug) from master data.</summary>
        public string ModelId { get; set; } = string.Empty;

        /// <summary>Canonical model display name from master data.</summary>
        public string Model { get; set; } = string.Empty;

        /// <summary>VehicleClass determined by master data (e.g. Sedan, SUV, Crossover).</summary>
        public string VehicleClass { get; set; } = string.Empty;

        /// <summary>Error message when IsValid is false.</summary>
        public string? ErrorMessage { get; set; }

        public static VehicleResolveResult Success(string brandId, string brand, string modelId, string model, string vehicleClass)
            => new()
            {
                IsValid = true,
                BrandId = brandId,
                Brand = brand,
                ModelId = modelId,
                Model = model,
                VehicleClass = vehicleClass
            };

        public static VehicleResolveResult Failure(string errorMessage)
            => new() { IsValid = false, ErrorMessage = errorMessage };
    }
}
