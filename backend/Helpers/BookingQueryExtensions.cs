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
            return query.Where(b => b.Status != BookingStatus.Completed 
                                 && b.Status != BookingStatus.Cancelled 
                                 && b.Status != BookingStatus.NoShow 
                                 && b.Status != BookingStatus.WaitingCheckout);
        }

        /// <summary>
        /// Filters bookings that represent an active, unfinished booking lifecycle for a vehicle.
        /// Includes WaitingCheckout because the vehicle is still at the shop waiting for payment and cannot book another slot.
        /// </summary>
        public static IQueryable<Booking> WhereActive(this IQueryable<Booking> query)
        {
            return query.Where(b => b.Status != BookingStatus.Completed 
                                 && b.Status != BookingStatus.Cancelled 
                                 && b.Status != BookingStatus.NoShow);
        }
    }
}
