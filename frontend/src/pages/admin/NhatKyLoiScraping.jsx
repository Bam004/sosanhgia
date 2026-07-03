import { useMemo, useState } from "react";

const thongKeLoi = [
  {
    tieuDe: "Tổng lỗi hôm nay",
    giaTri: "12",
    moTa: "Phát sinh trong 24h qua",
  },
  {
    tieuDe: "Lỗi chưa xử lý",
    giaTri: "5",
    moTa: "Cần admin kiểm tra",
  },
  {
    tieuDe: "Lỗi nghiêm trọng",
    giaTri: "2",
    moTa: "Ảnh hưởng đến tiến trình",
  },
  {
    tieuDe: "Đã xử lý",
    giaTri: "7",
    moTa: "Lỗi đã được khắc phục",
  },
];

const danhSachLoi = [
  {
    maLoi: "ERR-001",
    thoiGian: "23:20",
    nguon: "CellphoneS",
    spider: "cellphones_spider",
    loaiLoi: "Selector thay đổi",
    mucDo: "Cao",
    trangThai: "Chưa xử lý",
  },
  {
    maLoi: "ERR-002",
    thoiGian: "22:45",
    nguon: "HoangHaMobile",
    spider: "hoanghamobile_spider",
    loaiLoi: "Timeout",
    mucDo: "Trung bình",
    trangThai: "Chưa xử lý",
  },
  {
    maLoi: "ERR-003",
    thoiGian: "21:30",
    nguon: "Lazada",
    spider: "lazada_spider",
    loaiLoi: "Render JavaScript",
    mucDo: "Cao",
    trangThai: "Đã xử lý",
  },
  {
    maLoi: "ERR-004",
    thoiGian: "20:15",
    nguon: "Tiki",
    spider: "tiki_spider",
    loaiLoi: "Dữ liệu thiếu",
    mucDo: "Thấp",
    trangThai: "Đã xử lý",
  },
  {
    maLoi: "ERR-005",
    thoiGian: "19:40",
    nguon: "FPT Shop",
    spider: "fptshop_spider",
    loaiLoi: "Sai định dạng giá",
    mucDo: "Trung bình",
    trangThai: "Chưa xử lý",
  },
];

function layClassMucDo(mucDo) {
  if (mucDo === "Cao") return "cao";
  if (mucDo === "Trung bình") return "trung-binh";
  return "thap";
}

function layClassTrangThai(trangThai) {
  return trangThai === "Đã xử lý" ? "da-xu-ly" : "chua-xu-ly";
}

function NhatKyLoiScraping() {
  const [tuKhoa, setTuKhoa] = useState("");
  const [nguonLoc, setNguonLoc] = useState("Tất cả");
  const [loaiLoiLoc, setLoaiLoiLoc] = useState("Tất cả");
  const [trangThaiLoc, setTrangThaiLoc] = useState("Tất cả");

  const danhSachHienThi = useMemo(() => {
    return danhSachLoi.filter((loi) => {
      const khopTuKhoa =
        loi.maLoi.toLowerCase().includes(tuKhoa.toLowerCase()) ||
        loi.spider.toLowerCase().includes(tuKhoa.toLowerCase()) ||
        loi.nguon.toLowerCase().includes(tuKhoa.toLowerCase()) ||
        loi.loaiLoi.toLowerCase().includes(tuKhoa.toLowerCase());

      const khopNguon = nguonLoc === "Tất cả" || loi.nguon === nguonLoc;
      const khopLoaiLoi = loaiLoiLoc === "Tất cả" || loi.loaiLoi === loaiLoiLoc;
      const khopTrangThai =
        trangThaiLoc === "Tất cả" || loi.trangThai === trangThaiLoc;

      return khopTuKhoa && khopNguon && khopLoaiLoi && khopTrangThai;
    });
  }, [tuKhoa, nguonLoc, loaiLoiLoc, trangThaiLoc]);

  return (
    <section className="trang-nhat-ky-loi-admin">
      <h1>Quản lý nhật ký lỗi Scraping</h1>

      <p className="mo-ta-trang-admin">
        Theo dõi các lỗi phát sinh trong quá trình thu thập dữ liệu từ các sàn thương mại điện tử.
      </p>

      <div className="luoi-the-loi-admin">
        {thongKeLoi.map((item) => (
          <div className="the-loi-admin" key={item.tieuDe}>
            <h3>{item.tieuDe}</h3>
            <strong>{item.giaTri}</strong>
            <p>{item.moTa}</p>
          </div>
        ))}
      </div>

      <div className="thanh-cong-cu-loi">
        <div className="o-tim-kiem-loi">
          <input
            type="text"
            placeholder="Tìm kiếm lỗi, Spider/nguồn cào"
            value={tuKhoa}
            onChange={(event) => setTuKhoa(event.target.value)}
          />
          <span>⌕</span>
        </div>

        <div className="select-boc-ngoai">
          <select value={nguonLoc} onChange={(event) => setNguonLoc(event.target.value)}>
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
            value={loaiLoiLoc}
            onChange={(event) => setLoaiLoiLoc(event.target.value)}
          >
            <option value="Tất cả">Tất cả loại lỗi</option>
            <option value="Selector thay đổi">Selector thay đổi</option>
            <option value="Timeout">Timeout</option>
            <option value="Render JavaScript">Render JavaScript</option>
            <option value="Dữ liệu thiếu">Dữ liệu thiếu</option>
            <option value="Sai định dạng giá">Sai định dạng giá</option>
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>

        <div className="select-boc-ngoai">
          <select
            value={trangThaiLoc}
            onChange={(event) => setTrangThaiLoc(event.target.value)}
          >
            <option value="Tất cả">Tất cả trạng thái</option>
            <option value="Chưa xử lý">Chưa xử lý</option>
            <option value="Đã xử lý">Đã xử lý</option>
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>

        <button className="nut-hanh-dong-loi" type="button">
          Làm mới
        </button>

        <button className="nut-hanh-dong-loi" type="button">
          Xuất log
        </button>
      </div>

      <div className="khu-vuc-danh-sach-loi">
        <h2>Danh sách lỗi Scraping</h2>

        <table className="bang-loi-scraping-admin">
          <thead>
            <tr>
              <th>Mã lỗi</th>
              <th>Thời gian</th>
              <th>Nguồn</th>
              <th>Spider</th>
              <th>Loại lỗi</th>
              <th>Mức độ</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {danhSachHienThi.map((loi) => (
              <tr key={loi.maLoi}>
                <td>{loi.maLoi}</td>
                <td>{loi.thoiGian}</td>
                <td>{loi.nguon}</td>
                <td>{loi.spider}</td>
                <td>{loi.loaiLoi}</td>
                <td>
                  <span className={`nhan-muc-do-loi ${layClassMucDo(loi.mucDo)}`}>
                    {loi.mucDo}
                  </span>
                </td>
                <td>
                  <span
                    className={`nhan-trang-thai-loi ${layClassTrangThai(
                      loi.trangThai
                    )}`}
                  >
                    {loi.trangThai}
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

export default NhatKyLoiScraping;

