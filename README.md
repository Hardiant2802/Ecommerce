# � AH Phone Store

**AH Phone Store** là website thương mại điện tử chuyên bán điện thoại và phụ kiện di động, xây dựng trên nền tảng **Magento 2** (backend) và **Next.js 16** (frontend).

🌐 **Website:** https://ahphonestore.id.vn

---

## �️ Giới thiệu

AH Phone Store cung cấp trải nghiệm mua sắm hiện đại với giao diện thân thiện, hỗ trợ đầy đủ các tính năng từ duyệt sản phẩm, đặt hàng đến thanh toán trực tuyến — tất cả tích hợp tự động với hệ thống quản lý Magento Admin.

### Danh mục sản phẩm

| Brand | Mô tả |
|---|---|
| 🍎 **Apple / iPhone** | Điện thoại iPhone chính hãng |
| 📱 **Samsung** | Dòng Galaxy flagship và mid-range |
| 🔴 **Xiaomi** | Xiaomi, Redmi, POCO |
| 🟢 **Oppo** | Oppo Series |
| 1+ **OnePlus** | OnePlus flagship |
| 💙 **Vivo** | Vivo Series |
| 🎮 **Red Magic** | Gaming phone Nubia Red Magic |
| 🎧 **Tai nghe** | AirPods, Earbuds, Headphone |
| 🔌 **Phụ kiện** | Sạc, cáp, ốp lưng, kính cường lực |

---

## ✨ Tính năng nổi bật

### 🛍️ Mua sắm
- Tìm kiếm và lọc sản phẩm theo brand, giá
- Xem thông số kỹ thuật chi tiết từ MobileCity
- Xem ảnh sản phẩm nhiều góc
- Thêm vào giỏ hàng, mua ngay

### 💳 Thanh toán
- **Chuyển khoản ngân hàng** — QR động, hệ thống tự động xác nhận qua SePay
- **VNPAY** — ATM nội địa, Visa/Mastercard, QR Pay (bảo mật HMAC-SHA512)
- **COD** — Thanh toán khi nhận hàng

### 🚚 Vận chuyển
- Tính phí ship thực tế theo địa chỉ: **GHN** và **Viettel Post**
- Chọn tỉnh/quận/phường tự động

### 👤 Tài khoản
- Đăng ký với xác thực OTP qua email
- Đăng nhập, quản lý đơn hàng

### ⚡ Tự động hóa backend
- Sau khi thanh toán thành công → tự động tạo đơn hàng trong Magento Admin
- Tự động tạo invoice
- Tự động chuyển trạng thái đơn từ `pending` → `processing`

---

## 🛠️ Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS |
| **Backend/Admin** | Magento 2.4.8 |
| **Database** | MariaDB 11.4 |
| **Search** | OpenSearch |
| **Cache** | Redis (Valkey) |
| **Queue** | RabbitMQ |
| **Hosting** | Docker trên VPS |
| **CDN/SSL** | Cloudflare |
| **Thanh toán** | SePay, VNPAY |
| **Vận chuyển** | GHN API, Viettel Post API |

---

## 📸 Giao diện

- **Trang chủ:** Sản phẩm nổi bật, điều hướng theo brand
- **Danh sách sản phẩm:** Grid 4 cột, phân trang, sắp xếp theo giá/tên
- **Chi tiết sản phẩm:** Ảnh, thông số, đánh giá, sản phẩm tương tự
- **Giỏ hàng & Checkout:** Giao diện 2 cột, hỗ trợ mobile
- **Thanh toán ngân hàng:** QR động với đếm ngược 10 phút, tự xác nhận khi nhận tiền

---

## 🚀 Cài đặt & Chạy (Developer)

### Yêu cầu
- Docker 24+ với ≥ 6GB RAM
- Docker Compose V2

### Chạy local

```bash
git clone https://github.com/Hardiant2802/Ecommerce.git
cd Ecommerce && git checkout Anhhuy895

# Backend (Magento + DB + Redis...)
bin/start

# Frontend
cd frontend && npm install && cp .env.example .env.local
npm run dev
```

### Deploy production

```bash
docker build -t e-commerce-frontend:latest ./frontend
docker compose up -d --force-recreate frontend
```

Chi tiết xem thêm trong [`frontend/README.md`](./frontend/README.md).

---

## 📂 Cấu trúc dự án

```
E-commerce/
├── frontend/           # Next.js 16 (giao diện người dùng)
├── src/                # Magento 2 source code
├── env/                # Cấu hình các Docker service
├── bin/                # Script tiện ích
├── backups/            # Backup DB và media
└── compose.yaml        # Docker Compose
```

---

## 🔗 Liên kết

- **Website:** https://ahphonestore.id.vn
- **Magento Admin:** https://ahphonestore.id.vn/admin
- **Repository:** https://github.com/Hardiant2802/Ecommerce

---

> Được xây dựng với ❤️ sử dụng Next.js và Magento 2
