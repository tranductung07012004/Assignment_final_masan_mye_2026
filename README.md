# FINAL ASSESSMENT MASAN MYE 2026 - TRAN DUC TUNG

Ứng dụng chat real-time gồm:

- **backend/** — Spring Boot (Java 17, Maven), WebSocket + REST, chạy port `8080`
- **frontend/** — React + Vite (TypeScript)
- **Hạ tầng** — PostgreSQL, Redis (qua Docker Compose), Nginx (load-balancer cho chế độ full stack)

---

## Yêu cầu

- Docker & Docker Compose
- JDK 17 + Maven (đã có `mvnw`) — chỉ cần khi chạy backend trên IDE
- Node.js 18+ và npm — chỉ cần khi chạy frontend ở chế độ dev
- Tài khoản Cloudinary (cho upload ảnh/video)

---

## Cách chạy

Có 2 chế độ. Mọi lệnh `docker compose` chạy trong thư mục `backend/`.

### 1. Local dev (backend + frontend chạy trên IDE)

Chế độ này chỉ bật Redis + PostgreSQL bằng Docker, còn backend và frontend chạy trực tiếp để dễ debug / hot-reload.

**Bước 1 — Bật Redis + Database:**

```bash
cd backend
docker compose up -d
```

→ Redis ở `localhost:6379`, PostgreSQL ở `localhost:5432` (DB `db`, user `user`, password `123`, đã tự seed schema + dữ liệu mẫu).

**Bước 2 — Cấu hình & chạy backend:**

Tạo file `backend/.env` với các biến sau rồi điền giá trị:

```env
JWT_SECRET=<chuỗi-bí-mật-jwt>
DB_URL=jdbc:postgresql://localhost:5432/db
DB_USERNAME=user
DB_PASSWORD=123
SERVER_PORT=8080
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
```

Chạy backend:

```bash
cd backend
./mvnw spring-boot:run
```

(hoặc Run `ChatApplication` trong IDE) → backend chạy ở `http://localhost:8080`.

**Bước 3 — Chạy frontend:**

```bash
cd frontend
cp .env.example .env   # để VITE_API_BASE_URL trống -> Vite proxy /api -> localhost:8080
npm install
npm run dev
```

→ frontend chạy ở `http://localhost:5173` (Vite tự proxy API/WS sang `localhost:8080`).

### 2. Full Docker stack (backend + frontend + nginx trong Docker)

Chế độ này build và chạy tất cả trong Docker, truy cập qua Nginx ở port `80`.

**Bước 1 — Tạo file secret cho backend:**

```bash
cd backend
cp .env.prod.example .env.prod
```

Mở `.env.prod` và điền: `JWT_SECRET`, `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `REDIS_HOST`, `SERVER_PORT`, và 3 biến `CLOUDINARY_*`.

> Vì chạy chung Docker network: `DB_URL=jdbc:postgresql://database:5432/db` và `REDIS_HOST=redis`.

**Bước 2 — Build & chạy toàn bộ:**

```bash
docker compose --profile prod up -d --build
```

Chạy nhiều instance backend (đằng sau Nginx) để test load-balancing:

```bash
docker compose --profile prod up -d --build --scale app=3
```

→ Mở app tại `http://localhost`.

---

## Dừng

```bash
cd backend
docker compose --profile prod down        # dừng full stack
# docker compose down                      # dừng chế độ local dev (redis + db)
# thêm -v để xoá luôn dữ liệu (volumes): docker compose down -v
```
