import { useMemo, useState } from "react";

const thongKeSanPhamTho = [
  {
    tieuDe: "Tổng sản phẩm thô",
    giaTri: "1.480",
    moTa: "Dữ liệu đã thu thập",
  },
  {
    tieuDe: "Đã gom nhóm",
    giaTri: "930",
    moTa: "Đã liên kết sản phẩm chuẩn hóa",
  },
  {
    tieuDe: "Chưa gom nhóm",
    giaTri: "480",
    moTa: "Cần xử lý gom nhóm",
  },
  {
    tieuDe: "Dữ liệu lỗi",
    giaTri: "70",
    moTa: "Thiếu giá, ảnh hoặc link gốc",
  },
];

const danhSachSanPhamTho = [
  {
    maSP: "RAW-001",
    anh: "📱",
    tenSPGoc: "iPhone 15 128GB Chính hãng VN/A",
    san: "FPT Shop",
    gia: "17.690.000đ",
    danhGia: "4.8",
    trangThai: "Đã gom nhóm",
    loaiSP: "Điện thoại",
    ngayCapNhat: "23:10",
  },
  {
    maSP: "RAW-002",
    anh: "📱",
    tenSPGoc: "Apple iPhone 15 128GB VN/A",
    san: "CellphoneS",
    gia: "17.890.000đ",
    danhGia: "4.7",
    trangThai: "Đã gom nhóm",
    loaiSP: "Điện thoại",
    ngayCapNhat: "22:55",
  },
  {
    maSP: "RAW-003",
    anh: "💻",
    tenSPGoc: "Laptop Acer Aspire 7 Ryzen 5",
    san: "Tiki",
    gia: "13.990.000đ",
    danhGia: "4.6",
    trangThai: "Chưa gom nhóm",
    loaiSP: "Laptop",
    ngayCapNhat: "22:40",
  },
  {
    maSP: "RAW-004",
    anh: "🎧",
    tenSPGoc: "Tai nghe Bluetooth Sony WH-CH520",
    san: "Lazada",
    gia: "990.000đ",
    danhGia: "4.5",
    trangThai: "Chưa gom nhóm",
    loaiSP: "Phụ kiện",
    ngayCapNhat: "22:20",
  },
  {
    maSP: "RAW-005",
    anh: "📱",
    tenSPGoc: "Samsung Galaxy A55 5G 256GB",
    san: "HoangHaMobile",
    gia: "8.990.000đ",
    danhGia: "4.7",
    trangThai: "Dữ liệu lỗi",
    loaiSP: "Điện thoại",
    ngayCapNhat: "21:50",
  },
];

function layClassTrangThaiSanPhamTho(trangThai) {
  if (trangThai === "Đã gom nhóm") return "da-gom-nhom";
  if (trangThai === "Chưa gom nhóm") return "chua-gom-nhom";
  return "du-lieu-loi";
}

