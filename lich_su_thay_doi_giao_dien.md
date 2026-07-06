# Nhật Ký Lịch Sử Phát Triển & Thay Đổi Giao Diện Phân Hệ User

Tài liệu này ghi lại toàn bộ quá trình biến đổi, tinh chỉnh và nâng cấp giao diện phân hệ **User** của dự án **SoSanhGia** từ trạng thái ban đầu cho đến phiên bản hoàn thiện hiện tại, giúp nhóm nắm rõ lịch sử phát triển để làm báo cáo đồ án tốt nghiệp.

---

## Giai Đoạn 1: Thiết lập Bố cục chung & Header / Footer
* **Tách biệt giao diện với Admin**: 
  * Phát hiện giao diện bị bó hẹp trong khung viền đen 1200px (layout của Admin).
  * Chỉnh sửa [index.css](file:///e:/TruongCaodangkythuatCaoThang/ĐATN/GitHub/sosanhgia/frontend/src/index.css) để tách biệt class `.bo-cuc-nguoi-dung` mở rộng 100% chiều ngang màn hình.
  * Cập nhật layout [BoCucNguoiDung.jsx](file:///e:/TruongCaodangkythuatCaoThang/ĐATN/GitHub/sosanhgia/frontend/src/components/user/BoCucNguoiDung.jsx) để bọc các trang User độc lập.
* **Xây dựng Header & Footer mới**:
  * Tạo [DauTrangNguoiDung.jsx](file:///e:/TruongCaodangkythuatCaoThang/ĐATN/GitHub/sosanhgia/frontend/src/components/user/DauTrangNguoiDung.jsx) làm thanh sticky header màu xanh Navy cao cấp. Tích hợp thanh tìm kiếm nhỏ và cơ chế giả lập đăng nhập qua `localStorage` hiển thị menu tài khoản hoặc nút đăng nhập.
  * Tạo [ChanTrangNguoiDung.jsx](file:///e:/TruongCaodangkythuatCaoThang/ĐATN/GitHub/sosanhgia/frontend/src/components/user/ChanTrangNguoiDung.jsx) chân trang hiển thị thông tin giới thiệu, liên kết nhanh, địa chỉ liên hệ và bản quyền đồ án.

---

## Giai Đoạn 2: Dựng các trang tĩnh cốt lõi & Tích hợp Biểu đồ
* **Trang chủ (`TrangChu.jsx`)**: 
  * Dựng banner Hero lớn màu gradient, ô tìm kiếm trung tâm lớn và lưới hiển thị các sản phẩm nổi bật bằng component [TheSanPham.jsx](file:///e:/TruongCaodangkythuatCaoThang/ĐATN/GitHub/sosanhgia/frontend/src/components/user/TheSanPham.jsx).
* **Trang kết quả tìm kiếm (`KetQuaTimKiem.jsx`)**:
  * Thiết kế bố cục 2 cột. Cột trái chứa [BoLocSanPham.jsx](file:///e:/TruongCaodangkythuatCaoThang/ĐATN/GitHub/sosanhgia/frontend/src/components/user/BoLocSanPham.jsx) để lọc giá, sàn, đánh giá. Cột phải là danh sách sản phẩm gom nhóm và các sàn bán xếp dạng lưới bằng component [TheSanPhamOffer.jsx](file:///e:/TruongCaodangkythuatCaoThang/ĐATN/GitHub/sosanhgia/frontend/src/components/user/TheSanPhamOffer.jsx).
* **Trang chi tiết sản phẩm (`ChiTietSanPham.jsx`)**:
  * Xây dựng layout 2 cột: Cột trái ảnh đại diện, cột phải giá bán khuyến mãi tốt nhất, giá gốc, tỷ lệ giảm giá.
  * Tích hợp [BangSoSanhGia.jsx](file:///e:/TruongCaodangkythuatCaoThang/ĐATN/GitHub/sosanhgia/frontend/src/components/user/BangSoSanhGia.jsx) hiển thị danh sách nơi bán xếp tăng dần theo giá.
  * Tích hợp tab thông số kỹ thuật (Accordion Spec) dạng bảng.
* **Tích hợp Biểu đồ lịch sử giá (`BieuDoLichSuGia.jsx` & `BieuDoGia.jsx`)**:
  * Nhúng thư viện **Recharts** vẽ biểu đồ đường tương tác (Line Chart) đa sàn biểu diễn biến động giá, cho phép xem theo mốc 1T, 3T, 6T và làm nổi bật mốc giá thấp nhất lịch sử (All-time low).
* **Quản lý theo dõi giá (`TheoDoiGia.jsx` & `SanPhamTheoDoi.jsx`)**:
  * Xây dựng form nhập giá mong muốn nhận cảnh báo và lưới gợi ý sản phẩm.
  * Xây dựng trang danh sách sản phẩm đang theo dõi thuộc trang cá nhân cho phép sửa giá mong muốn trực tiếp (inline edit).

---

## Giai Đoạn 3: Cải tiến Thanh điều hướng (Navbar)
* **Khắc phục khoảng trống bên phải**:
  * Theo phản hồi của nhóm về khoảng trống trắng bên phải, áp dụng Flexbox `justify-content: space-between` cho các liên kết danh mục (`Điện thoại`, `Máy tính bảng`, `Tivi`...) để dàn đều phủ kín chiều ngang thanh navbar [ThanhDanhMuc.jsx](file:///e:/TruongCaodangkythuatCaoThang/ĐATN/GitHub/sosanhgia/frontend/src/components/user/ThanhDanhMuc.jsx).
* **Menu thả xuống dạng dọc (Vertical Dropdown)**:
  * Nâng cấp nút "Danh mục sản phẩm" thành dropdown dọc hiển thị danh sách toàn bộ danh mục khi rê chuột vào (hover), tăng tính chuyên nghiệp như các trang TMĐT lớn. Bỏ ký tự `>` thừa theo góp ý.

---

## Giai Đoạn 4: Đồng bộ 5 sàn thực tế & Bộ lọc Thương hiệu
* **Đồng bộ hóa 5 sàn thực tế**:
  * Loại bỏ hoàn toàn sàn `Shopee` khỏi hệ thống (do cơ chế chống cào cực mạnh không phù hợp vận hành đồ án thực tế).
  * Cập nhật danh sách 5 sàn đích chính thức: **Lazada, FPT Shop, Tiki, CellphoneS, HoangHa Mobile**.
  * Chuyển đổi dữ liệu mẫu, logo hiển thị và 5 đường vẽ trên biểu đồ Recharts theo 5 sàn mới này.
* **Bổ sung bộ lọc Thương hiệu**:
  * Thêm checklist thương hiệu (`Samsung`, `Apple`, `Lenovo`, `E-Power`) vào sidebar bộ lọc và lập trình chức năng lọc động trên trang tìm kiếm để thỏa mãn 100% yêu cầu đặc tả đề tài.
* **Gỡ nhãn AI**:
  * Gỡ bỏ hoàn toàn các nhãn `"AI Đề xuất"`, `"Gợi ý tốt nhất"` trên card sản phẩm và trang chi tiết sản phẩm.
* **Thay thế danh mục "Mỹ phẩm" thành "Âm thanh"**:
  * Mỹ phẩm không phù hợp với nguồn hàng của CellphoneS, FPT Shop, HoangHa Mobile. Thay thế thành **Âm thanh** (Tai nghe, Loa) để cả 5 sàn đều có hàng và thuật toán so khớp thực thể hoạt động chính xác nhất.

---

## Giai Đoạn 5: Chuẩn Hóa UX Nghiệm Thu Tuần 6 (Yêu cầu của Giảng viên)
* **Nền xanh nhạt cho sản phẩm rẻ nhất**:
  * Đổi màu nền nổi bật của dòng rẻ nhất trong bảng so sánh từ vàng sang màu **xanh dương nhạt dịu mát (`#f0f9ff` kèm viền xanh bên trái `#3b82f6`)** đúng chính xác yêu cầu của thầy.
* **Chặn Double Submit**:
  * Bổ sung trạng thái loading và vô hiệu hóa nút bấm (disabled) kèm **loading spinner** dạng xoay tròn cho tất cả nút bấm hành động (Đăng nhập, Tạo tài khoản, Đăng ký theo dõi, Lưu thay đổi) để tránh lỗi gửi trùng dữ liệu lên server.
* **Skeleton Screens (Hiệu ứng chờ nhấp nháy)**:
  * Xây dựng giao diện Skeleton Shimmer (quét sáng chạy qua) khi tải trang Tìm kiếm (600ms) và trang Chi tiết sản phẩm (800ms) để màn hình không bị trống/đơ.
* **Font chữ Inter & Độ tương phản**:
  * Nhúng font chữ **Inter** thay cho font Arial mặc định.
  * Đổi màu chữ phụ (`--color-text-muted`) sang màu xám đậm hơn (`#475569`) giúp tăng độ tương phản dễ đọc.
* **Quy chuẩn ô nhập giá**:
  * Thêm ký tự **"đ"** cố định ở góc phải bên trong input và thiết lập giới hạn nhập tối đa **200 triệu VNĐ** để ngăn lỗi nhập liệu ảo.

## Giai Đoạn 6: Redesign Banner Trang chủ & Tối ưu tinh tế
* **Banner Hero 2 cột**:
  * Banner Hero trang chủ được chia làm 2 cột: cột trái nội dung/tìm kiếm, cột phải chứa **đồ họa so sánh giá lơ lửng chuyển động (`floating cards`)** kèm biểu đồ cột ẩn dưới dạng 3D Glassmorphism rất bắt mắt.
* **Cảnh báo tìm kiếm rỗng**:
  * Hiển thị Toast warning khi nhấn tìm kiếm nhưng ô nhập đang trống.
* **Cuộn trang mượt mà (Smooth scroll pagination)**:
  * Tự động cuộn trang mượt lên đầu danh sách sản phẩm khi người dùng nhấn nút chuyển trang phân trang.

---

## Phụ Lục: Cấu Trúc Thông Tin, Kết Quả & Mối Liên Kết Giữa Các Trang

Phần này đặc tả chi tiết cấu trúc thông tin hiển thị, kết quả hành động của người dùng và luồng điều hướng (User Flow) giữa các trang của phân hệ User để phục vụ viết Chương 2 của báo cáo.

### 1. Chi tiết Thông tin & Kết quả ở từng trang

#### 1. Trang Chủ (`/` - TrangChu.jsx)
* **Thông tin hiển thị**:
  * Banner giới thiệu dịch vụ (cột trái) và đồ họa lơ lửng so sánh giá đa sàn (cột phải).
  * Thanh tìm kiếm lớn (nhận từ khóa).
  * Danh sách các sản phẩm công nghệ nổi bật được quan tâm nhất (Tên, hãng, khoảng giá từ-đến, logo các sàn đang bán).
* **Kết quả hành động**:
  * Nhập từ khóa $\rightarrow$ Chuyển đến trang **Kết quả tìm kiếm** kèm tham số tìm kiếm.
  * Click chọn danh mục sản phẩm trên navbar hoặc menu thả xuống $\rightarrow$ Chuyển đến trang **Kết quả tìm kiếm** lọc theo danh mục.
  * Click vào một card sản phẩm nổi bật $\rightarrow$ Chuyển đến trang **Chi tiết sản phẩm** tương ứng.

#### 2. Trang Kết quả tìm kiếm (`/tim-kiem` - KetQuaTimKiem.jsx)
* **Thông tin hiển thị**:
  * Đường dẫn bánh mì (Breadcrumb) chỉ vị trí trang.
  * Tiêu đề kết quả kèm bộ đếm số lượng sản phẩm khớp bộ lọc.
  * Cột trái: Bộ lọc nâng cao (Sàn TMĐT, Thương hiệu, Khoảng giá checkbox & khoảng nhập tay đơn vị đ, số sao đánh giá).
  * Cột phải: Danh sách các sản phẩm thô (Offers đơn lẻ) hiển thị giá bán chính xác, mức giảm %, giá gốc gạch ngang, logo sàn bán, link domain sàn và nút CTA (*"Tới nơi bán"* hoặc *"Chọn sản phẩm"*).
  * Phân trang ở cuối lưới sản phẩm.
* **Kết quả hành động**:
  * Tích chọn bộ lọc bên trái và ấn "Áp dụng" $\rightarrow$ Lọc động tức thì danh sách sản phẩm hiển thị.
  * Click vào tiêu đề sản phẩm $\rightarrow$ Chuyển hướng sang trang **Chi tiết sản phẩm** (chuẩn hóa gom nhóm) để xem so sánh đa sàn.
  * Click *"Tới nơi bán"* $\rightarrow$ Mở tab mới dẫn sang link mua hàng gốc của sàn (Affiliate).
  * Click số trang phân trang $\rightarrow$ Tải danh sách trang mới và tự động cuộn mượt màn hình lên đầu danh sách.

#### 3. Trang Chi tiết sản phẩm (`/san-pham/:id` - ChiTietSanPham.jsx)
* **Thông tin hiển thị**:
  * Ảnh sản phẩm lớn, tên sản phẩm, hãng sản xuất, số lượng đánh giá sao.
  * Khung giá tổng quan: Giá rẻ nhất hiện tại, giá gốc hãng công bố, tag phần trăm giảm giá.
  * Các nút CTA: *"Tới nơi bán rẻ nhất"* và *"Theo dõi giảm giá"* (có loading spinner).
  * **Bảng so sánh giá trực quan**: Danh sách các sàn đang kinh doanh sản phẩm này xếp theo giá tăng dần (đơn vị bán rẻ nhất nằm đầu tiên, tô nền xanh dương nhạt và có nhãn *"Giá tốt nhất"*).
  * **Biểu đồ lịch sử giá (Interactive Chart)**: Biểu đồ đường vẽ bằng Recharts thể hiện biến động giá của các sàn qua mốc 1T, 3T, 6T.
  * Bảng thông số kỹ thuật chi tiết của sản phẩm.
* **Kết quả hành động**:
  * Click các hàng nơi bán trong bảng so sánh $\rightarrow$ Điều hướng thẳng sang gian hàng của sàn đó.
  * Click *"Xem lịch sử biến động giá đầy đủ"* $\rightarrow$ Chuyển sang trang **Biểu đồ lịch sử giá** phóng to.
  * Click *"Theo dõi giảm giá"* $\rightarrow$ Tự động tính toán giá mục tiêu giảm 10% và chuyển sang trang **Đăng ký theo dõi giá**.

#### 4. Trang Biểu đồ lịch sử giá (`/san-pham/:id/lich-su-gia` - BieuDoLichSuGia.jsx)
* **Thông tin hiển thị**:
  * Banner tóm tắt sản phẩm (Ảnh, tên, hãng, danh mục, giá rẻ nhất hiện tại).
  * Nút *"Quay lại chi tiết sản phẩm"*.
  * Biểu đồ đường đa tuyến phóng to toàn màn hình hiển thị biến động giá của 5 sàn qua các mốc thời gian.
  * Khung thống kê giá lịch sử: **Thấp nhất lịch sử (All-time low)** và **Cao nhất lịch sử (All-time high)** kèm ngày ghi nhận và sàn bán tương ứng.
* **Kết quả hành động**:
  * Click nút quay lại $\rightarrow$ Trở về trang **Chi tiết sản phẩm** gốc.

#### 5. Trang Đăng ký theo dõi giá (`/theo-doi-gia` - TheoDoiGia.jsx)
* **Thông tin hiển thị**:
  * Ô tìm kiếm sản phẩm thông minh hỗ trợ tự động gợi ý (Autocomplete).
  * Card xem trước sản phẩm được chọn (Ảnh, tên, giá hiện tại).
  * Form điền giá mục tiêu: Ô nhập giá giới hạn tối đa 200tr, có đơn vị đ bên trong, dòng text đề xuất giá giảm 10% tự động.
  * Nút *"Kích hoạt theo dõi giá"* (có loading spinner và disabled khi submit).
  * Lưới danh sách các sản phẩm công nghệ bán chạy gợi ý bên dưới.
* **Kết quả hành động**:
  * Nhấn *"Chọn sản phẩm"* ở lưới gợi ý hoặc click gợi ý tìm kiếm $\rightarrow$ Điền tự động thông tin sản phẩm và giá đề xuất lên form.
  * Submit form $\rightarrow$ Lưu thông tin theo dõi giá vào localStorage và chuyển sang trang **Sản phẩm đang theo dõi**.

#### 6. Trang Quản lý Sản phẩm theo dõi (`/tai-khoan/san-pham-theo-doi` - SanPhamTheoDoi.jsx)
* **Thông tin hiển thị**:
  * Sidebar tài khoản bên trái (Thông tin cá nhân, Sản phẩm theo dõi).
  * Danh sách các sản phẩm đang được giám sát giá tự động ở bên phải: Ảnh, tên sản phẩm, hãng, ngày bắt đầu theo dõi, giá thấp nhất hiện tại và giá mục tiêu mong muốn.
  * Nhãn trạng thái trực quan: **Đã đạt mục tiêu (Xanh lá)** nếu giá hiện tại $\le$ giá mục tiêu, hoặc **Đang theo dõi (Xám)**.
  * Nút hành động: *"Hủy theo dõi"* và *"Sửa giá mong muốn"* (inline edit trực tiếp).
* **Kết quả hành động**:
  * Click *"Sửa"* $\rightarrow$ Hiện ô input thay đổi mức giá ngay trên dòng, ấn Lưu (chặn double submit) để cập nhật giá mục tiêu mới.
  * Click *"Hủy theo dõi"* $\rightarrow$ Xóa sản phẩm khỏi danh sách theo dõi trong tài khoản.

#### 7. Trang Thông tin tài khoản (`/tai-khoan` - ThongTinTaiKhoan.jsx)
* **Thông tin hiển thị**:
  * Sidebar tài khoản bên trái.
  * Thẻ tóm tắt thành viên bên phải (Avatar chữ cái, họ tên, ngày tham gia, số lượng sản phẩm đang theo dõi).
  * Form cập nhật thông tin cá nhân (Họ tên, email) kèm nút Lưu (có loading spinner).
  * Form thay đổi mật khẩu bảo mật (Mật khẩu cũ, mật khẩu mới, xác nhận mật khẩu) kèm nút Thay đổi (có loading spinner).
* **Kết quả hành động**:
  * Lưu thông tin cá nhân $\rightarrow$ Cập nhật họ tên hiển thị trên avatar góc phải Header.
  * Lưu đổi mật khẩu $\rightarrow$ Reset trống các ô mật khẩu đã nhập và toast thành công.

#### 8. Trang Đăng nhập (`/dang-nhap` - DangNhap.jsx) & Đăng ký (`/dang-ky` - DangKy.jsx)
* **Thông tin hiển thị**:
  * Form điền thông tin email, mật khẩu (thêm họ tên, chọn file avatar đối với Đăng ký).
  * Nút submit có spinner xoay tròn và vô hiệu hóa khi đang xử lý (chống double submit).
* **Kết quả hành động**:
  * Đăng nhập thành công $\rightarrow$ Lưu thông tin user vào localStorage, cập nhật header và chuyển hướng về **Trang chủ**.
  * Đăng ký thành công $\rightarrow$ Lưu thông tin đăng ký tạm và chuyển sang trang **Đăng nhập**.

---

### 2. Sơ đồ luồng điều hướng và mối liên kết giữa các trang

Mối liên kết điều hướng của người dùng trên website diễn ra theo chu trình khép kín và nhất quán:

```mermaid
graph TD
    TC[Trang chủ] -->|Tìm kiếm từ khóa / Click danh mục| KQ[Kết quả tìm kiếm]
    TC -->|Click sản phẩm nổi bật| CT[Chi tiết sản phẩm]
    
    KQ -->|Click sản phẩm| CT
    KQ -->|Click Tới nơi bán| SMT[Sàn TMĐT gốc]
    
    CT -->|Click xem lịch sử| LS[Lịch sử biến động giá]
    CT -->|Click Theo dõi giảm giá| TD[Đăng ký theo dõi giá]
    CT -->|Click hàng bảng so sánh| SMT
    
    LS -->|Click Quay lại| CT
    
    TD -->|Submit thành công| SPTD[Sản phẩm đang theo dõi]
    
    SPTD -->|Click tên sản phẩm| CT
    
    DN[Đăng nhập] -->|Success| TC
    DK[Đăng ký] -->|Success| DN
    
    subgraph Trang cá nhân (Yêu cầu đăng nhập)
        SPTD <-->|Sidebar link| TT[Thông tin tài khoản]
    end
    
    CT -.->|Chưa đăng nhập| DN
    TD -.->|Chưa đăng nhập| DN
    TT -.->|Chưa đăng nhập| DN
```

