# ⚡ Quick Start — Dành cho thành viên nhóm

## Lần đầu clone về

```bash
git clone https://github.com/Hardiant2802/Ecommerce.git
cd Ecommerce
git checkout Anhhuy895
```

Tải 2 file snapshot từ Drive nhóm, đặt vào `template/dev/team-data/`:
- `latest-db.sql.gz`
- `latest-media.tar.gz`

```bash
# Cài frontend
cd frontend && npm install && cp .env.example .env.local && cd ..

# Start backend + import data
bin/start
bin/team-data-import

# Chạy frontend
cd frontend && npm run dev
```

---

## Mỗi ngày

```bash
bin/start                  # Bật backend
cd frontend && npm run dev  # Bật frontend
```

```bash
bin/stop                   # Tắt khi xong
```

---

## Pull code mới từ nhóm

```bash
git pull origin Anhhuy895
bin/magento setup:upgrade   # Nếu có thay đổi schema DB
bin/magento cache:flush
```

---

## Deploy lên web công khai

```bash
bin/public-up   # Bật tunnel + frontend production
bin/public-down # Tắt
```

🌐 **https://ahphonestore.id.vn**

---

## Truy cập

| | URL | Login |
|---|---|---|
| Frontend | http://localhost:3000 | — |
| Magento Admin | https://magento.test/admin | `john.smith` / `password123` |
| phpMyAdmin | http://localhost:8080 | `magento` / `magento` |

> ⚠️ Cần cấp **≥ 6GB RAM** cho Docker. Chi tiết xem [README.md](./README.md)
