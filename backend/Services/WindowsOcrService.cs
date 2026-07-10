using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Windows.Graphics.Imaging;
using Windows.Media.Ocr;
using Windows.Storage.Streams;
using Auto_Wash.Helpers;

namespace Auto_Wash.Services
{
    public class WindowsOcrService : IOcrService
    {
        /// <summary>
        /// Represents a candidate license plate extracted from OCR text.
        /// </summary>
        private class PlateCandidate
        {
            public string RawText { get; set; } = string.Empty;
            public string Normalized { get; set; } = string.Empty;
            public bool IsValidVietnamese { get; set; }
            public double SimilarityScore { get; set; }
            public bool IsExactMatch { get; set; }
        }

        public async Task<(bool success, string extractedPlate, string message)> PerformOcrAsync(string imageUrl, string targetPlate)
        {
            try
            {
                // Map the relative imageUrl to the physical path
                string physicalPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", imageUrl.TrimStart('/', '\\'));
                if (!File.Exists(physicalPath))
                {
                    return (false, string.Empty, $"File image không tồn tại tại đường dẫn: {physicalPath}");
                }

                OcrEngine? ocrEngine = null;

                // Try to initialize Vietnamese OCR Engine first
                try
                {
                    var viLang = new Windows.Globalization.Language("vi-VN");
                    if (OcrEngine.IsLanguageSupported(viLang))
                    {
                        ocrEngine = OcrEngine.TryCreateFromLanguage(viLang);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[OCR WARNING] Failed to initialize vi-VN language: {ex.Message}");
                }

                // Fallback to user profile languages if Vietnamese is not supported
                if (ocrEngine == null)
                {
                    ocrEngine = OcrEngine.TryCreateFromUserProfileLanguages();
                }

                if (ocrEngine == null)
                {
                    return (false, string.Empty, "Không thể khởi tạo Windows OCR Engine.");
                }

                string recognizedText = string.Empty;

                // Load image file and process using Windows Media OCR
                using (var fileStream = new FileStream(physicalPath, FileMode.Open, FileAccess.Read, FileShare.Read))
                {
                    using (var randomAccessStream = fileStream.AsRandomAccessStream())
                    {
                        var decoder = await BitmapDecoder.CreateAsync(randomAccessStream);
                        using (var softwareBitmap = await decoder.GetSoftwareBitmapAsync())
                        {
                            var ocrResult = await ocrEngine.RecognizeAsync(softwareBitmap);
                            recognizedText = ocrResult.Text;
                        }
                    }
                }

                // === DEBUG LOGGING ===
                string normalizedTarget = LicensePlateHelper.Normalize(targetPlate);
                Console.WriteLine($"[OCR DEBUG] === OCR Verification Start ===");
                Console.WriteLine($"[OCR DEBUG] Target Plate (raw): {targetPlate}");
                Console.WriteLine($"[OCR DEBUG] Target Plate (normalized): {normalizedTarget}");
                Console.WriteLine($"[OCR DEBUG] OCR Raw Text: {recognizedText}");

                if (string.IsNullOrWhiteSpace(recognizedText))
                {
                    Console.WriteLine($"[OCR DEBUG] Result: No text detected from image.");
                    return (false, string.Empty, "Unable to detect a valid license plate from the uploaded image.");
                }

                // === PHASE 1: Collect ALL candidates from multiple regex patterns ===
                var allCandidates = new List<PlateCandidate>();
                var seenNormalized = new HashSet<string>();

                var patterns = new[]
                {
                    @"\b\d{2}[A-Z]{1,2}[-.\s]*\d{3,5}(?:[-.\s]*\d{2,3})?\b",
                    @"\d{2}[A-Z]{1,2}[-.\s]*\d{3,5}(?:[-.\s]*\d{2,3})?",
                    @"\d{2}[A-Z]{1,2}\d{4,5}"
                };

                foreach (var pattern in patterns)
                {
                    var matches = Regex.Matches(recognizedText, pattern, RegexOptions.IgnoreCase);
                    foreach (Match match in matches)
                    {
                        string candidateRaw = match.Value;
                        string candidateNormalized = LicensePlateHelper.Normalize(candidateRaw);

                        // Skip duplicates
                        if (seenNormalized.Contains(candidateNormalized)) continue;
                        seenNormalized.Add(candidateNormalized);

                        bool isValid = LicensePlateHelper.IsValidVietnameseLicensePlate(candidateNormalized);
                        bool isExact = candidateNormalized == normalizedTarget;
                        double similarity = ComputeSimilarity(candidateNormalized, normalizedTarget);

                        allCandidates.Add(new PlateCandidate
                        {
                            RawText = candidateRaw,
                            Normalized = candidateNormalized,
                            IsValidVietnamese = isValid,
                            IsExactMatch = isExact,
                            SimilarityScore = similarity
                        });
                    }
                }

                // === DEBUG: Print all candidates ===
                Console.WriteLine($"[OCR DEBUG] Total candidates found: {allCandidates.Count}");
                foreach (var c in allCandidates)
                {
                    Console.WriteLine($"[OCR DEBUG]   Candidate: raw='{c.RawText}' normalized='{c.Normalized}' valid={c.IsValidVietnamese} exact={c.IsExactMatch} similarity={c.SimilarityScore:F2}");
                }

                // === PHASE 2: Score and rank candidates ===
                // Priority 1: Exact normalized match (highest)
                var exactMatch = allCandidates.FirstOrDefault(c => c.IsExactMatch && c.IsValidVietnamese);
                if (exactMatch != null)
                {
                    Console.WriteLine($"[OCR DEBUG] Final Selected: '{exactMatch.Normalized}' (EXACT MATCH) similarity={exactMatch.SimilarityScore:F2}");
                    Console.WriteLine($"[OCR DEBUG] === OCR Verification End ===");
                    return (true, exactMatch.Normalized, "Nhận diện biển số xe thành công.");
                }

                // Priority 1b: Exact match even if not valid province (user typed it)
                var exactMatchAny = allCandidates.FirstOrDefault(c => c.IsExactMatch);
                if (exactMatchAny != null)
                {
                    Console.WriteLine($"[OCR DEBUG] Final Selected: '{exactMatchAny.Normalized}' (EXACT MATCH, non-standard province) similarity={exactMatchAny.SimilarityScore:F2}");
                    Console.WriteLine($"[OCR DEBUG] === OCR Verification End ===");
                    return (true, exactMatchAny.Normalized, "Nhận diện biển số xe thành công.");
                }

                // Priority 2: Highest similarity among valid plates (threshold >= 0.7)
                var bestSimilar = allCandidates
                    .Where(c => c.IsValidVietnamese && c.SimilarityScore >= 0.7)
                    .OrderByDescending(c => c.SimilarityScore)
                    .FirstOrDefault();

                if (bestSimilar != null)
                {
                    Console.WriteLine($"[OCR DEBUG] Final Selected: '{bestSimilar.Normalized}' (BEST SIMILARITY) similarity={bestSimilar.SimilarityScore:F2}");
                    Console.WriteLine($"[OCR DEBUG] === OCR Verification End ===");
                    return (true, bestSimilar.Normalized, "Nhận diện biển số xe thành công.");
                }

                // Priority 3: First valid Vietnamese license plate
                var firstValid = allCandidates.FirstOrDefault(c => c.IsValidVietnamese);
                if (firstValid != null)
                {
                    Console.WriteLine($"[OCR DEBUG] Final Selected: '{firstValid.Normalized}' (FIRST VALID) similarity={firstValid.SimilarityScore:F2}");
                    Console.WriteLine($"[OCR DEBUG] === OCR Verification End ===");
                    return (true, firstValid.Normalized, "Nhận diện biển số xe thành công.");
                }

                Console.WriteLine($"[OCR DEBUG] Result: No valid license plate candidate found.");
                Console.WriteLine($"[OCR DEBUG] === OCR Verification End ===");
                return (false, string.Empty, "Unable to detect a valid license plate from the uploaded image.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[OCR ERROR] Exception: {ex.Message}");
                return (false, string.Empty, $"Lỗi hệ thống OCR: {ex.Message}");
            }
        }

        /// <summary>
        /// Computes similarity between two normalized plate strings.
        /// Returns value between 0.0 (completely different) and 1.0 (identical).
        /// Uses character-level comparison for robustness.
        /// </summary>
        private static double ComputeSimilarity(string a, string b)
        {
            if (string.IsNullOrEmpty(a) || string.IsNullOrEmpty(b)) return 0.0;
            if (a == b) return 1.0;

            int maxLen = Math.Max(a.Length, b.Length);
            if (maxLen == 0) return 1.0;

            int distance = LevenshteinDistance(a, b);
            return 1.0 - ((double)distance / maxLen);
        }

        /// <summary>
        /// Classic Levenshtein edit distance.
        /// </summary>
        private static int LevenshteinDistance(string s, string t)
        {
            int n = s.Length;
            int m = t.Length;
            var d = new int[n + 1, m + 1];

            for (int i = 0; i <= n; i++) d[i, 0] = i;
            for (int j = 0; j <= m; j++) d[0, j] = j;

            for (int i = 1; i <= n; i++)
            {
                for (int j = 1; j <= m; j++)
                {
                    int cost = (s[i - 1] == t[j - 1]) ? 0 : 1;
                    d[i, j] = Math.Min(
                        Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1),
                        d[i - 1, j - 1] + cost);
                }
            }

            return d[n, m];
        }
    }
}
