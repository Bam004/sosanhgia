# SoSanhGia

## 1. Giới thiệu SoSanhGia

SoSanhGia là website tổng hợp và so sánh giá sản phẩm từ các sàn thương mại điện tử. Hệ thống hỗ trợ người dùng tìm kiếm sản phẩm, xem thông tin giá từ nhiều nguồn khác nhau và lựa chọn nơi mua phù hợp.

Tên đầy đủ của hệ thống là **SoSanhGia - Website tổng hợp và so sánh giá sản phẩm từ các sàn thương mại điện tử**.

## 2. Mục tiêu hệ thống

- Xây dựng website hỗ trợ người dùng tìm kiếm và so sánh giá sản phẩm từ nhiều sàn thương mại điện tử.
- Thu thập dữ liệu sản phẩm gồm tên sản phẩm, giá, hình ảnh, đánh giá và đường dẫn gốc.
- Chuẩn hóa dữ liệu sản phẩm để phục vụ tìm kiếm, gom nhóm và so sánh giá.
- Xây dựng Backend API để cung cấp dữ liệu cho giao diện người dùng.
- Khởi tạo module Scrapy để chuẩn bị cho chức năng thu thập dữ liệu ở các giai đoạn tiếp theo.

## 3. Công nghệ sử dụng

### Backend

- Python
- FastAPI
- Uvicorn

### Scraping

- Scrapy
- Playwright

### Frontend

- ReactJS
- Tailwind CSS

### Cơ sở dữ liệu

- PostgreSQL
- JSONB

### Công cụ hỗ trợ

- Git
- GitHub
- VS Code

## 4. Hướng dẫn chạy dự án

### 4.1. Chạy Backend FastAPI

#### Bước 1: Mở thư mục dự án

```cmd
cd sosanhgia
```

#### Bước 2: Tạo môi trường ảo


python -m venv backend\.venv


#### Bước 3: Kích hoạt môi trường ảo:


backend\.venv\Scripts\activate.bat


#### Bước 4: Cài đặt thư viện:


python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt


#### Bước 5: Chạy Backend FastAPI:


python -m uvicorn backend.app.main:app --reload


# Truy cập Swagger:


http://localhost:8000/docs


- Khi trang Swagger hiển thị, Backend FastAPI đã chạy thành công.

# Dừng chương trình

Ctrl + C

### 4.2. Kiểm tra module Scrapy

# Liệt kê danh sách spider:

```cmd
python -m scrapy list
```

## 5. Lưu ý cho thành viên khi pull code mới nhất

Sau khi pull code mới nhất từ GitHub về máy, thành viên trong nhóm cần kiểm tra và cập nhật môi trường backend để tránh lỗi khi chạy dự án.

### 5.1. Cập nhật source code mới nhất

Nếu code đã được merge vào nhánh `develop`, chạy:

```cmd
git checkout develop
git pull origin develop
```

Nếu muốn lấy trực tiếp từ nhánh backend CRUD, chạy:

```cmd
git checkout feature/backend-crud
git pull origin feature/backend-crud
```

### 5.2. Kích hoạt môi trường ảo Python

Nếu đã có sẵn môi trường ảo `backend\.venv`, chỉ cần kích hoạt lại:

```cmd
backend\.venv\Scripts\activate.bat
```

Nếu chưa có môi trường ảo, tạo mới bằng lệnh:

```cmd
python -m venv backend\.venv
backend\.venv\Scripts\activate.bat
```

### 5.3. Cài đặt hoặc cập nhật thư viện backend

Sau khi pull code mới, cần chạy lại lệnh cài thư viện để cập nhật các package mới trong `requirements.txt`:

```cmd
python -m pip install -r backend\requirements.txt
```

Lệnh này giúp cài thêm các thư viện cần thiết như FastAPI, SQLAlchemy, Alembic, psycopg2-binary, python-dotenv và các thư viện liên quan.

### 5.4. Tạo file cấu hình `.env`

Mỗi thành viên cần tự tạo file `.env` trong thư mục `backend`:

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

Trong đó, `your_postgres_password` là mật khẩu PostgreSQL trên máy cá nhân của từng thành viên.

Lưu ý: file `.env` không được đưa lên GitHub.

### 5.5. Tạo database PostgreSQL

Trên máy cá nhân, cần tạo database PostgreSQL với tên:

```text
sosanhgia_db
```

Chỉ cần tạo database, không tạo bảng thủ công.

### 5.6. Chạy migration để tạo bảng

Sau khi đã có database và file `.env`, chạy lệnh sau tại thư mục gốc của dự án:

```cmd
python -m alembic upgrade head
```

Lệnh này sẽ tự động tạo các bảng cần thiết trong database, ví dụ:

```text
alembic_version
san_pham_tho
```

### 5.7. Chạy backend để kiểm tra

Chạy FastAPI server:

```cmd
python -m uvicorn backend.app.main:app --reload
```

Mở trình duyệt kiểm tra Swagger:

```text
http://127.0.0.1:8000/docs
```

Nếu Swagger hiển thị danh sách API thì backend đã chạy thành công.