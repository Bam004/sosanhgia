# Hướng dẫn Cài đặt và Chạy Dự án SoSanhGia trên Windows

Tài liệu này hướng dẫn chi tiết cách cài đặt, cấu hình, khởi động và vận hành toàn bộ hệ thống SoSanhGia trên môi trường Windows PowerShell.

## Mục lục

1. [Kiến trúc Chạy Hệ thống](#1-kiến-trúc-chạy-hệ-thống)
2. [Ba Chế độ Chạy](#2-ba-chế-độ-chạy)
3. [Phần mềm Cần Cài](#3-phần-mềm-cần-cài)
4. [Cài đặt Lần đầu](#4-cài-đặt-lần-đầu)
5. [Cấu hình Backend (.env)](#5-cấu-hình-backend-env)
6. [Cấu hình Frontend](#6-cấu-hình-frontend)
7. [PostgreSQL và Migration](#7-postgresql-và-migration)
8. [Khởi động Hệ thống](#8-khởi-động-hệ-thống)
9. [Redis](#9-redis)
10. [SMTP và Email Cảnh báo](#10-smtp-và-email-cảnh-báo)
11. [Kiểm tra Celery](#11-kiểm-tra-celery)
12. [Automated Tests](#12-automated-tests)
13. [Smoke Test Sau Khi Khởi Động](#13-smoke-test-sau-khi-khởi-động)
14. [Dừng Hệ thống](#14-dừng-hệ-thống)
15. [Lỗi Thường Gặp](#15-lỗi-thường-gặp)

---

## 1. Kiến trúc Chạy Hệ thống

Hệ thống SoSanhGia gồm các thành phần sau:
- **PostgreSQL**: Lưu trữ toàn bộ dữ liệu chính (Tài khoản, Sản phẩm, Lịch sử giá, Theo dõi giá, ...).
- **Redis**: Đóng vai trò làm Message Broker cho Celery và bộ nhớ đệm (Cache) cho kết quả tìm kiếm.
- **FastAPI (Backend)**: Xử lý các request từ người dùng, đọc/ghi DB, giao tiếp với Redis và Celery.
- **Celery Worker**: Chạy ngầm các task tốn thời gian như cào dữ liệu (scraping) từ các trang web (Lazada, Tiki, CellphoneS, FPT Shop, Hoàng Hà Mobile), kiểm tra giá đạt ngưỡng và gửi email. *(Lưu ý: Nguồn Shopee hiện bị giới hạn do vướng cơ chế CAPTCHA/anti-bot).*
- **Celery Beat**: Trình lên lịch, định kỳ kích hoạt các task (như kiểm tra cảnh báo giá sau mỗi 30 phút).
- **React/Vite (Frontend)**: Giao diện web hiển thị cho người dùng tương tác.
- **SMTP**: Dịch vụ email bên ngoài (như Gmail) dùng để gửi cảnh báo giá cho người dùng.

### Sơ đồ tương tác luồng dữ liệu cơ bản:
```text
User
→ Frontend
→ FastAPI
→ PostgreSQL
```

### Sơ đồ tương tác Tìm kiếm (Search Background):
```text
FastAPI
→ Redis
→ Celery Worker
→ Scraper
→ PostgreSQL
```

### Sơ đồ tương tác Cảnh báo giá (Price Alert):
```text
Celery Beat (hoặc sau khi scrape hoàn thành)
→ Redis
→ Celery Worker
→ Price Alert Service
→ SMTP
→ Email User
```

---

## 2. Ba Chế độ Chạy

Tuỳ thuộc vào nhu cầu phát triển/kiểm thử, bạn có thể khởi động hệ thống ở một trong 3 chế độ sau:

### A. Chế độ cơ bản
- **Yêu cầu khởi động**: PostgreSQL, Backend, Frontend.
- **Mục đích**: Dùng khi chỉ cần xem dữ liệu tĩnh đã có sẵn trong database (đăng nhập, xem danh sách sản phẩm, biểu đồ).

### B. Chế độ tìm kiếm realtime
- **Yêu cầu khởi động**: PostgreSQL, Redis, Backend, Worker, Frontend.
- **Mục đích**: Dùng khi cần thử tính năng tìm kiếm mới. Hệ thống sẽ cào dữ liệu thời gian thực. (Chưa gửi email cảnh báo giá tự động).

### C. Chế độ phát triển đầy đủ
- **Yêu cầu khởi động**: PostgreSQL, Redis, Backend, Worker, Beat, Frontend. (Cần cấu hình SMTP hợp lệ).
- **Mục đích**: Chạy toàn bộ hệ thống ở chế độ phát triển đầy đủ, bao gồm tự động quét giá định kỳ và gửi cảnh báo email.
*(Lưu ý: Không phải lúc nào phát triển cũng cần mở Beat hoặc SMTP để tránh gửi email rác)*.

---

## 3. Phần mềm Cần Cài

Bạn cần cài đặt các công cụ sau trước khi bắt đầu:

1. **Git**: Dùng để quản lý mã nguồn.
   - Kiểm tra phiên bản: `git --version`
2. **Python**: Python 3.12 được khuyến nghị. Môi trường hiện tại đã kiểm thử bằng Python 3.12.3.
   - Kiểm tra phiên bản: `python --version`
3. **Node.js và npm**: Khuyến nghị dùng bản LTS (ví dụ: v18, v20).
   - Kiểm tra: `node --version` và `npm --version`
4. **PostgreSQL**: Phiên bản 14 trở lên.
   - Kiểm tra: `psql -V`
5. **Redis**: Trên Windows bạn có thể dùng Docker (`docker run -p 6379:6379 -d redis`), cài qua WSL2, hoặc cài native Memurai (tương thích Redis trên Windows).
6. **Playwright (Trình duyệt Scraper)**: Trình duyệt Chromium ngầm dùng để cào dữ liệu. Gói Playwright được cài qua requirements. Trình duyệt Chromium cần được cài riêng: `python -m playwright install chromium`

*Dấu hiệu cài đặt thành công là khi chạy các lệnh kiểm tra trên không bị báo lỗi "command not found".*

---

## 4. Cài đặt Lần đầu

Mở **Windows PowerShell** và chạy lần lượt các lệnh sau (thực hiện ở thư mục mẹ mà bạn muốn chứa project):

```powershell
# 1. Clone repository và chuyển nhánh
git clone https://github.com/Bam004/sosanhgia.git
cd sosanhgia

# 2. Tạo Virtual Environment và kích hoạt
python -m venv backend\.venv
.\backend\.venv\Scripts\Activate.ps1

# 3. Cập nhật pip và cài đặt thư viện Backend
python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt

# 4. Cài đặt trình duyệt ẩn cho Playwright
python -m playwright install chromium

# 5. Cài đặt thư viện Frontend
cd frontend
npm install
cd ..

# 6. Tạo file cấu hình từ file mẫu (.env.example)
Copy-Item -Path "backend\.env.example" -Destination "backend\.env"
Copy-Item -Path "frontend\.env.example" -Destination "frontend\.env"
```

Tiếp theo, bạn mở các file `.env` vừa tạo để chỉnh sửa cấu hình (xem chi tiết ở phần 5 và 6). Sau khi đảm bảo PostgreSQL đã có database `sosanhgia_db`, tiến hành chạy Migration:

```powershell
# Đảm bảo bạn đang đứng ở thư mục gốc (sosanhgia) và .venv đã kích hoạt
python -m alembic upgrade head
```

---

## 5. Cấu hình Backend (.env)

Trong thư mục `backend`, hãy chỉnh sửa tệp `.env`. Tuyệt đối không lưu mật khẩu cá nhân thật lên git.

### Các biến BẮT BUỘC để khởi động hệ thống cơ bản:
**Database:**
- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DB_NAME=sosanhgia_db`
- `DB_USER=postgres`
- `DB_PASSWORD=mat_khau_pg_cua_ban`

**JWT Auth:**
- `JWT_SECRET=chuoi_ky_tu_bi_mat_cho_token`
  *(Để tạo chuỗi bí mật ngẫu nhiên, chạy lệnh: `python -c "import secrets; print(secrets.token_urlsafe(48))"`)*
- `JWT_ALGORITHM=HS256`
- `ACCESS_TOKEN_EXPIRE_DAYS=7`

**Redis / Celery:**
- `REDIS_URL=redis://localhost:6379/0`
- `CELERY_BROKER_URL=redis://localhost:6379/0`
- `CELERY_RESULT_BACKEND=redis://localhost:6379/0`

**Frontend URL:**
- `FRONTEND_URL=http://localhost:5173`

### Các biến TÙY CHỌN (Chỉ cần khi muốn gửi email thật):
**SMTP Email Configuration:**
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_USERNAME=email_cua_ban@gmail.com`
- `SMTP_PASSWORD=mat_khau_ung_dung_gmail_16_ky_tu` *(Là App Password gồm 16 ký tự do Google cấp, không phải mật khẩu đăng nhập Google)*
- `SMTP_FROM_EMAIL=email_cua_ban@gmail.com`
- `SMTP_USE_TLS=True`

---

## 6. Cấu hình Frontend

Trong thư mục `frontend`, mở file `.env` vừa copy, đảm bảo nội dung khai báo đường dẫn tới Backend như sau:

```env
VITE_API_URL=http://127.0.0.1:8001/api
```
*(Lưu ý: Mặc dù mã nguồn React đang có cơ chế fallback mặc định về port `8001` nếu thiếu biến này, nhưng việc cấu hình rõ ràng luôn được khuyến nghị để dễ thay đổi khi test bằng IP LAN hoặc server online).*

---

## 7. PostgreSQL và Migration

- Để kiểm tra PostgreSQL đã chạy, bạn mở công cụ pgAdmin 4 (hoặc DBeaver), đăng nhập bằng tài khoản `postgres`.
- Tạo thủ công một database có tên đúng như trong biến `DB_NAME` (ví dụ: `sosanhgia_db`).
- Khởi tạo các bảng vào database bằng Alembic.

**Lệnh chạy Alembic chính xác (Từ thư mục gốc `sosanhgia`, đang bật `.venv`):**
```powershell
# Áp dụng tất cả các migration mới nhất vào DB
python -m alembic upgrade head

# Xem lịch sử migration hiện tại của hệ thống (bản ghi cuối cùng)
python -m alembic current
```
*(Nếu bạn gặp lỗi liên quan đến file config, đừng thay đổi `backend/alembic.ini`. File chuẩn cho hệ thống đang nằm ở thư mục root `alembic.ini` với cấu hình `script_location = %(here)s/backend/alembic`)*.

---

## 8. Khởi động Hệ thống

Để khởi động toàn bộ, bạn cần mở **4 cửa sổ PowerShell riêng biệt** (nếu Redis chạy qua Docker). Nếu chạy Redis trực tiếp thay vì Docker, bạn cần thêm một terminal nữa. Tại mỗi cửa sổ, đứng tại thư mục gốc `sosanhgia`.

### Terminal 1 — Chạy Backend (FastAPI)
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\backend\.venv\Scripts\Activate.ps1
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001
```
*Dấu hiệu sẵn sàng:* Thấy dòng chữ `Application startup complete.` và truy cập Swagger UI tại `http://127.0.0.1:8001/docs` bình thường.

### Terminal 2 — Chạy Celery Worker
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\backend\.venv\Scripts\Activate.ps1
python -m celery -A backend.app.core.celery_app:celery_app worker --loglevel=INFO --pool=solo
```
*Ghi chú quan trọng:* Vì Celery hiện không hỗ trợ module `fork` trên Windows, chúng ta BẮT BUỘC phải dùng `--pool=solo` để Worker hoạt động đúng cách trên Windows PowerShell.
*Dấu hiệu sẵn sàng:* Có log hiển thị `[tasks]` bao gồm ít nhất 2 task là `search.run_search_job` và `tasks.check_price_alerts`. Cuối log ghi `celery@... ready.`.

### Terminal 3 — Chạy Celery Beat (Tùy chọn)
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\backend\.venv\Scripts\Activate.ps1
python -m celery -A backend.app.core.celery_app:celery_app beat --loglevel=INFO
```
*Dấu hiệu sẵn sàng:* Beat khởi động scheduler và phát task `tasks.check_price_alerts` theo lịch 1800 giây, tức 30 phút.

### Terminal 4 — Chạy Frontend (Vite)
```powershell
npm --prefix frontend run dev
```
*Dấu hiệu sẵn sàng:* Giao diện web hiển thị, truy cập thành công tại `http://localhost:5173/`.

---

## 9. Redis

Redis đóng vai trò sống còn trong hệ thống để kết nối FastAPI và Celery.
- **Phương án khuyến nghị trên Windows**: Chạy Redis qua Docker Desktop.
  - Lần đầu: `docker run --name redis-server -p 6379:6379 -d redis`
  - Những lần sau: `docker start redis-server`
  - Kiểm tra container: `docker ps`
  - Dừng Redis: `docker stop redis-server`
- **Phương án thay thế**: Cài đặt Memurai (Native for Windows) hoặc cài Redis trong WSL2 (Ubuntu).

Để kiểm tra Redis đã kết nối thành công với config của bạn chưa, hãy chạy script PowerShell sau (đảm bảo `.venv` đang bật):

```powershell
@'
import redis
from backend.app.core.config import settings

client = redis.Redis.from_url(settings.REDIS_URL)
print("Redis ping:", client.ping())
'@ | python -
```
Nếu kết quả in ra `Redis ping: True`, nghĩa là Backend và Celery đã có thể liên lạc với nhau.

---

## 10. SMTP và Email Cảnh báo

Để gửi được email thật, bạn không dùng mật khẩu Gmail chính. Bạn phải:
1. Đăng nhập tài khoản Google.
2. Bật tính năng **Xác minh 2 bước (2-Step Verification)**.
3. Tạo **Mật khẩu ứng dụng (App Password)** gồm 16 chữ cái (không dấu cách).
4. Điền 16 chữ cái này vào `SMTP_PASSWORD` trong file `.env`.
5. **Khởi động lại (Restart)** cả Backend, Worker và Beat (nhấn Ctrl+C rồi chạy lại) để hệ thống nhận cấu hình biến môi trường mới.

*Lưu ý:* Việc dùng Gmail gửi thư số lượng lớn hoặc gửi qua localhost có thể bị Google nhận diện nhầm vào mục Spam (Thư rác). Người dùng có thể cần vào mục Spam đánh dấu `Not spam` (Không phải thư rác) để Google tin tưởng hòm thư của bạn trong các lần sau. Để xác minh xem email có gửi đi chưa, bạn hãy kiểm tra xem giá trị cột `daThongBao` trong table `theo_doi_gia` có biến thành `true` không.

---

## 11. Kiểm tra Celery

Đôi lúc bạn muốn kiểm tra xem Celery có cấu hình đúng không mà không cần chờ từ web.

**Kiểm tra nạp Job qua Code:**
```powershell
@'
from backend.app.core.celery_app import celery_app

result = celery_app.send_task("tasks.check_price_alerts")
print("Task queued:", bool(result.id))
'@ | python -
```

**Kiểm tra lịch trình Beat đang lưu:**
```powershell
@'
from backend.app.core.celery_app import celery_app

for name, schedule in celery_app.conf.beat_schedule.items():
    print("Schedule:", name)
    print("Task:", schedule.get("task"))
    print("Interval:", schedule.get("schedule"))
'@ | python -
```
*(Ghi chú: Lệnh `celery_app.send_task()` ở trên trả về một AsyncResult ngay lập tức. Trên thực tế code vận hành, ta không dùng `.get()` để chờ kết quả trực tiếp trong cùng Process API nếu thao tác đó tốn quá nhiều thời gian, vì sẽ gây hiện tượng treo server/deadlock. Ta chỉ dùng `.get()` nếu xử lý nội bộ cực kì nhanh gọn, hoặc dùng cơ chế DB Polling để theo dõi trạng thái như dự án đang áp dụng).*

---

## 12. Automated Tests

Dự án sở hữu các bộ Automated Tests đảm bảo hệ thống Auth và Cảnh báo giá ổn định (Mocking an toàn, không gọi gửi email hay scraper thật).

Để chạy test, gõ (khi `.venv` đang bật):
```powershell
python -m pytest `
  backend/tests/test_auth_api.py `
  backend/tests/test_theo_doi_gia_api.py `
  backend/tests/test_price_alerts.py `
  -v
```
Hoặc để chạy tất cả test trong thư mục tests:
```powershell
python -m pytest backend/tests -v
```
Baseline cốt lõi hiện tại: 21 tests passed
- 9 Auth/role tests
- 6 Price Tracking tests
- 6 Price Alert tests

**Kiểm thử Build Frontend (Mô phỏng Production):**
```powershell
npm --prefix frontend run build
```
*(Nếu cảnh báo bundle size vượt 500kB xuất hiện, hãy yên tâm vì đó chỉ là warning, nó hoàn toàn không làm hỏng file build).*

---

## 13. Smoke Test Sau Khi Khởi Động

Dành cho Tester, hãy làm theo quy trình nhỏ sau để đảm bảo hệ thống đã sống lại 100%:

| Bước | Hành động | URL kiểm tra | Kết quả mong đợi |
|------|----------|--------------|-------------------|
| 1 | Mở Swagger API | `http://127.0.0.1:8001/docs` | Giao diện tài liệu Swagger hiển thị lên, không lỗi Network |
| 2 | Mở Frontend Web | `http://localhost:5173/` | Trang chủ Load thành công |
| 3 | Đăng ký & Đăng nhập | `/dang-ky` và `/dang-nhap` | Tạo tài khoản, đăng nhập trả về Token và lưu Header |
| 4 | Tìm kiếm sản phẩm | Header ô Search (VD: `iPhone 15`) | Màn hình hiển thị "Đang xử lý tìm kiếm", Celery Worker ở terminal in log `Scrape started` |
| 5 | Giao diện so sánh giá | Ấn vào một Card sản phẩm | Bảng so sánh các nơi bán hiển thị từ thấp đến cao |
| 6 | Xem lịch sử giá | Trong trang chi tiết SP | Biểu đồ Line Chart có chấm dữ liệu ngày giờ |
| 7 | Cài theo dõi giá | Ấn "Theo dõi giảm giá" | Chuyển hướng sang `/theo-doi-gia?maSPCH=...`, nhập giá mong muốn và ấn xác nhận. Thông báo "Cập nhật thành công". |
| 8 | Cảnh báo giá | (Gõ giá cao hơn hiện tại 100k) | Worker nhận `tasks.check_price_alerts`, email xuất hiện trong Inbox hoặc Spam, database cập nhật `daThongBao=true` và giao diện hiện “Đã gửi thông báo”. |
| 9 | Đăng xuất | Nhấn Log out ở Sidebar tài khoản | Chuyển trạng thái về trang Đăng nhập / Trang chủ |

---

## 14. Dừng Hệ thống

Khi muốn đóng, hãy nhấn **`Ctrl + C`** ở từng terminal theo thứ tự:
1. Terminal Frontend (Vite)
2. Terminal Celery Beat
3. Terminal Celery Worker *(Cần kiên nhẫn để Worker từ chối nhận thêm Job mới và Gracefully shutdown)*
4. Terminal Backend (Uvicorn)

*PostgreSQL và Redis có thể cứ để chạy ẩn (background service) nếu bạn vẫn dùng máy làm việc liên tục.*

---

## 15. Lỗi Thường Gặp

**1. Lỗi `ModuleNotFoundError: dotenv`**
- **Nguyên nhân**: Bạn chưa kích hoạt môi trường ảo (virtual environment).
- **Khắc phục**: Chạy lệnh kích hoạt `.\backend\.venv\Scripts\Activate.ps1`.

**2. Lỗi `No module named backend.app.celery_app`**
- **Nguyên nhân**: Bạn đang gọi sai cấu trúc gói thư viện.
- **Khắc phục**: Module đúng là `backend.app.core.celery_app:celery_app`. Lệnh chạy Worker phải trỏ từ root của dự án.

**3. Lỗi PowerShell báo ký tự `<` không mong đợi (Unexpected token `<`)**
- **Nguyên nhân**: Bạn sao chép và dán nguyên các block lệnh hướng dẫn có chứa placeholder (như `<module>` hoặc `<password>`).
- **Khắc phục**: Phải xóa và thay chuỗi placeholder bằng thông số thực của máy bạn. Không copy dán mù.

**4. Worker không thấy task `tasks.check_price_alerts`**
- **Nguyên nhân**: Bạn chưa import module chứa task vào list `include=` ở `celery_app.py`, hoặc quên chạy lại (Restart) terminal Worker sau khi sửa code.

**5. Lỗi Redis `Connection refused`**
- **Nguyên nhân**: Redis chưa được bật hoặc URL trong `.env` sai port.

**6. Lỗi SMTP authentication failed**
- **Nguyên nhân**: Dùng mật khẩu đăng nhập Google bình thường hoặc dùng email công ty bị cấm SMTP.
- **Khắc phục**: Dùng App Password gồm 16 ký tự và kiểm tra lại `.env`.

**7. Chờ email mãi không tới**
- **Khắc phục**: Check thư mục Spam của tài khoản nhận. Email vẫn đến bình thường nhưng bộ lọc của Google giữ lại.

**8. Lỗi Backend `port 8001 is already in use`**
- **Nguyên nhân**: Do trước đó quên tắt terminal, hoặc service Uvicorn bị treo.
- **Khắc phục**: Mở Task Manager tìm `python.exe` và tắt (Kill process), hoặc đổi port.

**9. Frontend không hiện data (Báo `Network Error` hoặc `CORS`)**
- **Nguyên nhân**: Có thể Frontend đang trỏ sai `VITE_API_URL` hoặc Backend tắt/sập. Cũng có thể do sai lệch cổng 8000 và 8001 (Backend đang khởi động ở `--port 8001`).

**10. Token API trả lỗi `401 Unauthorized` hoặc `403 Forbidden` liên tục**
- **Nguyên nhân**: Chuỗi `JWT_SECRET` của hệ thống bạn vừa bị đổi, trong khi LocalStorage của browser vẫn ôm token cũ được mã hóa bằng chìa khóa cũ.
- **Khắc phục**: Click Đăng xuất ở giao diện web hoặc tự xóa Storage (F12 > Application > Local Storage > Clear).

**11. Lỗi Alembic `No 'script_location' key found in configuration`**
- **Nguyên nhân**: Bạn gõ lệnh `alembic` khi đứng bên trong folder `backend`.
- **Khắc phục**: `cd ..` để đứng ở thư mục gốc `sosanhgia`, lệnh sẽ tự tìm đúng file `alembic.ini` tổng ở ngoài cùng để điều hướng.

**12. Bị bẩn Git Status hiển thị file `celerybeat-schedule.*`**
- **Nguyên nhân**: Beat lưu lại file schedule DB tại nơi nó chạy.
- **Khắc phục**: Đã thêm ngoại lệ (ignore) `celerybeat-schedule.*` vào tệp `.gitignore`. Bạn không cần lo lắng về file này nữa.

**13. Lỗi (Warning) CR / CRLF liên tục trên terminal Git**
- **Nguyên nhân**: Sự khác biệt format line-ending giữa MacOS/Linux và Windows.
- **Khắc phục**: Kệ nó, Git đã tự lo (autocrlf), không làm hỏng code.

**14. Lỗi (Warning) Pydantic V2 / Deprecation Warning datetime**
- **Nguyên nhân**: Thư viện báo nâng cấp phiên bản trong tương lai.
- **Khắc phục**: Đây chỉ là Warning cảnh báo, không phải Lỗi (Error) chặn chương trình, hiện tại cứ an tâm tiếp tục chạy.
