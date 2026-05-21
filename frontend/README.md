# AH Phone Store — Frontend (Next.js 16)

Frontend của [AH Phone Store](https://ahphonestore.id.vn) — cửa hàng điện thoại di động, xây dựng bằng Next.js 16 App Router + TypeScript + Tailwind CSS, kết nối Magento 2 qua GraphQL.

---

## ✨ Tính năng

- **Danh mục sản phẩm** theo brand: Apple, Samsung, Xiaomi, Oppo, OnePlus, Vivo, Asus, Red Magic, Tai nghe, Phụ kiện
- **URL sản phẩm chuẩn:** `/<brand>/<tên-sản-phẩm-có-dấu-gạch>`
- **Chi tiết sản phẩm** với thông số kỹ thuật tự động từ MobileCity API
- **Giỏ hàng** — thêm, xóa, cập nhật số lượng
- **Checkout đa phương thức:**
  - COD (thanh toán khi nhận hàng)
  - Chuyển khoản ngân hàng (QR SePay, đối soát tự động)
  - VNPAY (ATM nội địa, Visa, QR Pay)
- **Tính phí vận chuyển** thực tế: GHN và Viettel Post
- **Đăng nhập / Đăng ký** với OTP qua email
- **Sync Magento:** Tự động tạo order + invoice + chuyển trạng thái `processing` sau thanh toán

---

## � Cấu trúc

```
frontend/
├── app/
│   ├── [brand]/               # Trang danh sách sản phẩm theo brand
│   ├── [brand]/[slug]/        # Chi tiết sản phẩm
│   ├── checkout/              # Trang thanh toán
│   ├── cart/                  # Giỏ hàng
│   ├── login/ register/       # Auth
│   ├── admin/orders/          # Xem đơn hàng (admin)
│   └── api/
│       ├── vnpay/             # Tạo link thanh toán + verify HMAC-SHA512
│       ├── sepay-webhook/     # Nhận webhook đối soát SePay
│       ├── orders/internal/   # CRUD đơn hàng nội bộ (MySQL)
│       ├── shipping/ghn/      # API GHN shipping
│       └── shipping/viettelpost/  # API Viettel Post
├── components/
│   ├── product/               # ProductCard, ProductGrid, ProductDetailClient
│   ├── cart/                  # CartItem, CartSummary
│   ├── layout/                # Navbar, Footer, MobileCityHeader
│   └── ui/                    # Button, Input, ...
├── lib/
│   ├── services/
│   │   ├── magentoSync.ts         # Tạo order/invoice trong Magento
│   │   ├── magentoRealtimeSync.ts # Sync realtime sau thanh toán
│   │   ├── internalOrders.ts      # Quản lý đơn hàng (MySQL)
│   │   └── sepayClient.ts         # Đối soát giao dịch SePay
│   ├── graphql/               # GraphQL client + queries
│   └── utils/
│       └── productRouting.ts  # Logic build URL sản phẩm theo brand
├── types/
│   └── order.ts               # Types: InternalOrder, PaymentMethod, ...
├── .env.local                 # Biến môi trường (không commit)
└── Dockerfile                 # Multi-stage build
```

---

## � Cài đặt & chạy

### Development

```bash
npm install
cp .env.example .env.local
# Điền các biến môi trường cần thiết vào .env.local
npm run dev
```

Truy cập: http://localhost:3000

### Production (Docker)

```bash
# Build từ thư mục gốc E-commerce/
docker build -t e-commerce-frontend:latest ./frontend
docker compose up -d --force-recreate frontend
```

---

## ⚙️ Biến môi trường quan trọng

```env
# Magento GraphQL
NEXT_PUBLIC_MAGENTO_GRAPHQL_URL=https://ahphonestore.id.vn/graphql
MAGENTO_ADMIN_TOKEN=...           # Hoặc dùng username/password bên dưới
MAGENTO_ADMIN_USERNAME=...
MAGENTO_ADMIN_PASSWORD=...

# Ngân hàng nhận tiền
NEXT_PUBLIC_BANK_NAME=BIDV
NEXT_PUBLIC_BANK_ACCOUNT_NO=...
NEXT_PUBLIC_BANK_ACCOUNT_NAME=...
NEXT_PUBLIC_SEPAY_BANK_CODE=BIDV

# SePay (webhook đối soát chuyển khoản)
SEPAY_API_TOKEN=...
SEPAY_WEBHOOK_API_KEY=...
SEPAY_EXPECTED_ACCOUNTS=...       # Số tài khoản nhận tiền, cách nhau bởi dấu phẩy

# VNPAY
VNPAY_TMN_CODE=...
VNPAY_HASH_SECRET=...             # Dùng để verify HMAC-SHA512
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://ahphonestore.id.vn/checkout

# Vận chuyển
GHN_TOKEN=...
GHN_SHOP_ID=...
GHN_FROM_DISTRICT_ID=...
VTP_TOKEN=...

# Lưu đơn hàng nội bộ (MySQL)
INTERNAL_ORDERS_DB_HOST=db
INTERNAL_ORDERS_DB_PORT=3306
INTERNAL_ORDERS_DB_NAME=magento
INTERNAL_ORDERS_DB_USER=magento
INTERNAL_ORDERS_DB_PASSWORD=magento

# Email OTP
SMTP_HOST=smtp.gmail.com
SMTP_USER=...
SMTP_PASS=...
```

---

## 💳 Flow thanh toán

### Chuyển khoản ngân hàng
```
Khách đặt hàng → Tạo internal order (pending) → Hiển thị QR SePay
→ Khách chuyển khoản → SePay gửi webhook → markInternalOrderPaid()
→ syncPaidOrderToMagentoRealtime() → Magento order + invoice + processing
```

### VNPAY
```
Khách chọn VNPAY → Lưu cart data vào sessionStorage
→ Tạo link VNPAY (HMAC-SHA512) → Redirect sang VNPAY
→ VNPAY redirect về /checkout?payment=vnpay&vnp_*=...
→ POST /api/vnpay/verify (verify HMAC server-side)
→ Nếu hợp lệ: POST /api/orders/internal (paymentMethod: 'vnpay')
→ markPaid() + syncPaidOrderToMagentoRealtime()
→ Giảm số lượng giỏ hàng → Hiện màn hình thành công
```

### COD
```
Khách đặt hàng → POST /api/orders/internal (paymentMethod: 'cod')
→ syncInternalOrderToMagento() → Magento order ngay
```

---

## 🔧 Scripts

```bash
npm run dev        # Dev server (http://localhost:3000)
npm run build      # Build production
npm run start      # Chạy production build
npm run lint       # ESLint
```

---

## 🔐 Bảo mật

- **VNPAY:** Verify HMAC-SHA512 phía server tại `/api/vnpay/verify` trước khi tạo order — tránh giả mạo callback
- **SePay webhook:** Xác thực API key qua header `Authorization` + IP whitelist tùy chọn
- **Checkout:** Yêu cầu đăng nhập trước khi thanh toán
- **Secret keys:** Chỉ tồn tại trong `.env.local` (server-side), không expose ra client
