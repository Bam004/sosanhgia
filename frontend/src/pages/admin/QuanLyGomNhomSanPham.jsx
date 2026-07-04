import { useMemo, useState } from "react";

const thongKeGomNhom = [
  {
    tieuDe: "Chưa gom nhóm",
    giaTri: "360",
    moTa: "Sản phẩm thô cần xử lý",
  },
  {
    tieuDe: "Gợi ý tin cậy cao",
    giaTri: "245",
    moTa: "Độ tương đồng trên 85%",
  },
  {
    tieuDe: "Cần kiểm tra",
    giaTri: "72",
    moTa: "Độ tương đồng trung bình",
  },
  {
    tieuDe: "Đã gom hôm nay",
    giaTri: "128",
    moTa: "Sản phẩm đã xác nhận",
  },
];

const danhSachSanPhamThoChuaGom = [
  {
    maSPT: "RAW-003",
    tenSPT: "Laptop Acer Aspire 7 Ryzen 5",
    san: "Tiki",
    gia: "13.990.000đ",
    trangThai: "Chưa gom nhóm",
  },
  {
    maSPT: "RAW-004",
    tenSPT: "Tai nghe Bluetooth Sony WH-CH520",
    san: "Lazada",
    gia: "990.000đ",
    trangThai: "Chưa gom nhóm",
  },
  {
    maSPT: "RAW-006",
    tenSPT: "iPhone 15 128GB Chính hãng",
    san: "CellphoneS",
    gia: "17.890.000đ",
    trangThai: "Cần kiểm tra",
  },
  {
    maSPT: "RAW-007",
    tenSPT: "Xiaomi Redmi Note 13 256GB",
    san: "HoangHaMobile",
    gia: "4.790.000đ",
    trangThai: "Chưa gom nhóm",
  },
];

const goiYGomNhomTheoSanPham = {
  "RAW-003": [
    {
      maSPCH: "SPCH-003",
      tenSPCH: "Laptop Acer Aspire 7 Ryzen 5",
      loaiHang: "Laptop",
      gia: "13.990.000đ",
      tuongDong: "96%",
    },
    {
      maSPCH: "SPCH-006",
      tenSPCH: "Laptop Acer Aspire 7",
      loaiHang: "Laptop",
      gia: "14.490.000đ",
      tuongDong: "82%",
    },
  ],
  "RAW-004": [
    {
      maSPCH: "SPCH-004",
      tenSPCH: "Tai nghe Bluetooth Sony WH-CH520",
      loaiHang: "Phụ kiện",
      gia: "990.000đ",
      tuongDong: "94%",
    },
    {
      maSPCH: "SPCH-007",
      tenSPCH: "Tai nghe Sony Bluetooth",
      loaiHang: "Phụ kiện",
      gia: "1.090.000đ",
      tuongDong: "78%",
    },
  ],
  "RAW-006": [
    {
      maSPCH: "SPCH-001",
      tenSPCH: "Apple iPhone 15 128GB",
      loaiHang: "Điện thoại",
      gia: "17.690.000đ",
      tuongDong: "91%",
    },
    {
      maSPCH: "SPCH-008",
      tenSPCH: "Apple iPhone 15",
      loaiHang: "Điện thoại",
      gia: "18.290.000đ",
      tuongDong: "84%",
    },
  ],
  "RAW-007": [
    {
      maSPCH: "SPCH-005",
      tenSPCH: "Xiaomi Redmi Note 13 256GB",
      loaiHang: "Điện thoại",
      gia: "4.790.000đ",
      tuongDong: "97%",
    },
    {
      maSPCH: "SPCH-009",
      tenSPCH: "Redmi Note 13",
      loaiHang: "Điện thoại",
      gia: "4.990.000đ",
      tuongDong: "80%",
    },
  ],
};

function layClassTrangThaiGomNhom(trangThai) {
  if (trangThai === "Cần kiểm tra") return "can-kiem-tra";
  return "chua-gom-nhom";
}

function layClassTuongDong(tuongDong) {
  const giaTri = Number(tuongDong.replace("%", ""));

  if (giaTri >= 90) return "cao";
  if (giaTri >= 80) return "trung-binh";
  return "thap";
}