function QuanLySanPhamTho() {
  const [tuKhoa, setTuKhoa] = useState("");
  const [sanLoc, setSanLoc] = useState("Tất cả");
  const [trangThaiLoc, setTrangThaiLoc] = useState("Tất cả");
  const [loaiSPLoc, setLoaiSPLoc] = useState("Tất cả");

  const danhSachHienThi = useMemo(() => {
    return danhSachSanPhamTho.filter((sanPham) => {
      const khopTuKhoa =
        sanPham.maSP.toLowerCase().includes(tuKhoa.toLowerCase()) ||
        sanPham.tenSPGoc.toLowerCase().includes(tuKhoa.toLowerCase()) ||
        sanPham.san.toLowerCase().includes(tuKhoa.toLowerCase());

      const khopSan = sanLoc === "Tất cả" || sanPham.san === sanLoc;
      const khopTrangThai =
        trangThaiLoc === "Tất cả" || sanPham.trangThai === trangThaiLoc;
      const khopLoaiSP = loaiSPLoc === "Tất cả" || sanPham.loaiSP === loaiSPLoc;

      return khopTuKhoa && khopSan && khopTrangThai && khopLoaiSP;
    });
  }, [tuKhoa, sanLoc, trangThaiLoc, loaiSPLoc]);

  return (
    <section className="trang-san-pham-tho-admin">
      <h1>Quản lý sản phẩm thô</h1>

      <p className="mo-ta-trang-admin">
        Theo dõi dữ liệu sản phẩm được thu thập trực tiếp từ các sàn TMĐT trước khi chuẩn hóa và gom nhóm.
      </p>

      <div className="luoi-the-san-pham-tho-admin">
        {thongKeSanPhamTho.map((item) => (
          <div className="the-san-pham-tho-admin" key={item.tieuDe}>
            <h3>{item.tieuDe}</h3>
            <strong>{item.giaTri}</strong>
            <p>{item.moTa}</p>
          </div>
        ))}
      </div>

      <div className="thanh-cong-cu-san-pham-tho">
        <div className="o-tim-kiem-san-pham-tho">
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm thô"
            value={tuKhoa}
            onChange={(event) => setTuKhoa(event.target.value)}
          />
          <span>⌕</span>
        </div>

        <div className="select-boc-ngoai">
          <select value={sanLoc} onChange={(event) => setSanLoc(event.target.value)}>
            <option value="Tất cả">Tất cả sàn</option>
            <option value="Lazada">Lazada</option>
            <option value="Tiki">Tiki</option>
            <option value="FPT Shop">FPT Shop</option>
            <option value="CellphoneS">CellphoneS</option>
            <option value="HoangHaMobile">HoangHaMobile</option>
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>

        <div className="select-boc-ngoai">
          <select
            value={trangThaiLoc}
            onChange={(event) => setTrangThaiLoc(event.target.value)}
          >
            <option value="Tất cả">Tất cả trạng thái</option>
            <option value="Đã gom nhóm">Đã gom nhóm</option>
            <option value="Chưa gom nhóm">Chưa gom nhóm</option>
            <option value="Dữ liệu lỗi">Dữ liệu lỗi</option>
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>

        <div className="select-boc-ngoai">
          <select
            value={loaiSPLoc}
            onChange={(event) => setLoaiSPLoc(event.target.value)}
          >
            <option value="Tất cả">Tất cả loại SP</option>
            <option value="Điện thoại">Điện thoại</option>
            <option value="Laptop">Laptop</option>
            <option value="Phụ kiện">Phụ kiện</option>
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>

        <button className="nut-hanh-dong-san-pham-tho" type="button">
          Cập nhật dữ liệu
        </button>

        <button className="nut-hanh-dong-san-pham-tho" type="button">
          Xuất Excel
        </button>
      </div>

      <div className="khu-vuc-danh-sach-san-pham-tho">
        <h2>Danh sách sản phẩm thô</h2>

        <table className="bang-san-pham-tho-admin">
          <thead>
            <tr>
              <th>Mã SP</th>
              <th>Ảnh</th>
              <th>Tên SP gốc</th>
              <th>Sàn</th>
              <th>Giá hiện tại</th>
              <th>Đánh giá</th>
              <th>Trạng thái</th>
              <th>Ngày cập nhật</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {danhSachHienThi.map((sanPham) => (
              <tr key={sanPham.maSP}>
                <td>{sanPham.maSP}</td>
                <td>
                  <span className="anh-san-pham-tho">{sanPham.anh}</span>
                </td>
                <td className="ten-sp-goc">{sanPham.tenSPGoc}</td>
                <td>{sanPham.san}</td>
                <td>{sanPham.gia}</td>
                <td>{sanPham.danhGia}</td>
                <td>
                  <span
                    className={`nhan-san-pham-tho ${layClassTrangThaiSanPhamTho(
                      sanPham.trangThai
                    )}`}
                  >
                    {sanPham.trangThai}
                  </span>
                </td>
                <td>{sanPham.ngayCapNhat}</td>
                <td>
                  <button className="nut-xem-admin" type="button">
                    Xem
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="phan-trang-admin">
          <button type="button">‹</button>
          <span className="trang-dang-chon">1</span>
          <span>2</span>
          <span>3</span>
          <span>...</span>
          <span>5</span>
          <button type="button">›</button>
        </div>
      </div>
    </section>
  );
}

export default QuanLySanPhamTho;