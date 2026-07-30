namespace Auto_Wash.Data.Entities
{
    public enum BookingStatus
    {
        Confirmed = 2,
        Completed = 4,
        Cancelled = 5,
        NoShow = 7,

        // Legacy compatibility aliases
        Pending = 2,
        CheckedIn = 2,
        Washing = 2,
        WaitingCheckout = 4
    }
}
