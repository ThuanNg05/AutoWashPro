namespace Auto_Wash.DTOs.Review
{
	public class ServiceDto
	{
		public string ServiceName { get; set; } = string.Empty;
		public string Description { get; set; } = string.Empty;
		public string Category { get; set; } = string.Empty;
		public decimal BasePrice { get; set; }
		public int EstimatedMinutes { get; set; }
		public bool IsAddOn { get; set; }
		public bool IsActive { get; set; }
		public bool IsFeatured { get; set; }
	}
}
