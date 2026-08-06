using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting;
using Auto_Wash.DTOs.Vehicle;

namespace Auto_Wash.Services
{
    /// <summary>
    /// Singleton service that loads vehicle master data from a JSON file once at startup
    /// and serves all lookups from in-memory dictionaries.
    /// 
    /// All lookups are case-insensitive and trim whitespace.
    /// 
    /// Architecture Notes:
    /// - This service is the single source of truth for Brand/Model validation.
    /// - To migrate to a database in a future phase, implement IVehicleMasterDataService
    ///   with a DB-backed version and swap the DI registration. No consumer changes needed.
    /// - To support an "Other" option in a future phase, extend the Resolve() method to
    ///   accept a sentinel value (e.g. "other") and return an appropriate result without
    ///   changing the interface contract.
    /// </summary>
    public class VehicleMasterDataService : IVehicleMasterDataService
    {
        private readonly IReadOnlyList<BrandDto> _brands;
        private readonly Dictionary<string, BrandEntry> _brandLookup;

        public VehicleMasterDataService(IWebHostEnvironment env)
        {
            var filePath = Path.Combine(env.ContentRootPath, "Data", "vehicle-master-data.json");

            if (!File.Exists(filePath))
            {
                throw new FileNotFoundException(
                    $"Vehicle master data file not found at: {filePath}. " +
                    "Ensure 'Data/vehicle-master-data.json' exists and is set to copy to output directory.");
            }

            var jsonContent = File.ReadAllText(filePath);
            var masterData = JsonSerializer.Deserialize<VehicleMasterDataRoot>(jsonContent, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (masterData?.Brands == null || masterData.Brands.Count == 0)
            {
                throw new InvalidOperationException("Vehicle master data file is empty or has no brands.");
            }

            // Build ordered brand list for GetBrands()
            _brands = masterData.Brands
                .Select(b => new BrandDto { Id = b.Id, Name = b.Name })
                .ToList()
                .AsReadOnly();

            // Build lookup dictionaries — keyed by normalized (trimmed, lowercase) name
            _brandLookup = new Dictionary<string, BrandEntry>(StringComparer.OrdinalIgnoreCase);

            foreach (var brand in masterData.Brands)
            {
                var modelLookup = new Dictionary<string, ModelEntry>(StringComparer.OrdinalIgnoreCase);
                var modelDtos = new List<VehicleMasterModelDto>();

                foreach (var model in brand.Models)
                {
                    var key = model.Name.Trim();
                    modelLookup[key] = new ModelEntry
                    {
                        Id = model.Id,
                        Name = model.Name,
                        VehicleClass = model.VehicleClass
                    };

                    modelDtos.Add(new VehicleMasterModelDto
                    {
                        Id = model.Id,
                        Name = model.Name,
                        VehicleClass = model.VehicleClass
                    });
                }

                var brandKey = brand.Name.Trim();
                _brandLookup[brandKey] = new BrandEntry
                {
                    Id = brand.Id,
                    Name = brand.Name,
                    Models = modelLookup,
                    ModelDtos = modelDtos.AsReadOnly()
                };
            }
        }

        /// <inheritdoc />
        public IReadOnlyList<BrandDto> GetBrands() => _brands;

        /// <inheritdoc />
        public IReadOnlyList<VehicleMasterModelDto> GetModels(string brand)
        {
            if (string.IsNullOrWhiteSpace(brand))
                return Array.Empty<VehicleMasterModelDto>();

            return _brandLookup.TryGetValue(brand.Trim(), out var entry)
                ? entry.ModelDtos
                : Array.Empty<VehicleMasterModelDto>();
        }

        /// <inheritdoc />
        public bool BrandExists(string brand)
        {
            if (string.IsNullOrWhiteSpace(brand))
                return false;

            return _brandLookup.ContainsKey(brand.Trim());
        }

        /// <inheritdoc />
        public bool ModelExists(string brand, string model)
        {
            if (string.IsNullOrWhiteSpace(brand) || string.IsNullOrWhiteSpace(model))
                return false;

            return _brandLookup.TryGetValue(brand.Trim(), out var brandEntry)
                && brandEntry.Models.ContainsKey(model.Trim());
        }

        /// <inheritdoc />
        public VehicleResolveResult Resolve(string brand, string model)
        {
            if (string.IsNullOrWhiteSpace(brand))
                return VehicleResolveResult.Failure("Hãng xe không được để trống.");

            if (string.IsNullOrWhiteSpace(model))
                return VehicleResolveResult.Failure("Dòng xe không được để trống.");

            // Future extension point: check for "other" sentinel value here
            // if (brand.Trim().Equals("other", StringComparison.OrdinalIgnoreCase))
            // {
            //     return VehicleResolveResult.CustomInput(...);
            // }

            if (!_brandLookup.TryGetValue(brand.Trim(), out var brandEntry))
                return VehicleResolveResult.Failure($"Hãng xe '{brand.Trim()}' không tồn tại trong hệ thống.");

            if (!brandEntry.Models.TryGetValue(model.Trim(), out var modelEntry))
                return VehicleResolveResult.Failure($"Dòng xe '{model.Trim()}' không tồn tại trong hãng '{brandEntry.Name}'.");

            return VehicleResolveResult.Success(
                brandId: brandEntry.Id,
                brand: brandEntry.Name,
                modelId: modelEntry.Id,
                model: modelEntry.Name,
                vehicleClass: modelEntry.VehicleClass
            );
        }

        #region Internal Data Structures

        /// <summary>
        /// Represents a brand in the lookup dictionary.
        /// </summary>
        private sealed class BrandEntry
        {
            public string Id { get; init; } = string.Empty;
            public string Name { get; init; } = string.Empty;
            public Dictionary<string, ModelEntry> Models { get; init; } = new();
            public IReadOnlyList<VehicleMasterModelDto> ModelDtos { get; init; } = Array.Empty<VehicleMasterModelDto>();
        }

        /// <summary>
        /// Represents a model in the lookup dictionary.
        /// </summary>
        private sealed class ModelEntry
        {
            public string Id { get; init; } = string.Empty;
            public string Name { get; init; } = string.Empty;
            public string VehicleClass { get; init; } = string.Empty;
        }

        #endregion

        #region JSON Deserialization Models

        private sealed class VehicleMasterDataRoot
        {
            public int Version { get; set; }
            public string Country { get; set; } = string.Empty;
            public string LastUpdated { get; set; } = string.Empty;
            public List<BrandJson> Brands { get; set; } = new();
        }

        private sealed class BrandJson
        {
            public string Id { get; set; } = string.Empty;
            public string Name { get; set; } = string.Empty;
            public List<ModelJson> Models { get; set; } = new();
        }

        private sealed class ModelJson
        {
            public string Id { get; set; } = string.Empty;
            public string Name { get; set; } = string.Empty;
            public string VehicleClass { get; set; } = string.Empty;
        }

        #endregion
    }
}
