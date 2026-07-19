namespace Auto_Wash.Helpers
{
    public class PayOSSettings
    {
        public string ClientId { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
        public string ChecksumKey { get; set; } = string.Empty;
        public string ReturnUrl { get; set; } = string.Empty;
        public string CancelUrl { get; set; } = string.Empty;
        public string WebhookUrl { get; set; } = string.Empty;

        /// <summary>
        /// How long (in minutes) a PayOS checkout link stays valid before it
        /// expires. After this window PayOS reports the link as Expired and the
        /// payment is reconciled to <c>PaymentStatus.Expired</c> ("Hết hạn").
        /// </summary>
        public int ExpiryMinutes { get; set; } = 15;
    }
}
