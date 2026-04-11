# Setup localhost:3000 trên Windows WSL

## Vấn đề
- ✅ http://172.30.17.77:3000 hoạt động
- ❌ http://localhost:3000 không hoạt động

## Giải pháp: Windows Port Forwarding

### Bước 1: Mở PowerShell với Admin
```
Windows key → gõ "PowerShell" → Right-click → "Run as Administrator"
```

### Bước 2: Chạy lệnh port forwarding
```powershell
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=127.0.0.1 connectport=3000 connectaddress=172.30.17.77
```

### Bước 3: Kiểm tra
```powershell
netsh interface portproxy show all
```

Expected output:
```
Listen on ipv4:         Connect to ipv4:
Address  Port          Address         Port
127.0.0.1  3000        172.30.17.77    3000
```

### Bước 4: Test
Mở browser: http://localhost:3000 ✅

## Xóa rule (nếu cần)
```powershell
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=127.0.0.1
```

## Lưu ý
- Rule persistent (không mất khi restart Windows)
- Nếu WSL IP thay đổi, phải update lại rule
- Check WSL IP: `wsl hostname -I` trong PowerShell

## Alternative: Sử dụng IP trực tiếp
Nếu không muốn setup, cứ dùng:
- http://172.30.17.77:3000

Hoặc tạo bookmark trong browser với tên "localhost"!

