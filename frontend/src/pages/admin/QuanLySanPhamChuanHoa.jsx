import { useMemo, useState } from "react";

const thongKeSanPhamChuanHoa = [
  {
    tieuDe: "Sản phẩm chuẩn hóa",
    giaTri: "460",
    moTa: "Đã tạo nhóm sản phẩm",
  },
  {
    tieuDe: "Đã liên kết nguồn bán",
    giaTri: "1.180",
    moTa: "Sản phẩm thô đã gom nhóm",
  },
  {
    tieuDe: "Chưa đủ nguồn so sánh",
    giaTri: "65",
    moTa: "Chỉ có dữ liệu từ 1 sàn",
  },
  {
    tieuDe: "Cần kiểm tra",
    giaTri: "18",
    moTa: "Có khả năng gom nhóm sai",
  },
];

const danhSachSanPhamChuanHoa = [
  {
    maSPCH: "SPCH-001",
    anh: "📱",
    tenChuanHoa: "Apple iPhone 15 128GB",
    loai: "Điện thoại",
    thuongHieu: "Apple",
    giaThapNhat: "17.690.000đ",
    giaCaoNhat: "17.890.000đ",
    nguonBan: 3,
    trangThai: "Đủ nguồn",
  },
  {
    maSPCH: "SPCH-002",
    anh: "📱",
    tenChuanHoa: "Samsung Galaxy A55 5G 256GB",
    loai: "Điện thoại",
    thuongHieu: "Samsung",
    giaThapNhat: "8.990.000đ",
    giaCaoNhat: "9.490.000đ",
    nguonBan: 2,
    trangThai: "Đủ nguồn",
  },
  {
    maSPCH: "SPCH-003",
    anh: "💻",
    tenChuanHoa: "Laptop Acer Aspire 7 Ryzen 5",
    loai: "Laptop",
    thuongHieu: "Acer",
    giaThapNhat: "13.990.000đ",
    giaCaoNhat: "14.490.000đ",
    nguonBan: 2,
    trangThai: "Đủ nguồn",
  },
  {
    maSPCH: "SPCH-004",
    anh: "🎧",
    tenChuanHoa: "Tai nghe Bluetooth Sony WH-CH520",
    loai: "Phụ kiện",
    thuongHieu: "Sony",
    giaThapNhat: "990.000đ",
    giaCaoNhat: "990.000đ",
    nguonBan: 1,
    trangThai: "Chưa đủ nguồn",
  },
  {
    maSPCH: "SPCH-005",
    anh: "📱",
    tenChuanHoa: "Xiaomi Redmi Note 13 256GB",
    loai: "Điện thoại",
    thuongHieu: "Xiaomi",
    giaThapNhat: "4.790.000đ",
    giaCaoNhat: "5.290.000đ",
    nguonBan: 4,
    trangThai: "Cần kiểm tra",
  },
];

function layClassTrangThaiSPCH(trangThai) {
  if (trangThai === "Đủ nguồn") return "du-nguon";
  if (trangThai === "Chưa đủ nguồn") return "chua-du-nguon";
  return "can-kiem-tra";
}

