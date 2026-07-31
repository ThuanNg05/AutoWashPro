using System.Linq;
using Auto_Wash.Data.Entities;

namespace Auto_Wash.Helpers
{
    public static class BookingQueryExtensions
    {
        /// <summary>
        /// Filters bookings that currently occupy physical service slot capacity in the garage.
        /// Excludes WaitingCheckout because the washing/drying service has completed, meaning the physical slot is released.
        /// </summary>
        public static IQueryable<Booking> WhereSlotOccupied(this IQueryable<Booking> query)
        {
            return query.Where(b => b.Status == BookingStatus.Pending
                                 || b.Status == BookingStatus.Confirmed
                                 || b.Status == BookingStatus.CheckedIn
                                 || b.Status == BookingStatus.Washing);
        }
    
        /// <summary>
        /// Filters bookings that represent an active, unfinished booking lifecycle for a vehicle.
        /// </summary>
        public static IQueryable<Booking> WhereActive(this IQueryable<Booking> query)
        {
            return query.Where(b => b.Status != BookingStatus.Completed
                                 && b.Status != BookingStatus.Cancelled
                                 && b.Status != BookingStatus.NoShow
                                 && b.CheckedOutAt == null);
        }
    }
}
