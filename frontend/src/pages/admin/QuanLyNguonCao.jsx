import { useMemo, useState } from "react";

const danhSachNguonCao = [
  {
    id: 1,
    tenNguon: "Lazada",
    website: "lazada.vn",
    congCu: "Playwright",
    tanSuat: "6 giờ/lần",
    trangThai: "Hoạt động",
    lanChayGanNhat: "20 phút trước",
    userAgent: "Chrome Windows",
    delayRequest: "2 - 5 giây",
    xuLyJavascript: "Có",
  },
  {
    id: 2,
    tenNguon: "Tiki",
    website: "tiki.vn",
    congCu: "Scrapy",
    tanSuat: "8 giờ/lần",
    trangThai: "Hoạt động",
    lanChayGanNhat: "35 phút trước",
    userAgent: "Chrome Windows",
    delayRequest: "3 - 6 giây",
    xuLyJavascript: "Không",
  },
  {
    id: 3,
    tenNguon: "FPT Shop",
    website: "fptshop.com.vn",
    congCu: "Scrapy",
    tanSuat: "12 giờ/lần",
    trangThai: "Hoạt động",
    lanChayGanNhat: "1 giờ trước",
    userAgent: "Chrome Windows",
    delayRequest: "2 - 4 giây",
    xuLyJavascript: "Không",
  },
  {
    id: 4,
    tenNguon: "CellphoneS",
    website: "cellphones.com.vn",
    congCu: "Playwright",
    tanSuat: "12 giờ/lần",
    trangThai: "Có lỗi",
    lanChayGanNhat: "2 giờ trước",
    userAgent: "Chrome Windows",
    delayRequest: "4 - 7 giây",
    xuLyJavascript: "Có",
  },
  {
    id: 5,
    tenNguon: "HoangHaMobile",
    website: "hoanghamobile.com",
    congCu: "Scrapy",
    tanSuat: "12 giờ/lần",
    trangThai: "Hoạt động",
    lanChayGanNhat: "3 giờ trước",
    userAgent: "Chrome Windows",
    delayRequest: "2 - 5 giây",
    xuLyJavascript: "Không",
  },
];

function QuanLyNguonCao() {
  const [tuKhoa, setTuKhoa] = useState("");
  const [trangThai, setTrangThai] = useState("Tất cả");
  const [congCu, setCongCu] = useState("Tất cả");
  const [nguonDangChon, setNguonDangChon] = useState(danhSachNguonCao[0]);

  const danhSachHienThi = useMemo(() => {
    return danhSachNguonCao.filter((nguon) => {
      const khopTuKhoa =
        nguon.tenNguon.toLowerCase().includes(tuKhoa.toLowerCase()) ||
        nguon.website.toLowerCase().includes(tuKhoa.toLowerCase());

      const khopTrangThai =
        trangThai === "Tất cả" || nguon.trangThai === trangThai;

      const khopCongCu = congCu === "Tất cả" || nguon.congCu === congCu;

      return khopTuKhoa && khopTrangThai && khopCongCu;
    });
  }, [tuKhoa, trangThai, congCu]);

  return (
    <section className="trang-nguon-cao-admin">
      <h1>Quản lý nguồn cào dữ liệu</h1>

      <p className="mo-ta-trang-admin">
        Quản lý các website thương mại điện tử được sử dụng để thu thập dữ liệu sản phẩm.
      </p>

      <div className="thanh-cong-cu-nguon-cao">
        <div className="o-tim-kiem-nguon-cao">
          <input
            type="text"
            placeholder="Tìm kiếm nguồn cào"
            value={tuKhoa}
            onChange={(event) => setTuKhoa(event.target.value)}
          />
          <span>⌕</span>
        </div>

        <div className="select-boc-ngoai">
          <select
            value={trangThai}
            onChange={(event) => setTrangThai(event.target.value)}
          >
            <option value="Tất cả">Tất cả trạng thái</option>
            <option value="Hoạt động">Hoạt động</option>
            <option value="Có lỗi">Có lỗi</option>
            <option value="Tạm dừng">Tạm dừng</option>
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>

        <div className="select-boc-ngoai">
          <select
            value={congCu}
            onChange={(event) => setCongCu(event.target.value)}
          >
            <option value="Tất cả">Tất cả công cụ</option>
            <option value="Scrapy">Scrapy</option>
            <option value="Playwright">Playwright</option>
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>
      </div>

      <div className="khu-vuc-danh-sach-nguon-cao">
        <h2>Danh sách nguồn cào</h2>

        <table className="bang-nguon-cao-admin">
          <thead>
            <tr>
              <th>Tên website</th>
              <th>Website</th>
              <th>Công cụ</th>
              <th>Tần suất cào</th>
              <th>Trạng thái</th>
              <th>Lần chạy gần nhất</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {danhSachHienThi.map((nguon) => (
              <tr key={nguon.id}>
                <td>{nguon.tenNguon}</td>
                <td>{nguon.website}</td>
                <td>{nguon.congCu}</td>
                <td>{nguon.tanSuat}</td>
                <td>
                  <span
                    className={
                      nguon.trangThai === "Có lỗi"
                        ? "nhan-trang-thai loi"
                        : "nhan-trang-thai hoat-dong"
                    }
                  >
                    {nguon.trangThai}
                  </span>
                </td>
                <td>{nguon.lanChayGanNhat}</td>
                <td>
                  <button
                    className="nut-xem-admin"
                    type="button"
                    onClick={() => setNguonDangChon(nguon)}
                  >
                    Xem
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tieu-de-cau-hinh-nguon-cao">
        <h2>Thông tin cấu hình nguồn cào</h2>

        <div className="select-boc-ngoai select-cau-hinh-nguon">
          <select
            value={nguonDangChon.id}
            onChange={(event) => {
              const nguon = danhSachNguonCao.find(
                (item) => item.id === Number(event.target.value)
              );
              setNguonDangChon(nguon);
            }}
          >
            {danhSachNguonCao.map((nguon) => (
              <option value={nguon.id} key={nguon.id}>
                {nguon.tenNguon}
              </option>
            ))}
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>
      </div>

      <div className="khung-cau-hinh-nguon-cao">
        <div>
          <p>
            <span>Tên nguồn:</span> {nguonDangChon.tenNguon}
          </p>
          <p>
            <span>Website:</span> {nguonDangChon.website}
          </p>
          <p>
            <span>Công cụ sử dụng:</span> {nguonDangChon.congCu}
          </p>
          <p>
            <span>Tần suất cào:</span> {nguonDangChon.tanSuat}
          </p>
        </div>

        <div>
          <p>
            <span>User-Agent:</span> {nguonDangChon.userAgent}
          </p>
          <p>
            <span>Delay Request:</span> {nguonDangChon.delayRequest}
          </p>
          <p>
            <span>Xử lý Javascript:</span> {nguonDangChon.xuLyJavascript}
          </p>
          <p>
            <span>Trạng thái:</span> {nguonDangChon.trangThai}
          </p>
        </div>
      </div>
    </section>
  );
}

export default QuanLyNguonCao;