function QuanLySanPhamChuanHoa() {
  const [tuKhoa, setTuKhoa] = useState("");
  const [loaiLoc, setLoaiLoc] = useState("Tất cả");
  const [thuongHieuLoc, setThuongHieuLoc] = useState("Tất cả");
  const [trangThaiLoc, setTrangThaiLoc] = useState("Tất cả");

  const danhSachHienThi = useMemo(() => {
    return danhSachSanPhamChuanHoa.filter((sanPham) => {
      const khopTuKhoa =
        sanPham.maSPCH.toLowerCase().includes(tuKhoa.toLowerCase()) ||
        sanPham.tenChuanHoa.toLowerCase().includes(tuKhoa.toLowerCase()) ||
        sanPham.thuongHieu.toLowerCase().includes(tuKhoa.toLowerCase());

      const khopLoai = loaiLoc === "Tất cả" || sanPham.loai === loaiLoc;

      const khopThuongHieu =
        thuongHieuLoc === "Tất cả" || sanPham.thuongHieu === thuongHieuLoc;

      const khopTrangThai =
        trangThaiLoc === "Tất cả" || sanPham.trangThai === trangThaiLoc;

      return khopTuKhoa && khopLoai && khopThuongHieu && khopTrangThai;
    });
  }, [tuKhoa, loaiLoc, thuongHieuLoc, trangThaiLoc]);

  return (
    <section className="trang-san-pham-chuan-hoa-admin">
      <h1>Quản lý sản phẩm chuẩn hóa</h1>

      <p className="mo-ta-trang-admin">
        Quản lý các sản phẩm đã được chuẩn hóa và gom nhóm từ dữ liệu sản phẩm thô của nhiều sàn TMĐT.
      </p>

      <div className="luoi-the-san-pham-chuan-hoa-admin">
        {thongKeSanPhamChuanHoa.map((item) => (
          <div className="the-san-pham-chuan-hoa-admin" key={item.tieuDe}>
            <h3>{item.tieuDe}</h3>
            <strong>{item.giaTri}</strong>
            <p>{item.moTa}</p>
          </div>
        ))}
      </div>

      <div className="thanh-cong-cu-san-pham-chuan-hoa">
        <div className="o-tim-kiem-san-pham-chuan-hoa">
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm chuẩn hóa"
            value={tuKhoa}
            onChange={(event) => setTuKhoa(event.target.value)}
          />
          <span>⌕</span>
        </div>

        <div className="select-boc-ngoai">
          <select value={loaiLoc} onChange={(event) => setLoaiLoc(event.target.value)}>
            <option value="Tất cả">Tất cả loại SP</option>
            <option value="Điện thoại">Điện thoại</option>
            <option value="Laptop">Laptop</option>
            <option value="Phụ kiện">Phụ kiện</option>
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>

        <div className="select-boc-ngoai">
          <select
            value={thuongHieuLoc}
            onChange={(event) => setThuongHieuLoc(event.target.value)}
          >
            <option value="Tất cả">Tất cả thương hiệu</option>
            <option value="Apple">Apple</option>
            <option value="Samsung">Samsung</option>
            <option value="Acer">Acer</option>
            <option value="Sony">Sony</option>
            <option value="Xiaomi">Xiaomi</option>
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>

        <div className="select-boc-ngoai">
          <select
            value={trangThaiLoc}
            onChange={(event) => setTrangThaiLoc(event.target.value)}
          >
            <option value="Tất cả">Tất cả trạng thái</option>
            <option value="Đủ nguồn">Đủ nguồn</option>
            <option value="Chưa đủ nguồn">Chưa đủ nguồn</option>
            <option value="Cần kiểm tra">Cần kiểm tra</option>
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>

        <button className="nut-hanh-dong-san-pham-chuan-hoa" type="button">
          Xuất Excel
        </button>
      </div>

      <div className="khu-vuc-danh-sach-san-pham-chuan-hoa">
        <h2>Danh sách sản phẩm chuẩn hóa</h2>

        <table className="bang-san-pham-chuan-hoa-admin">
          <thead>
            <tr>
              <th>Mã SPCH</th>
              <th>Ảnh</th>
              <th>Tên chuẩn hóa</th>
              <th>Loại</th>
              <th>Thương hiệu</th>
              <th>Giá thấp nhất</th>
              <th>Giá cao nhất</th>
              <th>Nguồn bán</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {danhSachHienThi.map((sanPham) => (
              <tr key={sanPham.maSPCH}>
                <td>{sanPham.maSPCH}</td>
                <td>
                  <span className="anh-san-pham-chuan-hoa">{sanPham.anh}</span>
                </td>
                <td className="ten-sp-chuan-hoa">{sanPham.tenChuanHoa}</td>
                <td>{sanPham.loai}</td>
                <td>{sanPham.thuongHieu}</td>
                <td>{sanPham.giaThapNhat}</td>
                <td>{sanPham.giaCaoNhat}</td>
                <td>{sanPham.nguonBan}</td>
                <td>
                  <span
                    className={`nhan-san-pham-chuan-hoa ${layClassTrangThaiSPCH(
                      sanPham.trangThai
                    )}`}
                  >
                    {sanPham.trangThai}
                  </span>
                </td>
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

export default QuanLySanPhamChuanHoa;

