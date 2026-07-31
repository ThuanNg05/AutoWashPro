using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace Auto_Wash.Helpers
{
    public static class LicensePlateHelper
    {
        public static string Normalize(string licensePlate)
        {
            if (string.IsNullOrWhiteSpace(licensePlate)) return string.Empty;
            return licensePlate.Trim().ToUpper().Replace(" ", "").Replace("-", "").Replace(".", "");
        }

        public static bool IsValidVietnameseLicensePlate(string? licensePlate)
        {
            if (string.IsNullOrWhiteSpace(licensePlate)) return false;

            // Normalize: remove space, dash, dot, and convert to uppercase
            string cleanPlate = Normalize(licensePlate);

            // Biển số Ô TÔ (sau chuẩn hoá, đã bỏ ký tự phân cách):
            //   [2 số tỉnh][1 chữ series][4-5 số]  — ví dụ 51G88888 (5 số) hoặc 29S1234 (4 số, xe đời cũ)
            //   Series ô tô dùng 1 trong 20 chữ: A B C D E F G H K L M N P S T U V X Y Z
            //     - nền xanh (i)   : tập con 11 chữ A..M (cơ quan nhà nước)
            //     - nền trắng (iii): đủ 20 chữ (tổ chức/cá nhân trong nước)
            //     - nền vàng (v)   : đủ 20 chữ (kinh doanh vận tải)
            //   char class [A-HK-NPS-VX-Z] loại I, J, O, Q, R, W (không dùng trên biển VN).
            //   Ngoại lệ: series "LD" (2 chữ) cấp cho xe doanh nghiệp liên doanh/có vốn
            //   nước ngoài — vẫn là ô tô, ví dụ 50LD25689.
            //   Chỉ chấp nhận series 1 chữ (hoặc "LD") nên LOẠI xe mô tô (series chữ+số (ii),
            //   chữ+chữ (iv)) và series chuyên dùng CD/RM (máy chuyên dùng, rơ moóc).
            var match = Regex.Match(cleanPlate, @"^(\d{2})(?:[A-HK-NPS-VX-Z]|LD)\d{4,5}$");
            if (!match.Success) return false;

            string provinceCode = match.Groups[1].Value;
            var validProvinces = new HashSet<string>
            {
                "11", "12", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "40", "41", "43", "47", "48", "49", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "80", "81", "82", "83", "84", "85", "86", "88", "89", "90", "92", "93", "94", "95", "97", "98", "99"
            };

            return validProvinces.Contains(provinceCode);
        }
    }
}
