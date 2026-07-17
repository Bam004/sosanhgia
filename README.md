# SoSanhGia

## 1. Giới thiệu

**SoSanhGia** là website tổng hợp và so sánh giá sản phẩm từ các sàn thương mại điện tử.

Hệ thống hỗ trợ người dùng tìm kiếm sản phẩm, xem thông tin giá từ nhiều nguồn khác nhau, so sánh giá giữa các nơi bán và theo dõi lịch sử biến động giá sản phẩm.

Tên đầy đủ của đề tài:

**Xây dựng website tổng hợp và so sánh giá sản phẩm từ các sàn thương mại điện tử**

---

## 2. Công nghệ sử dụng

### Backend

- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- Alembic
- PostgreSQL

### Scraping

- Scrapy
- Playwright
- Pandas

### Frontend

- ReactJS
- Vite
- React Router DOM
- Axios
- React Toastify
- Recharts
- CSS

### Công cụ hỗ trợ

- Git
- GitHub
- VS Code
- Postman
- PowerShell

---

## 3. Yêu cầu môi trường

Trước khi chạy dự án, cần cài đặt:

- Python 3.10 trở lên
- Node.js 18 trở lên
- PostgreSQL
- Git
- VS Code hoặc IDE tương đương

Kiểm tra phiên bản các công cụ:

```powershell
python --version
node -v
npm -v
git --version
```

---

## 4. Cài đặt và chạy dự án

Vui lòng xem tài liệu chi tiết tại: **[Hướng dẫn Cài đặt và Chạy dự án (dành cho Windows)](docs/HUONG_DAN_CAI_DAT_VA_CHAY_DU_AN.md)**.

Dưới đây là tóm tắt các lệnh chạy hằng ngày (Quick Start) sau khi bạn đã cài đặt xong:

### 1. PostgreSQL + Redis
- Khởi động PostgreSQL service và Redis (ví dụ qua Docker: `docker start redis-server`).

### 2. Backend
Mở Terminal 1:
```powershell
.\backend\.venv\Scripts\Activate.ps1
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001
```

### 3. Worker
Mở Terminal 2:
```powershell
.\backend\.venv\Scripts\Activate.ps1
python -m celery -A backend.app.core.celery_app:celery_app worker --loglevel=INFO --pool=solo
```

### 4. Beat (Định kỳ cảnh báo giá)
Mở Terminal 3:
```powershell
.\backend\.venv\Scripts\Activate.ps1
python -m celery -A backend.app.core.celery_app:celery_app beat --loglevel=INFO
```

### 5. Frontend
Mở Terminal 4:
```powershell
npm --prefix frontend run dev
```
### CHẠY DỰ ÁN
# 1. Terminal 1:
cd "C:\Workspace\SCHOOL\Đồ án tốt nghiệp 2026\Source\sosanhgia"
.\.venv\Scripts\Activate.ps1

python --version
git branch --show-current

# 2. Terminal 2:
wsl -d Ubuntu

sudo service redis-server start
-> Nhập password: 123456

redis-cli ping

# 3. Terminal 3:
cd "C:\Workspace\SCHOOL\Đồ án tốt nghiệp 2026\Source\sosanhgia"
.\.venv\Scripts\Activate.ps1
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000

# 4. Terminal 4:
cd "C:\Workspace\SCHOOL\Đồ án tốt nghiệp 2026\Source\sosanhgia"
.\.venv\Scripts\Activate.ps1
celery -A backend.app.core.celery_app.celery_app worker --loglevel=info --pool=solo

# 5. Terminal 5:
cd "C:\Workspace\SCHOOL\Đồ án tốt nghiệp 2026\Source\sosanhgia\frontend"
npm run dev

# 6. Terminal 6:
cd "C:\Workspace\SCHOOL\Đồ án tốt nghiệp 2026\Source\sosanhgia"
.\.venv\Scripts\Activate.ps1

celery -A backend.app.core.celery_app.celery_app beat --loglevel=info

