# Hướng Dẫn Fix Vấn Đề Hot Reload

## Vấn đề: Sửa code nhưng F5 không thấy thay đổi

### Giải pháp 1: Hard Refresh Browser (Nhanh nhất) ⭐
```
Chrome/Edge: Ctrl + Shift + R
hoặc: Ctrl + F5
Firefox: Ctrl + Shift + R
```

### Giải pháp 2: Clear Browser Cache
1. Mở DevTools (F12)
2. Right-click vào nút Refresh
3. Chọn "Empty Cache and Hard Reload"

### Giải pháp 3: Restart Dev Server
```bash
# Tìm PID của Next.js dev server
ps aux | grep "next dev"

# Kill process (thay 2086 bằng PID thực tế)
kill -9 2086

# Khởi động lại
cd ~/Ecommerce/frontend
npm run dev
```

### Giải pháp 4: Clear Next.js Cache
```bash
cd ~/Ecommerce/frontend
rm -rf .next
npm run dev
```

## Kiểm Tra Build Pass

```bash
cd ~/Ecommerce/frontend
npm run build
```

Nếu build thành công → code đúng, chỉ là cache issue
Nếu build lỗi → cần fix lỗi trước

## Tips
- Luôn check terminal để thấy hot reload messages
- Nếu thấy "Compiled successfully" → đã reload
- Nếu không thấy message → server có thể bị stuck
- Save file (Ctrl+S) thường tự trigger hot reload
