# 🛒 Ecommerce — Magento 2 + Next.js

Dự án thương mại điện tử tích hợp **Magento 2.4.8** (backend API) và **Next.js** (frontend), vận hành hoàn toàn bằng Docker.

- 🔗 **Repo:** https://github.com/Hardiant2802/Ecommerce
- 🌐 **Domain công khai:** https://ahphonestore.id.vn
- 🌿 **Branch làm việc chính:** `Anhhuy895`

---

## 📋 Mục lục

- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Dành cho thành viên nhóm — Chạy ngay](#-dành-cho-thành-viên-nhóm--chạy-ngay)
- [Cài đặt lần đầu (máy hoàn toàn mới)](#-cài-đặt-lần-đầu-máy-hoàn-toàn-mới)
- [Chạy hàng ngày](#-chạy-hàng-ngày)
- [Deploy web công khai (Tunnel)](#-deploy-web-công-khai-tunnel)
- [Truy cập các dịch vụ](#-truy-cập-các-dịch-vụ)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Các lệnh hữu ích](#-các-lệnh-hữu-ích)
- [Xử lý lỗi thường gặp](#-xử-lý-lỗi-thường-gặp)

---

## 💻 Yêu cầu hệ thống

| Công cụ | Phiên bản tối thiểu | Ghi chú |
|---|---|---|
| Docker | 24+ | Docker Desktop hoặc Docker Engine |
| Docker Compose | V2 (plugin) | Tích hợp sẵn trong Docker Desktop |
| RAM cấp cho Docker | **≥ 6 GB** | Bắt buộc — Magento cần nhiều RAM |
| Node.js | 18+ | Chỉ cần cho frontend |
| npm | 9+ | Chỉ cần cho frontend |
| Git | 2+ | Để clone và pull code |

> **Linux:** Sau khi start containers, chạy thêm lệnh này để thêm IP vào `/etc/hosts`:
> ```bash
> bin/configure-linux
> ```

---

## 🚀 Dành cho thành viên nhóm — Chạy ngay

> Dùng luồng này nếu dự án **đã được setup** trước (có data snapshot từ nhóm).  
> Không cần cài Magento từ đầu, tiết kiệm 30 phút.

### Bước 1 — Clone & checkout đúng branch

```bash
git clone https://github.com/Hardiant2802/Ecommerce.git
cd Ecommerce
git checkout Anhhuy895
```

Hoặc nếu đã clone rồi, chỉ cần pull mới nhất:

```bash
git fetch origin
git checkout Anhhuy895
git pull origin Anhhuy895
```

### Bước 2 — Lấy data snapshot từ nhóm

Tải 2 file snapshot từ Drive/storage chung của nhóm, đặt vào:

```
template/dev/team-data/
├── latest-db.sql.gz      ← database dump
└── latest-media.tar.gz   ← ảnh sản phẩm
```

### Bước 3 — Cài đặt dependencies frontend

```bash
cd frontend
npm install
cp .env.example .env.local
cd ..
```

> Không cần sửa `.env.local`, giá trị mặc định đã trỏ đúng Magento local.

### Bước 4 — Start containers & import data

```bash
# Khởi động toàn bộ Docker services
bin/start

# Import database + media từ snapshot
bin/team-data-import
```

### Bước 5 — Chạy frontend

```bash
cd frontend
npm run dev
```

✅ **Xong!** Truy cập tại:
- **Frontend:** http://localhost:3000
- **Magento Admin:** https://magento.test/admin  
  - User: `john.smith` | Pass: `password123`
- **phpMyAdmin:** http://localhost:8080

---

## 🆕 Cài đặt lần đầu (máy hoàn toàn mới)

> Chỉ thực hiện khi **chưa có snapshot nhóm** hoặc cần reset hoàn toàn.

### Bước 1 — Clone & checkout

```bash
git clone https://github.com/Hardiant2802/Ecommerce.git
cd Ecommerce
git checkout Anhhuy895
```

### Bước 2 — Cấu hình Composer Authentication

Cần tài khoản [Magento Marketplace](https://marketplace.magento.com/) để tải packages.

```bash
bin/setup-composer-auth
```

Nhập **Public Key** và **Private Key** từ tài khoản Marketplace.

### Bước 3 — Chạy setup tự động

```bash
bin/setup
```

Script tự động:
1. Khởi động toàn bộ containers Docker
2. Cài Magento qua Composer (tải ~600MB)
3. Cài database, tạo tài khoản admin
4. Tạo SSL certificate cho `magento.test`
5. Deploy static content, reindex, flush cache

> ⏱️ **Mất khoảng 15–30 phút** tùy tốc độ mạng.

### Bước 4 — Cài đặt frontend

```bash
cd frontend
npm install
cp .env.example .env.local
cd ..
```

---

## 🔄 Chạy hàng ngày

```bash
# Khởi động backend
bin/start

# Chạy frontend (dev mode, hot reload)
cd frontend && npm run dev
```

```bash
# Tắt khi không dùng
bin/stop
```

---

## 🌍 Deploy web công khai (Self-hosted VPS + Tunnel)

Dự án chạy theo mô hình **self-hosted Docker trên VPS**.
Cloudflare chỉ dùng cho **DNS Management** và **Cloudflare Tunnel (Argo)**.
Không dùng Cloudflare Pages/Workers để deploy frontend.

### Khởi động toàn bộ stack (1 lệnh)

```bash
bin/public-up
```

Lệnh này tự động chạy theo thứ tự:
1. Start tất cả Docker containers
2. Start container frontend Next.js (production)
3. Start Cloudflare tunnel → expose `https://ahphonestore.id.vn`

### Tắt stack công khai

```bash
bin/public-down
```

### Chạy riêng từng phần

```bash
bin/tunnel-start              # Chỉ bật tunnel
bin/frontend-start            # Chỉ start frontend container
bin/frontend-start --rebuild  # Rebuild image frontend rồi start
```

### Tóm tắt: Dev vs Public

| | Phát triển cục bộ | Deploy công khai |
|---|---|---|
| **Khởi động** | `bin/start` + `npm run dev` | `bin/public-up` |
| **Frontend mode** | Dev server (hot reload) | Next.js trong Docker |
| **Magento URL** | https://magento.test | https://ahphonestore.id.vn |
| **Frontend URL** | http://localhost:3000 | https://ahphonestore.id.vn (qua tunnel) |
| **Tunnel** | ❌ | ✅ Cloudflare |

---

## 🌐 Truy cập các dịch vụ

| Dịch vụ | URL | Thông tin đăng nhập |
|---|---|---|
| **Next.js Frontend** | http://localhost:3000 | — |
| **Magento Admin** | https://magento.test/admin | `john.smith` / `password123` |
| **Magento Storefront** | https://magento.test | — |
| **phpMyAdmin** | http://localhost:8080 | user: `magento` / pass: `magento` |
| **Web công khai** | https://ahphonestore.id.vn | — |

> **Lỗi SSL trình duyệt?** Bấm **Advanced → Proceed** hoặc cài CA:
> ```bash
> bin/setup-ssl-ca
> ```

---

## 📁 Cấu trúc dự án

```
Ecommerce/
├── bin/                    # Script tiện ích Docker/Magento
├── env/                    # Biến môi trường các service
│   ├── db.env              # MariaDB
│   ├── magento.env         # Magento admin, locale, timezone
│   ├── phpfpm.env          # PHP-FPM
│   ├── opensearch.env      # OpenSearch (search engine)
│   ├── rabbitmq.env        # RabbitMQ (message queue)
│   └── cloudflare.env      # Cloudflare Tunnel token
├── src/                    # Mã nguồn Magento 2
├── frontend/               # Ứng dụng Next.js
│   ├── app/                # App Router (pages, layouts)
│   ├── components/         # React components
│   ├── lib/                # GraphQL queries, utilities
│   └── .env.example        # Template biến môi trường
├── template/dev/team-data/ # Data snapshot nhóm (không commit)
├── compose.yaml            # Docker Compose chính
├── compose.dev.yaml        # Mở rộng dev (bind-mounts)
└── Makefile                # Shortcut lệnh
```

---

## 🛠️ Các lệnh hữu ích

### Docker & Container

```bash
bin/start              # Khởi động tất cả containers
bin/stop               # Dừng tất cả containers
bin/restart            # Restart containers
bin/status             # Xem trạng thái containers
bin/removeall          # Xóa containers + volumes (reset hoàn toàn)
```

### Magento CLI

```bash
bin/magento cache:flush                         # Xóa cache
bin/magento indexer:reindex                     # Reindex
bin/magento setup:upgrade                       # Nâng cấp schema DB
bin/magento setup:static-content:deploy -f      # Deploy static content
bin/magento deploy:mode:set developer           # Bật developer mode
```

### Database & Đồng bộ nhóm

```bash
bin/mysql                  # Vào MySQL shell
bin/mysqldump              # Backup database
bin/team-data-export       # Export snapshot (DB + media) để chia sẻ nhóm
bin/team-data-import       # Import snapshot từ nhóm
```

### Frontend

```bash
cd frontend
npm run dev          # Dev server (http://localhost:3000)
npm run build        # Build production
npm run start        # Chạy production build
npm run lint         # Kiểm tra linting
npm run type-check   # Kiểm tra TypeScript
```

### Production ops (VPS)

```bash
bin/public-health      # Kiểm tra nhanh toàn bộ FE/BE + domain public
bin/backup-db          # Backup database Magento vào backups/db/
bin/install-vps-autostart --start  # Cài systemd autostart và chạy ngay
bin/uninstall-vps-autostart         # Gỡ systemd autostart
```

### Debug & Log

```bash
bin/log                    # Xem tất cả Magento logs
bin/log system.log         # Xem log cụ thể
bin/bash                   # Vào bash trong container
bin/xdebug enable          # Bật Xdebug
```

---

## 🔍 Xử lý lỗi thường gặp

### ❌ "There must be at least 6GB of RAM allocated to Docker"

Docker Desktop không đủ RAM.  
**Sửa:** Docker Desktop → Settings → Resources → tăng Memory lên **≥ 6 GB**.

---

### ❌ Port 80/443 đã bị chiếm

```bash
sudo lsof -i :80
sudo lsof -i :443
# Dừng service đang dùng port đó
```

---

### ❌ Port 3000 đã bị chiếm (Frontend)

```bash
cd frontend
npm run dev -- -p 3001
```

---

### ❌ `bin/start` báo lỗi "missing volume files"

```bash
mkdir -p src/app/code src/app/design src/app/etc \
         src/var src/generated src/pub/static
```

---

### ❌ Frontend không lấy được data (CORS / GraphQL lỗi)

Kiểm tra `frontend/.env.local` trỏ đúng Magento:

```env
NEXT_PUBLIC_MAGENTO_GRAPHQL_URL=http://magento.test/graphql
NEXT_PUBLIC_MAGENTO_API_URL=http://magento.test
```

Đảm bảo Magento đang chạy: `bin/status`

---

### ❌ `bin/team-data-import` báo thiếu file snapshot

Tải lại 2 file từ Drive nhóm và đặt vào `template/dev/team-data/`:
- `latest-db.sql.gz`
- `latest-media.tar.gz`

---

### ❌ Reset hoàn toàn & cài lại từ đầu

```bash
bin/removeall     # ⚠️ Xóa sạch containers + volumes + data
bin/setup         # Cài lại từ đầu
```

> ⚠️ **Cảnh báo:** `bin/removeall` sẽ **xóa toàn bộ database!** Export trước nếu cần giữ data.

---

## 📚 Tài liệu thêm

| File | Nội dung |
|---|---|
| [TEAM_DATA_SYNC.md](./TEAM_DATA_SYNC.md) | Hướng dẫn đồng bộ DB & media trong nhóm |
| [frontend/DEVELOPMENT.md](./frontend/DEVELOPMENT.md) | Workflow phát triển frontend |
| [frontend/GRAPHQL_EXAMPLES.md](./frontend/GRAPHQL_EXAMPLES.md) | Ví dụ GraphQL queries |
| [frontend/TROUBLESHOOTING.md](./frontend/TROUBLESHOOTING.md) | Fix lỗi frontend |

---

> 🔗 Backend được cấu hình từ [markshust/docker-magento](https://github.com/markshust/docker-magento) v52.1.0
