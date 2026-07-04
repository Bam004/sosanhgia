import { useMemo, useState } from "react";

const thongKeTienTrinh = [
  {
    tieuDe: "Đang chạy",
    giaTri: "2",
    moTa: "Tiến trình đang thu thập dữ liệu",
  },
  {
    tieuDe: "Hoàn thành hôm nay",
    giaTri: "8",
    moTa: "Tác vụ Scraping đã hoàn tất",
  },
  {
    tieuDe: "Đang chờ",
    giaTri: "3",
    moTa: "Tác vụ trong hàng đợi Redis",
  },
  {
    tieuDe: "Lỗi Scraping hôm nay",
    giaTri: "2",
    moTa: "Cần kiểm tra nhật ký lỗi",
  },
];

const danhSachTienTrinh = [
  {
    maTienTrinh: "JOB-001",
    nguon: "Lazada",
    spider: "lazada_spider",
    trangThai: "Hoàn tất",
    tienDo: 100,
    batDau: "23:00",
    sanPham: 280,
    loi: 0,
  },
  {
    maTienTrinh: "JOB-002",
    nguon: "Tiki",
    spider: "tiki_spider",
    trangThai: "Đang chạy",
    tienDo: 65,
    batDau: "23:10",
    sanPham: 210,
    loi: 0,
  },
  {
    maTienTrinh: "JOB-003",
    nguon: "FPT Shop",
    spider: "fptshop_spider",
    trangThai: "Hoàn tất",
    tienDo: 100,
    batDau: "22:30",
    sanPham: 180,
    loi: 0,
  },
  {
    maTienTrinh: "JOB-004",
    nguon: "CellphoneS",
    spider: "cellphones_spider",
    trangThai: "Có lỗi",
    tienDo: 42,
    batDau: "22:00",
    sanPham: 145,
    loi: 1,
  },
  {
    maTienTrinh: "JOB-005",
    nguon: "HoangHaMobile",
    spider: "hoanghamobile_spider",
    trangThai: "Đang chờ",
    tienDo: 0,
    batDau: "Chưa chạy",
    sanPham: 0,
    loi: 0,
  },
];

function QuanLyTienTrinhScraping() {
  const [tuKhoa, setTuKhoa] = useState("");
  const [nguonLoc, setNguonLoc] = useState("Tất cả");
  const [trangThaiLoc, setTrangThaiLoc] = useState("Tất cả");

  const danhSachHienThi = useMemo(() => {
    return danhSachTienTrinh.filter((tienTrinh) => {
      const khopTuKhoa =
        tienTrinh.maTienTrinh.toLowerCase().includes(tuKhoa.toLowerCase()) ||
        tienTrinh.spider.toLowerCase().includes(tuKhoa.toLowerCase()) ||
        tienTrinh.nguon.toLowerCase().includes(tuKhoa.toLowerCase());

      const khopNguon = nguonLoc === "Tất cả" || tienTrinh.nguon === nguonLoc;

      const khopTrangThai =
        trangThaiLoc === "Tất cả" || tienTrinh.trangThai === trangThaiLoc;

      return khopTuKhoa && khopNguon && khopTrangThai;
    });
  }, [tuKhoa, nguonLoc, trangThaiLoc]);

  return (
    <section className="trang-tien-trinh-admin">
      <h1>Quản lý tiến trình Scraping</h1>

      <p className="mo-ta-trang-admin">
        Theo dõi trạng thái các tác vụ thu thập dữ liệu sản phẩm từ các sàn thương mại điện tử.
      </p>

      <div className="luoi-the-tien-trinh-admin">
        {thongKeTienTrinh.map((item) => (
          <div className="the-tien-trinh-admin" key={item.tieuDe}>
            <h3>{item.tieuDe}</h3>
            <strong>{item.giaTri}</strong>
            <p>{item.moTa}</p>
          </div>
        ))}
      </div>

      <div className="thanh-cong-cu-tien-trinh">
        <div className="o-tim-kiem-tien-trinh">
          <input
            type="text"
            placeholder="Tìm kiếm tiến trình/spider"
            value={tuKhoa}
            onChange={(event) => setTuKhoa(event.target.value)}
          />
          <span>⌕</span>
        </div>

        <div className="select-boc-ngoai">
          <select
            value={nguonLoc}
            onChange={(event) => setNguonLoc(event.target.value)}
          >
            <option value="Tất cả">Tất cả nguồn</option>
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
            <option value="Đang chạy">Đang chạy</option>
            <option value="Hoàn tất">Hoàn tất</option>
            <option value="Đang chờ">Đang chờ</option>
            <option value="Có lỗi">Có lỗi</option>
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>

        <button className="nut-hanh-dong-tien-trinh" type="button">
          Làm mới
        </button>

        <button className="nut-hanh-dong-tien-trinh" type="button">
          Chạy tất cả
        </button>

        <button className="nut-hanh-dong-tien-trinh" type="button">
          Tạm dừng tất cả
        </button>
      </div>

      <div className="khu-vuc-danh-sach-tien-trinh">
        <h2>Danh sách tiến trình Scraping</h2>

        <table className="bang-tien-trinh-scraping-admin">
          <thead>
            <tr>
              <th>Mã tiến trình</th>
              <th>Nguồn</th>
              <th>Spider</th>
              <th>Trạng thái</th>
              <th>Tiến độ</th>
              <th>Bắt đầu</th>
              <th>Sản phẩm</th>
              <th>Lỗi</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {danhSachHienThi.map((tienTrinh) => (
              <tr key={tienTrinh.maTienTrinh}>
                <td>{tienTrinh.maTienTrinh}</td>
                <td>{tienTrinh.nguon}</td>
                <td>{tienTrinh.spider}</td>
                <td>
                  <span
                    className={`nhan-tien-trinh ${tienTrinh.trangThai
                      .toLowerCase()
                      .replaceAll(" ", "-")}`}
                  >
                    {tienTrinh.trangThai}
                  </span>
                </td>
                <td>
                  <div className="thanh-tien-do-admin">
                    <div
                      className="muc-tien-do-admin"
                      style={{ width: `${tienTrinh.tienDo}%` }}
                    ></div>
                  </div>
                  <span className="so-tien-do-admin">{tienTrinh.tienDo}%</span>
                </td>
                <td>{tienTrinh.batDau}</td>
                <td>{tienTrinh.sanPham}</td>
                <td>{tienTrinh.loi}</td>
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

export default QuanLyTienTrinhScraping;

