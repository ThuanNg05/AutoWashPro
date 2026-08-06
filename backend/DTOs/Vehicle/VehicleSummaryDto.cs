using System;

namespace Auto_Wash.DTOs.Vehicle
{
    /// <summary>
    /// Enriched vehicle summary DTO for the Vehicle Management Center.
    /// Includes summary data (last wash, upcoming booking) aggregated from related tables.
    /// This is read-only and does not create new business logic.
    /// </summary>
    public class VehicleSummaryDto
    {
        public int VehicleId { get; set; }
        public int CustomerId { get; set; }
        public string LicensePlate { get; set; } = string.Empty;
        public string Brand { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public string VehicleClass { get; set; } = string.Empty;
        public DateTime RegisteredAt { get; set; }
        public bool HasActiveBooking { get; set; }

        /// <summary>Date of the most recent completed booking for this vehicle.</summary>
        public DateTime? LastWashDate { get; set; }

        /// <summary>Service name(s) of the most recent completed booking.</summary>
        public string? LastWashServiceName { get; set; }

        /// <summary>Next upcoming active booking for this vehicle, if any.</summary>
        public UpcomingBookingSummary? UpcomingBooking { get; set; }
    }

    public class UpcomingBookingSummary
    {
        public int BookingId { get; set; }
        public DateTime ScheduledAt { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
