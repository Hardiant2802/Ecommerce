# 🔧 HƯỚNG DẪN FIX LỖI PORT 3000

## ⚠️ VẤN ĐỀ:

Có nhiều process Next.js đang chạy cùng lúc gây xung đột.
Server trả về **500 Internal Server Error** vì Turbopack không tìm thấy PostCSS.

---

## ✅ GIẢI PHÁP (3 BƯỚC ĐƠN GIẢN):

### BƯỚC 1: Mở terminal mới (QUAN TRỌNG!)

Mở terminal **NGOÀI** VS Code hoặc terminal mới trong VS Code.

### BƯỚC 2: Kill TẤT CẢ process Next.js

```bash
# Tìm tất cả process Next.js
ps aux | grep "next dev" | grep -v grep

# Kill từng PID (thay <PID> bằng số thực tế)
kill -9 <PID1> <PID2> <PID3> ...
```

**Ví dụ cụ thể** (dựa trên output hiện tại):

```bash
kill -9 7443 7444 8475 8476 13137 13142 19363 19364 23593 23594 28261 28262
```

Hoặc kill tất cả cùng lúc:

```bash
ps aux | grep "next dev" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null
```

### BƯỚC 3: Verify port đã free và start lại

```bash
# Kiểm tra không còn process nào
ps aux | grep "next dev" | grep -v grep

# Kiểm tra port 3000 đã free
lsof -ti:3000

# Nếu không có output = port free, start server:
cd /home/huydz895/Ecommerce/frontend
npm run dev
```

---

## 📋 CHÚ Ý:

1. **Turbopack đã được TẮT** trong package.json (vì có bug với PostCSS)
2. Server giờ sẽ dùng **Webpack** (chậm hơn nhưng ổn định hơn)
3. Lần đầu start sẽ mất ~1-2 phút để compile

---

## 🎯 KẾT QUẢ MONG ĐỢI:

Sau khi start thành công, bạn sẽ thấy:

```
▲ Next.js 16.2.2
- Local:        http://localhost:3000
- Environments: .env.local

✓ Ready in Xms
```

Mở trình duyệt: **http://localhost:3000**

---

## ⚡ NẾU VẪN KHÔNG WORK:

Thử reinstall dependencies:

```bash
cd /home/huydz895/Ecommerce/frontend
rm -rf node_modules .next
npm install
npm run dev
```

---

## 📝 TẠI SAO CÓ LỖI NÀY?

- Next.js 16 Turbopack có bug với PostCSS trong môi trường này
- Nhiều process Next.js chạy đồng thời từ các lần thử trước
- Các process là "ancestor processes" nên không thể kill từ session hiện tại
