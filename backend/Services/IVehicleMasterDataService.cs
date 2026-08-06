using System.Collections.Generic;
using Auto_Wash.DTOs.Vehicle;

namespace Auto_Wash.Services
{
    /// <summary>
    /// Provides read-only access to vehicle master data (brands, models, vehicle classes).
    /// Implementations should load data once at startup and serve from memory.
    /// 
    /// This is the single source of truth for Brand/Model validation.
    /// 
    /// Extension Point: In a future phase, an "Other" brand/model option can be
    /// supported by extending the Resolve() method to accept a special sentinel value
    /// (e.g. "other") and return a result with IsValid = true but with a flag indicating
    /// custom input is required. This can be done without changing existing consumers.
    /// </summary>
    public interface IVehicleMasterDataService
    {
        /// <summary>
        /// Returns all available vehicle brands, ordered as defined in master data.
        /// </summary>
        IReadOnlyList<BrandDto> GetBrands();

        /// <summary>
        /// Returns all models for a given brand. Case-insensitive lookup with trimming.
        /// Returns an empty list if the brand is not found.
        /// </summary>
        IReadOnlyList<VehicleMasterModelDto> GetModels(string brand);

        /// <summary>
        /// Checks whether a brand exists in master data. Case-insensitive with trimming.
        /// </summary>
        bool BrandExists(string brand);

        /// <summary>
        /// Checks whether a model exists under the given brand. Case-insensitive with trimming.
        /// </summary>
        bool ModelExists(string brand, string model);

        /// <summary>
        /// Resolves a brand/model pair against master data.
        /// Returns canonical names, IDs, and the correct VehicleClass.
        /// The client-supplied VehicleClass is never used — the backend determines it.
        /// 
        /// Future "Other" support: This method can be extended to accept a special
        /// "other" brand/model value without changing the return type or call sites.
        /// </summary>
        VehicleResolveResult Resolve(string brand, string model);
    }
}
