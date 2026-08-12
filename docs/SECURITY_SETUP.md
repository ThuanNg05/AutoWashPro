# Cấu hình secret an toàn

Repository chỉ giữ placeholder trong `backend/appsettings.json`. Không ghi database password, PayOS key, SMTP password hoặc credential khác vào file được Git theo dõi.

## Development với .NET User Secrets

Chạy các lệnh sau từ thư mục gốc và thay `CHANGE_ME` bằng giá trị thật trên máy của bạn:

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "CHANGE_ME" --project backend/Auto-Wash.csproj
dotnet user-secrets set "PayOSSettings:ClientId" "CHANGE_ME" --project backend/Auto-Wash.csproj
dotnet user-secrets set "PayOSSettings:ApiKey" "CHANGE_ME" --project backend/Auto-Wash.csproj
dotnet user-secrets set "PayOSSettings:ChecksumKey" "CHANGE_ME" --project backend/Auto-Wash.csproj
dotnet user-secrets set "Authentication:Google:ClientId" "CHANGE_ME" --project backend/Auto-Wash.csproj
dotnet user-secrets set "Smtp:Username" "CHANGE_ME" --project backend/Auto-Wash.csproj
dotnet user-secrets set "Smtp:Password" "CHANGE_ME" --project backend/Auto-Wash.csproj
dotnet user-secrets set "Smtp:FromEmail" "CHANGE_ME" --project backend/Auto-Wash.csproj
```

Kiểm tra tên key đã được cấu hình mà không đưa giá trị vào commit:

```powershell
dotnet user-secrets list --project backend/Auto-Wash.csproj
```

Frontend chỉ dùng Google OAuth Client ID công khai qua `frontend/.env`; tuyệt đối không đặt client secret hoặc backend key vào biến bắt đầu bằng `VITE_` vì chúng sẽ được đóng gói vào JavaScript gửi cho browser.

## Production

Dùng secret manager của nền tảng triển khai. Nếu nền tảng chỉ hỗ trợ environment variables, ánh xạ dấu `:` thành `__`, ví dụ:

- `ConnectionStrings__DefaultConnection`
- `PayOSSettings__ClientId`
- `PayOSSettings__ApiKey`
- `PayOSSettings__ChecksumKey`
- `Authentication__Google__ClientId`
- `Smtp__Username`
- `Smtp__Password`
- `Smtp__FromEmail`

Với PostgreSQL từ xa, bật xác minh certificate đầy đủ (ví dụ `SSL Mode=VerifyFull`) và không dùng `Trust Server Certificate=true`.

## Trước khi chuyển repository sang public

1. Rotate database password, PayOS API key và PayOS checksum key; xem chúng như đã bị lộ.
2. Kiểm tra audit log của database và PayOS để tìm truy cập/giao dịch bất thường.
3. Xóa `backend/appsettings.json` và `frontend/.env` khỏi toàn bộ Git history bằng `git filter-repo` hoặc BFG, sau khi đã phối hợp với mọi collaborator.
4. Force-push lịch sử mới và yêu cầu mọi collaborator clone lại repository.
5. Bật secret scanning/push protection trên GitHub trước khi đổi visibility.

Rewrite Git history thay đổi commit hash và có thể phá branch/PR cũ; không chạy bước 3-4 nếu chưa tạo backup và chưa thống nhất với nhóm.
