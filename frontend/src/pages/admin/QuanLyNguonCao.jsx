import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

function taoDanhSachGiaTriKhongTrungLap(danhSach, tenTruong) {
  return [
    "Tất cả",
    ...new Set(
      danhSach
        .map((item) => item[tenTruong])
        .filter((giaTri) => giaTri && String(giaTri).trim() !== "")
    ),
  ];
}

function layClassTrangThaiNguonCao(trangThai) {
  if (trangThai === "Có lỗi") return "loi";
  if (trangThai === "Đang chờ") return "tam-dung";
  return "hoat-dong";
}

function QuanLyNguonCao() {
  const [tuKhoa, setTuKhoa] = useState("");
  const [trangThai, setTrangThai] = useState("Tất cả");
  const [congCu, setCongCu] = useState("Tất cả");

  const [danhSachNguonCaoTuApi, setDanhSachNguonCaoTuApi] = useState([]);
  const [nguonDangChon, setNguonDangChon] = useState(null);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(false);
  const [loiTaiDuLieu, setLoiTaiDuLieu] = useState("");
  const [thongBao, setThongBao] = useState(null);

  function hienThongBao(noiDung, loai = "thanh-cong") {
    setThongBao({ noiDung, loai });

    setTimeout(() => {
      setThongBao(null);
    }, 3000);
  }

  async function taiDanhSachNguonCao(hienToast = false) {
    try {
      setDangTaiDuLieu(true);
      setLoiTaiDuLieu("");

      const response = await api.get("/scraping/sources");
      const duLieuNguonCao = response.data?.data || [];

      setDanhSachNguonCaoTuApi(duLieuNguonCao);

      setNguonDangChon((nguonHienTai) => {
        if (!duLieuNguonCao.length) {
          return null;
        }

        if (!nguonHienTai) {
          return duLieuNguonCao[0];
        }

        return (
          duLieuNguonCao.find((nguon) => nguon.id === nguonHienTai.id) ||
          duLieuNguonCao[0]
        );
      });

      if (hienToast) {
        hienThongBao("Đã cập nhật danh sách nguồn cào.", "thanh-cong");
      }
    } catch (error) {
      console.error(error);
      setLoiTaiDuLieu("Không thể tải danh sách nguồn cào từ backend.");
      hienThongBao("Không thể tải danh sách nguồn cào.", "loi");
    } finally {
      setDangTaiDuLieu(false);
    }
  }

  useEffect(() => {
    taiDanhSachNguonCao();
  }, []);

  const danhSachTrangThai = useMemo(() => {
    return taoDanhSachGiaTriKhongTrungLap(
      danhSachNguonCaoTuApi,
      "trangThai"
    );
  }, [danhSachNguonCaoTuApi]);

  const danhSachCongCu = useMemo(() => {
    return taoDanhSachGiaTriKhongTrungLap(danhSachNguonCaoTuApi, "congCu");
  }, [danhSachNguonCaoTuApi]);

  const danhSachHienThi = useMemo(() => {
    return danhSachNguonCaoTuApi.filter((nguon) => {
      const tuKhoaChuanHoa = tuKhoa.toLowerCase().trim();

      const khopTuKhoa =
        !tuKhoaChuanHoa ||
        String(nguon.tenNguon || "")
          .toLowerCase()
          .includes(tuKhoaChuanHoa) ||
        String(nguon.website || "")
          .toLowerCase()
          .includes(tuKhoaChuanHoa) ||
        String(nguon.spider || "")
          .toLowerCase()
          .includes(tuKhoaChuanHoa);

      const khopTrangThai =
        trangThai === "Tất cả" || nguon.trangThai === trangThai;

      const khopCongCu = congCu === "Tất cả" || nguon.congCu === congCu;

      return khopTuKhoa && khopTrangThai && khopCongCu;
    });
  }, [danhSachNguonCaoTuApi, tuKhoa, trangThai, congCu]);

  return (
    <section className="trang-nguon-cao-admin">
      {thongBao && (
        <div className={`thong-bao-admin ${thongBao.loai}`}>
          {thongBao.loai === "loi" ? "❌" : "✅"} {thongBao.noiDung}
        </div>
      )}

      <h1>Quản lý nguồn cào dữ liệu</h1>

      <p className="mo-ta-trang-admin">
        Quản lý các website thương mại điện tử được sử dụng để thu thập dữ liệu sản phẩm.
      </p>

      {loiTaiDuLieu && <p className="mo-ta-trang-admin">{loiTaiDuLieu}</p>}

      <div className="thanh-cong-cu-nguon-cao">
        <div className="o-tim-kiem-nguon-cao">
          <input
            type="text"
            placeholder="Tìm kiếm nguồn cào, website, spider"
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
            {danhSachTrangThai.map((trangThaiItem) => (
              <option value={trangThaiItem} key={trangThaiItem}>
                {trangThaiItem === "Tất cả"
                  ? "Tất cả trạng thái"
                  : trangThaiItem}
              </option>
            ))}
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>

        <div className="select-boc-ngoai">
          <select
            value={congCu}
            onChange={(event) => setCongCu(event.target.value)}
          >
            {danhSachCongCu.map((congCuItem) => (
              <option value={congCuItem} key={congCuItem}>
                {congCuItem === "Tất cả" ? "Tất cả công cụ" : congCuItem}
              </option>
            ))}
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>

        <button
          className="nut-hanh-dong-nguon-cao"
          type="button"
          onClick={() => taiDanhSachNguonCao(true)}
          disabled={dangTaiDuLieu}
        >
          {dangTaiDuLieu ? "Đang tải..." : "Làm mới"}
        </button>
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
              <th>Sản phẩm</th>
              <th>Lỗi</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {dangTaiDuLieu ? (
              <tr>
                <td colSpan="9">Đang tải danh sách nguồn cào...</td>
              </tr>
            ) : danhSachHienThi.length > 0 ? (
              danhSachHienThi.map((nguon) => (
                <tr key={nguon.id}>
                  <td>{nguon.tenNguon}</td>
                  <td>{nguon.website}</td>
                  <td>{nguon.congCu}</td>
                  <td>{nguon.tanSuat}</td>
                  <td>
                    <span
                      className={`nhan-trang-thai ${layClassTrangThaiNguonCao(
                        nguon.trangThai
                      )}`}
                    >
                      {nguon.trangThai}
                    </span>
                  </td>
                  <td>{nguon.lanChayGanNhat}</td>
                  <td>{nguon.soSanPham}</td>
                  <td>{nguon.soLoi}</td>
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
              ))
            ) : (
              <tr>
                <td colSpan="9">
                  Không có nguồn cào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="tieu-de-cau-hinh-nguon-cao">
        <h2>Thông tin cấu hình nguồn cào</h2>

        <div className="select-boc-ngoai select-cau-hinh-nguon">
          <select
            value={nguonDangChon?.id || ""}
            onChange={(event) => {
              const nguon = danhSachNguonCaoTuApi.find(
                (item) => item.id === Number(event.target.value)
              );
              setNguonDangChon(nguon || null);
            }}
          >
            {danhSachNguonCaoTuApi.map((nguon) => (
              <option value={nguon.id} key={nguon.id}>
                {nguon.tenNguon}
              </option>
            ))}
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>
      </div>

      {nguonDangChon ? (
        <div className="khung-cau-hinh-nguon-cao">
          <div>
            <p>
              <span>Tên nguồn:</span> {nguonDangChon.tenNguon}
            </p>
            <p>
              <span>Website:</span> {nguonDangChon.website}
            </p>
            <p>
              <span>Spider:</span> {nguonDangChon.spider}
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
              <span>Trạng thái nguồn:</span> {nguonDangChon.trangThai}
            </p>
            <p>
              <span>Tiến trình gần nhất:</span>{" "}
              {nguonDangChon.trangThaiTienTrinh} - {nguonDangChon.tienDo}%
            </p>
          </div>
        </div>
      ) : (
        <div className="khung-cau-hinh-nguon-cao">
          <p>Chưa có nguồn cào nào để hiển thị cấu hình.</p>
        </div>
      )}
    </section>
  );
}

export default QuanLyNguonCao;

