namespace Auto_Wash.DTOs.Vehicle
{
    /// <summary>
    /// DTO representing a vehicle model from master data, including its class.
    /// </summary>
    public class VehicleMasterModelDto
    {
        public string Id { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public string VehicleClass { get; set; } = string.Empty;
    }
}
