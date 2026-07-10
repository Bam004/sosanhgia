# Hướng dẫn khởi chạy hệ thống (Celery, FastAPI, Redis)

Để đảm bảo hệ thống scraping thời gian thực hoạt động đúng với kiến trúc Background Worker (không block API), bạn cần mở 3 Terminal riêng biệt và chạy các dịch vụ sau:

## Terminal 1: Redis Server
Đảm bảo Redis đã được cài đặt và đang chạy.
```bash
# Trên Windows, nếu dùng WSL hoặc Memurai:
redis-server
```

## Terminal 2: FastAPI Backend
Mở thư mục `backend` và khởi chạy server FastAPI.
```bash
cd backend
# Kích hoạt virtual environment nếu có: venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

## Terminal 3: Celery Worker
Mở thư mục `backend`, kích hoạt virtual environment và khởi chạy Celery worker.
Celery worker sẽ lắng nghe Redis và thực thi các SearchJob cạo dữ liệu ngầm.

**Lưu ý cho Windows**: Celery trên Windows cần chạy với pool `solo` (chỉ dùng cho môi trường local development).
```bash
cd backend
# Kích hoạt virtual environment: venv\Scripts\activate
celery -A app.core.celery_app worker --loglevel=info --pool=solo
```

---
**Dấu hiệu hoạt động đúng:**
1. Khi có request `POST /api/search/jobs`, Terminal 2 (FastAPI) sẽ trả về HTTP 201/200 ngay lập tức (dưới 1 giây).
2. Terminal 3 (Celery) sẽ hiện log `Received task: search.run_search_job` và bắt đầu cạo dữ liệu.
3. Khi cạo xong, Terminal 3 sẽ log `Task search.run_search_job... succeeded`.
