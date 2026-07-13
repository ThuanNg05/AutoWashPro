using System;
using System.IO;
using System.Threading.Tasks;

namespace Auto_Wash.Services
{
    public class MockOcrService : IOcrService
    {
        public async Task<(bool success, string extractedPlate, string message)> PerformOcrAsync(string imageUrl, string targetPlate)
    {
            // Simulate brief delay to look real in UI
            await Task.Delay(1200);

            var fileName = Path.GetFileNameWithoutExtension(imageUrl).ToLowerInvariant();

            if (fileName.Contains("fail"))
            {
                return (false, string.Empty, "Không thể nhận diện biển số xe từ hình ảnh đăng ký.");
            }

            if (fileName.Contains("mismatch"))
            {
                return (true, "29A99999", "Nhận diện biển số xe thành công (Biển số: 29A-999.99).");
            }

            // Normal flow: extracts targetPlate successfully
            return (true, targetPlate, $"Nhận diện biển số xe trùng khớp thành công (Biển số: {targetPlate}).");
        }
    }
}