function QuanLyGomNhomSanPham() {
  const [tuKhoa, setTuKhoa] = useState("");
  const [sanLoc, setSanLoc] = useState("Tất cả");
  const [sanPhamDangChon, setSanPhamDangChon] = useState(
    danhSachSanPhamThoChuaGom[0]
  );

  const danhSachHienThi = useMemo(() => {
    return danhSachSanPhamThoChuaGom.filter((sanPham) => {
      const khopTuKhoa =
        sanPham.maSPT.toLowerCase().includes(tuKhoa.toLowerCase()) ||
        sanPham.tenSPT.toLowerCase().includes(tuKhoa.toLowerCase()) ||
        sanPham.san.toLowerCase().includes(tuKhoa.toLowerCase());

      const khopSan = sanLoc === "Tất cả" || sanPham.san === sanLoc;

      return khopTuKhoa && khopSan;
    });
  }, [tuKhoa, sanLoc]);

  const danhSachGoiY =
    goiYGomNhomTheoSanPham[sanPhamDangChon.maSPT] || [];

  return (
    <section className="trang-gom-nhom-admin">
      <h1>Quản lý gom nhóm sản phẩm</h1>

      <p className="mo-ta-trang-admin">
        Kiểm tra và xác nhận các sản phẩm thô được hệ thống gợi ý gom vào sản phẩm chuẩn hóa tương ứng.
      </p>

      <div className="luoi-the-gom-nhom-admin">
        {thongKeGomNhom.map((item) => (
          <div className="the-gom-nhom-admin" key={item.tieuDe}>
            <h3>{item.tieuDe}</h3>
            <strong>{item.giaTri}</strong>
            <p>{item.moTa}</p>
          </div>
        ))}
      </div>

      <div className="bo-cuc-gom-nhom">
        <div className="cot-san-pham-tho-chua-gom">
          <h2>Danh sách sản phẩm thô chưa gom nhóm</h2>

          <div className="thanh-cong-cu-gom-nhom">
            <div className="o-tim-kiem-gom-nhom">
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm thô"
                value={tuKhoa}
                onChange={(event) => setTuKhoa(event.target.value)}
              />
              <span>⌕</span>
            </div>

            <div className="select-boc-ngoai">
              <select
                value={sanLoc}
                onChange={(event) => setSanLoc(event.target.value)}
              >
                <option value="Tất cả">Tất cả sàn</option>
                <option value="Lazada">Lazada</option>
                <option value="Tiki">Tiki</option>
                <option value="FPT Shop">FPT Shop</option>
                <option value="CellphoneS">CellphoneS</option>
                <option value="HoangHaMobile">HoangHaMobile</option>
              </select>
              <span className="mui-ten-select">⌄</span>
            </div>
          </div>

          <table className="bang-san-pham-tho-gom-nhom">
            <thead>
              <tr>
                <th>Mã SPT</th>
                <th>Tên SPT</th>
                <th>Sàn</th>
                <th>Giá</th>
                <th>Trạng thái</th>
              </tr>
            </thead>

            <tbody>
              {danhSachHienThi.map((sanPham) => (
                <tr
                  key={sanPham.maSPT}
                  className={
                    sanPham.maSPT === sanPhamDangChon.maSPT
                      ? "dong-dang-chon"
                      : ""
                  }
                  onClick={() => setSanPhamDangChon(sanPham)}
                >
                  <td>{sanPham.maSPT}</td>
                  <td className="ten-spt-gom-nhom">{sanPham.tenSPT}</td>
                  <td>{sanPham.san}</td>
                  <td>{sanPham.gia}</td>
                  <td>
                    <span
                      className={`nhan-gom-nhom ${layClassTrangThaiGomNhom(
                        sanPham.trangThai
                      )}`}
                    >
                      {sanPham.trangThai}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="phan-trang-admin phan-trang-gom-nhom">
            <button type="button">‹</button>
            <span className="trang-dang-chon">1</span>
            <span>2</span>
            <span>3</span>
            <span>...</span>
            <span>5</span>
            <button type="button">›</button>
          </div>
        </div>

        <div className="cot-goi-y-gom-nhom">
          <h2>Gợi ý gom nhóm</h2>

          <p className="nhan-thong-tin-gom-nhom">Sản phẩm thô đang chọn</p>

          <div className="khung-san-pham-dang-chon">
            <p>
              <span>Tên sản phẩm thô:</span> {sanPhamDangChon.tenSPT}
            </p>
            <p>
              <span>Nguồn:</span> {sanPhamDangChon.san}
            </p>
            <p>
              <span>Giá hiện tại:</span> {sanPhamDangChon.gia}
            </p>
          </div>

          <h3>Sản phẩm chuẩn hóa được gợi ý</h3>

          <table className="bang-goi-y-gom-nhom">
            <thead>
              <tr>
                <th>Mã SPCH</th>
                <th>Tên SPCH</th>
                <th>Loại/Hãng</th>
                <th>Giá</th>
                <th>Tương đồng</th>
                <th>Gắn</th>
              </tr>
            </thead>

            <tbody>
              {danhSachGoiY.map((goiY) => (
                <tr key={goiY.maSPCH}>
                  <td>{goiY.maSPCH}</td>
                  <td className="ten-spch-goi-y">{goiY.tenSPCH}</td>
                  <td>{goiY.loaiHang}</td>
                  <td>{goiY.gia}</td>
                  <td>
                    <span
                      className={`nhan-tuong-dong ${layClassTuongDong(
                        goiY.tuongDong
                      )}`}
                    >
                      {goiY.tuongDong}
                    </span>
                  </td>
                  <td>
                    <button className="nut-gan-gom-nhom" type="button">
                      Gắn
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="phan-trang-admin phan-trang-gom-nhom">
            <button type="button">‹</button>
            <span className="trang-dang-chon">1</span>
            <span>2</span>
            <span>3</span>
            <span>...</span>
            <span>5</span>
            <button type="button">›</button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default QuanLyGomNhomSanPham;

