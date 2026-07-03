const thongKeTongQuan = [
  {
    tieuDe: "Tổng sản phẩm thô",
    giaTri: "1.480",
    moTa: "+95 sản phẩm hôm nay",
  },
  {
    tieuDe: "Sản phẩm chuẩn hóa",
    giaTri: "460",
    moTa: "Đã gom nhóm từ nhiều nguồn",
  },
  {
  tieuDe: "Nguồn cào hoạt động",
  giaTri: "5",
  moTa: "Lazada, Tiki, FPT Shop, CellphoneS, HoangHaMobile",
  },
  {
    tieuDe: "Lỗi Scraping hôm nay",
    giaTri: "2",
    moTa: "Cần kiểm tra nhật ký lỗi",
  },
];

const duLieuBieuDo = [
  { ngay: "T2", soLuong: 70 },
  { ngay: "T3", soLuong: 90 },
  { ngay: "T4", soLuong: 110 },
  { ngay: "T5", soLuong: 130 },
  { ngay: "T6", soLuong: 150 },
  { ngay: "T7", soLuong: 170 },
  { ngay: "CN", soLuong: 190 },
];

const trangThaiHeThong = [
  "API Backend: Hoạt động",
  "PostgreSQL: Hoạt động",
  "Redis Queue: Hoạt động",
  "Celery Worker: Đang chạy",
  "Scrapy/Playwright: Đang chạy",
];

const tienTrinhScraping = [
  {
    nguon: "Lazada",
    spider: "lazada_spider",
    trangThai: "Hoàn tất",
    lanChay: "20 phút trước",
    sanPham: 280,
    loi: 0,
  },
  {
    nguon: "Tiki",
    spider: "tiki_spider",
    trangThai: "Đang chạy",
    lanChay: "35 phút trước",
    sanPham: 210,
    loi: 0,
  },
  {
    nguon: "FPT Shop",
    spider: "fptshop_spider",
    trangThai: "Hoàn tất",
    lanChay: "1 giờ trước",
    sanPham: 180,
    loi: 0,
  },
  {
    nguon: "CellphoneS",
    spider: "cellphones_spider",
    trangThai: "Có lỗi",
    lanChay: "2 giờ trước",
    sanPham: 145,
    loi: 1,
  },
  {
    nguon: "HoangHaMobile",
    spider: "hoanghamobile_spider",
    trangThai: "Hoàn tất",
    lanChay: "3 giờ trước",
    sanPham: 165,
    loi: 1,
  },
];

function TongQuanQuanTri() {
  return (
    <section className="trang-tong-quan-admin">
      <h1>Tổng quan hệ thống</h1>

      <p className="mo-ta-trang-admin">
        Theo dõi tình trạng thu thập dữ liệu, sản phẩm và tiến trình scraping của hệ thống SoSanhGia.
      </p>

      <div className="luoi-the-thong-ke-admin">
        {thongKeTongQuan.map((item) => (
          <div className="the-thong-ke-admin" key={item.tieuDe}>
            <h3>{item.tieuDe}</h3>
            <strong>{item.giaTri}</strong>
            <p>{item.moTa}</p>
          </div>
        ))}
      </div>

      <div className="hang-bieu-do-trang-thai-admin">
        <div className="khung-bieu-do-admin">
          <h2>Sản phẩm thu thập trong tuần gần nhất</h2>

          <div className="noi-dung-bieu-do-admin">
            <div className="truc-y-admin">
              <span>200</span>
              <span>100</span>
              <span>0</span>
            </div>

            <div className="vung-cot-bieu-do-admin">
              {duLieuBieuDo.map((item) => (
                <div className="cot-theo-ngay-admin" key={item.ngay}>
                  <div
                    className="cot-so-luong-admin"
                    style={{ height: `${item.soLuong}px` }}
                  ></div>
                  <span>{item.ngay}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="khung-trang-thai-admin">
          <h2>Trạng thái hệ thống</h2>

          <div className="danh-sach-trang-thai-admin">
            {trangThaiHeThong.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="khu-vuc-bang-tien-trinh-admin">
        <h2>Tiến trình Scraping gần đây</h2>

        <table className="bang-tien-trinh-admin">
          <thead>
            <tr>
              <th>Nguồn dữ liệu</th>
              <th>Spider</th>
              <th>Trạng thái</th>
              <th>Lần chạy gần nhất</th>
              <th>Sản phẩm</th>
              <th>Lỗi</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {tienTrinhScraping.map((item) => (
              <tr key={item.spider}>
                <td>{item.nguon}</td>
                <td>{item.spider}</td>
                <td>{item.trangThai}</td>
                <td>{item.lanChay}</td>
                <td>{item.sanPham}</td>
                <td>{item.loi}</td>
                <td>
                  <button className="nut-xem-admin" type="button">
                    Xem
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default TongQuanQuanTri;

