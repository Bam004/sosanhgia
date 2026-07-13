# Khởi chạy nhanh hệ thống SoSanhGia

Đây là hướng dẫn chạy hằng ngày trên Windows PowerShell.

Tài liệu cài đặt và cấu hình đầy đủ:

[Hướng dẫn Cài đặt và Chạy Dự án](docs/HUONG_DAN_CAI_DAT_VA_CHAY_DU_AN.md)

> Tất cả lệnh dưới đây được chạy từ thư mục gốc của repository `sosanhgia`.

## 1. Dịch vụ cần chạy

Chế độ đầy đủ gồm:

1. PostgreSQL
2. Redis
3. FastAPI Backend
4. Celery Worker
5. Celery Beat
6. React/Vite Frontend

Redis có thể chạy nền bằng Docker. Bốn thành phần Backend, Worker, Beat và Frontend nên chạy ở bốn terminal riêng.

---

## 2. Khởi động Redis

### Lần đầu tạo container

```powershell
docker run --name redis-server -p 6379:6379 -d redis
```

### Những lần chạy sau

```powershell
docker start redis-server
```

### Kiểm tra Redis

Kích hoạt môi trường Backend:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\backend\.venv\Scripts\Activate.ps1
```

Sau đó chạy:

```powershell
@'
import redis
from backend.app.core.config import settings

client = redis.Redis.from_url(settings.REDIS_URL)
print("Redis ping:", client.ping())
'@ | python -
```

Kết quả mong đợi:

```text
Redis ping: True
```

---

## 3. Terminal 1 — FastAPI Backend

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\backend\.venv\Scripts\Activate.ps1

python -m uvicorn backend.app.main:app `
  --reload `
  --host 127.0.0.1 `
  --port 8001
```

Địa chỉ:

* Backend: `http://127.0.0.1:8001`
* Swagger: `http://127.0.0.1:8001/docs`

Dấu hiệu sẵn sàng:

```text
Application startup complete.
```

---

## 4. Terminal 2 — Celery Worker

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\backend\.venv\Scripts\Activate.ps1

python -m celery `
  -A backend.app.core.celery_app:celery_app `
  worker `
  --loglevel=INFO `
  --pool=solo
```

Trên Windows local cần dùng `--pool=solo`.

Worker phải đăng ký tối thiểu:

```text
search.run_search_job
tasks.check_price_alerts
```

Dấu hiệu sẵn sàng:

```text
celery@... ready.
```

---

## 5. Terminal 3 — Celery Beat

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\backend\.venv\Scripts\Activate.ps1

python -m celery `
  -A backend.app.core.celery_app:celery_app `
  beat `
  --loglevel=INFO
```

Beat phát task:

```text
tasks.check_price_alerts
```

theo lịch:

```text
1800 giây = 30 phút
```

Có thể bỏ qua Beat khi không cần kiểm tra cảnh báo giá tự động.

---

## 6. Terminal 4 — Frontend

```powershell
npm --prefix frontend run dev
```

Địa chỉ:

```text
http://localhost:5173
```

---

## 7. Chế độ chạy tối thiểu

Chỉ xem dữ liệu đã có:

```text
PostgreSQL
Backend
Frontend
```

Tìm kiếm realtime:

```text
PostgreSQL
Redis
Backend
Worker
Frontend
```

Chạy đầy đủ:

```text
PostgreSQL
Redis
Backend
Worker
Beat
Frontend
SMTP đã cấu hình
```

---

## 8. Chạy migration

Từ thư mục gốc, khi `.venv` đã được kích hoạt:

```powershell
python -m alembic current
python -m alembic heads
python -m alembic upgrade head
```

Không chạy từ thư mục `backend` nếu cấu hình Alembic chính nằm ở repository root.

---

## 9. Chạy test cốt lõi

```powershell
python -m pytest `
  backend/tests/test_auth_api.py `
  backend/tests/test_theo_doi_gia_api.py `
  backend/tests/test_price_alerts.py `
  -v
```

Baseline hiện tại:

```text
21 passed
```

Build Frontend:

```powershell
npm --prefix frontend run build
```

Cảnh báo bundle lớn hơn 500 kB hiện chưa làm build thất bại.

---

## 10. Kiểm tra nhanh Celery

### Gửi task cảnh báo giá

```powershell
@'
from backend.app.core.celery_app import celery_app

result = celery_app.send_task("tasks.check_price_alerts")
print("Task queued:", bool(result.id))
'@ | python -
```

Quan sát terminal Worker để xác nhận task được nhận và hoàn thành.

### Kiểm tra lịch Beat

```powershell
@'
from backend.app.core.celery_app import celery_app

for name, schedule in celery_app.conf.beat_schedule.items():
    print("Schedule:", name)
    print("Task:", schedule.get("task"))
    print("Interval:", schedule.get("schedule"))
'@ | python -
```

Kết quả phải có:

```text
Schedule: check-price-alerts-every-30-minutes
Task: tasks.check_price_alerts
Interval: 1800.0
```

---

## 11. Dừng hệ thống

Nhấn `Ctrl + C` theo thứ tự:

1. Frontend
2. Celery Beat
3. Celery Worker
4. FastAPI Backend

Nếu không còn sử dụng Redis Docker:

```powershell
docker stop redis-server
```

PostgreSQL có thể tiếp tục chạy dưới dạng Windows Service.

---

## 12. Lỗi thường gặp

### Sai module Celery

Sai:

```text
backend.app.celery_app
app.core.celery_app
```

Đúng:

```text
backend.app.core.celery_app:celery_app
```

### Backend dùng sai port

Port development hiện tại:

```text
8001
```

### Redis không kết nối được

Kiểm tra:

```powershell
docker start redis-server
```

và chạy lại Redis ping.

### Thiếu `dotenv`

Kích hoạt đúng môi trường:

```powershell
.\backend\.venv\Scripts\Activate.ps1
```

### Token cũ bị 401

Xóa `accessToken` và `user` trong Local Storage, sau đó đăng nhập lại.

### Email không xuất hiện trong Inbox

Kiểm tra thư mục Spam. Gmail có thể xếp email từ môi trường local vào Spam.

### Worker không thấy task cảnh báo

Khởi động lại Worker và kiểm tra danh sách `[tasks]` có:

```text
tasks.check_price_alerts
```
