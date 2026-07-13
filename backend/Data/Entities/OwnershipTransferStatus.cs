namespace Auto_Wash.Data.Entities
{
    public enum OwnershipTransferStatus
    {
        PendingOwnerConfirmation = 1,
        PendingAdminApproval = 2,
        PendingAdminReview = 3,
        Approved = 4,
        Rejected = 5,
        Cancelled = 6
    }
}
