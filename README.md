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

- Tại thư mục đồ án **C:\Workspace\SCHOOL\Đồ án tốt nghiệp 2026\Source\sosanhgia>**

# Kích hoạt môi trường ảo:

```cmd
backend\.venv\Scripts\activate.bat
```

# Cài đặt thư viện:

```cmd
python -m pip install -r backend\requirements.txt
```

# Chạy FastAPI:

```cmd
python -m uvicorn backend.app.main:app --reload
```

# Truy cập Swagger:

```text
http://localhost:8000/docs
```

- Khi trang Swagger hiển thị, Backend FastAPI đã chạy thành công.

# Dừng chương trình

Ctrl + C

### 4.2. Kiểm tra module Scrapy

# Liệt kê danh sách spider:

```cmd
python -m scrapy list
```