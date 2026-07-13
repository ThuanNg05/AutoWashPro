using System.Threading.Tasks;

namespace Auto_Wash.Services
{
    public interface IOcrService
    {
        Task<(bool success, string extractedPlate, string message)> PerformOcrAsync(string imageUrl, string targetPlate);
    }
}
