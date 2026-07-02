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

## 4. Quy trình chạy dự án từ đầu

Khi clone dự án về máy mới, thực hiện theo thứ tự sau.

### Bước 1: Clone source code

```powershell
git clone https://github.com/Bam004/sosanhgia.git
cd sosanhgia
git checkout develop
git pull origin develop
```

### Bước 2: Tạo và kích hoạt môi trường ảo

```powershell
python -m venv .venv
.\.venv\Scripts\activate
```

### Bước 3: Cài đặt thư viện Backend

```powershell
python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt
python -m playwright install
```

### Bước 4: Tạo database PostgreSQL

Tạo database:

```text
sosanhgia_db
```

### Bước 5: Tạo file cấu hình Backend

Tạo file:

```text
backend/.env
```

Nội dung mẫu:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sosanhgia_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
```

### Bước 6: Chạy migration

```powershell
python -m alembic upgrade head
```

### Bước 7: Chạy Backend

```powershell
python -m uvicorn backend.app.main:app --reload
```

Mở Swagger:

```text
http://127.0.0.1:8000/docs
```

### Bước 8: Chạy Frontend

Mở terminal mới, sau đó chạy:

```powershell
cd frontend
npm install
npm run dev
```

Mở website:

```text
http://localhost:5173/
```

---

