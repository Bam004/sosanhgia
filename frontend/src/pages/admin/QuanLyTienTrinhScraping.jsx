import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const SO_DONG_MOI_TRANG = 8;

const giaTriMacDinhThongKe = [
  {
    tieuDe: "Đang chạy",
    giaTri: 0,
    moTa: "Tiến trình đang thu thập dữ liệu",
  },
  {
    tieuDe: "Hoàn thành",
    giaTri: 0,
    moTa: "Nguồn dữ liệu đã thu thập thành công",
  },
  {
    tieuDe: "Đang chờ",
    giaTri: 0,
    moTa: "Nguồn chưa có dữ liệu thu thập",
  },
  {
    tieuDe: "Có lỗi",
    giaTri: 0,
    moTa: "Nguồn có lỗi cần kiểm tra nhật ký",
  },
];

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

function layClassTrangThaiTienTrinh(trangThai) {
  if (trangThai === "Hoàn tất") return "hoan-tat";
  if (trangThai === "Đang chạy") return "dang-chay";
  if (trangThai === "Đang chờ") return "dang-cho";
  if (trangThai === "Có lỗi") return "co-loi";
  return "";
}

function layMoTaTrangThaiTienTrinh(trangThai) {
  if (trangThai === "Hoàn tất") {
    return "Tiến trình đã thu thập dữ liệu thành công và chưa phát hiện lỗi cần xử lý.";
  }

  if (trangThai === "Có lỗi") {
    return "Tiến trình có lỗi dữ liệu, cần kiểm tra thêm tại màn hình Nhật ký lỗi Scraping.";
  }

  if (trangThai === "Đang chờ") {
    return "Nguồn dữ liệu này chưa có sản phẩm thô hoặc chưa được thu thập.";
  }

  if (trangThai === "Đang chạy") {
    return "Tiến trình đang thực hiện thu thập dữ liệu sản phẩm.";
  }

  return "Chưa có mô tả cho trạng thái này.";
}

function taoThongKeTuDanhSachTienTrinh(danhSachTienTrinh) {
  const dangChay = danhSachTienTrinh.filter(
    (tienTrinh) => tienTrinh.trangThai === "Đang chạy"
  ).length;

  const hoanThanh = danhSachTienTrinh.filter(
    (tienTrinh) => tienTrinh.trangThai === "Hoàn tất"
  ).length;

  const dangCho = danhSachTienTrinh.filter(
    (tienTrinh) => tienTrinh.trangThai === "Đang chờ"
  ).length;

  const coLoi = danhSachTienTrinh.filter(
    (tienTrinh) => tienTrinh.trangThai === "Có lỗi"
  ).length;

  return [
    {
      tieuDe: "Đang chạy",
      giaTri: dangChay,
      moTa: "Tiến trình đang thu thập dữ liệu",
    },
    {
      tieuDe: "Hoàn thành",
      giaTri: hoanThanh,
      moTa: "Nguồn dữ liệu đã thu thập thành công",
    },
    {
      tieuDe: "Đang chờ",
      giaTri: dangCho,
      moTa: "Nguồn chưa có dữ liệu thu thập",
    },
    {
      tieuDe: "Có lỗi",
      giaTri: coLoi,
      moTa: "Nguồn có lỗi cần kiểm tra nhật ký",
    },
  ];
}

function QuanLyTienTrinhScraping() {
  const [tuKhoa, setTuKhoa] = useState("");
  const [nguonLoc, setNguonLoc] = useState("Tất cả");
  const [trangThaiLoc, setTrangThaiLoc] = useState("Tất cả");

  const [danhSachTienTrinhTuApi, setDanhSachTienTrinhTuApi] = useState([]);
  const [thongKeTienTrinhTuApi, setThongKeTienTrinhTuApi] = useState(
    giaTriMacDinhThongKe
  );
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(false);
  const [loiTaiDuLieu, setLoiTaiDuLieu] = useState("");
  const [thongBao, setThongBao] = useState(null);
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [tienTrinhDangXem, setTienTrinhDangXem] = useState(null);

  function hienThongBao(noiDung, loai = "thanh-cong") {
    setThongBao({ noiDung, loai });

    setTimeout(() => {
      setThongBao(null);
    }, 3000);
  }

  async function taiTienTrinhScraping(hienToast = false) {
    try {
      setDangTaiDuLieu(true);
      setLoiTaiDuLieu("");

      const response = await api.get("/scraping/jobs");
      const duLieuTraVe = response.data;

      const duLieuTienTrinh = duLieuTraVe?.data || [];

      setDanhSachTienTrinhTuApi(duLieuTienTrinh);
      setThongKeTienTrinhTuApi(taoThongKeTuDanhSachTienTrinh(duLieuTienTrinh));

      if (hienToast) {
        hienThongBao("Đã cập nhật tiến trình Scraping.", "thanh-cong");
      }
    } catch (error) {
      console.error(error);
      setLoiTaiDuLieu("Không thể tải tiến trình Scraping từ backend.");
      hienThongBao("Không thể tải tiến trình Scraping.", "loi");
    } finally {
      setDangTaiDuLieu(false);
    }
  }

  useEffect(() => {
    taiTienTrinhScraping();
  }, []);

  useEffect(() => {
    setTrangHienTai(1);
  }, [tuKhoa, nguonLoc, trangThaiLoc]);

  const danhSachNguon = useMemo(() => {
    return taoDanhSachGiaTriKhongTrungLap(danhSachTienTrinhTuApi, "nguon");
  }, [danhSachTienTrinhTuApi]);

  const danhSachTrangThai = useMemo(() => {
    return taoDanhSachGiaTriKhongTrungLap(
      danhSachTienTrinhTuApi,
      "trangThai"
    );
  }, [danhSachTienTrinhTuApi]);

  const danhSachHienThi = useMemo(() => {
    return danhSachTienTrinhTuApi.filter((tienTrinh) => {
      const tuKhoaChuanHoa = tuKhoa.toLowerCase().trim();

      const khopTuKhoa =
        !tuKhoaChuanHoa ||
        String(tienTrinh.maTienTrinh || "")
          .toLowerCase()
          .includes(tuKhoaChuanHoa) ||
        String(tienTrinh.spider || "")
          .toLowerCase()
          .includes(tuKhoaChuanHoa) ||
        String(tienTrinh.nguon || "")
          .toLowerCase()
          .includes(tuKhoaChuanHoa);

      const khopNguon =
        nguonLoc === "Tất cả" || tienTrinh.nguon === nguonLoc;

      const khopTrangThai =
        trangThaiLoc === "Tất cả" ||
        tienTrinh.trangThai === trangThaiLoc;

      return khopTuKhoa && khopNguon && khopTrangThai;
    });
  }, [danhSachTienTrinhTuApi, tuKhoa, nguonLoc, trangThaiLoc]);

  const tongSoTrang = Math.max(
    1,
    Math.ceil(danhSachHienThi.length / SO_DONG_MOI_TRANG)
  );

  const danhSachTheoTrang = useMemo(() => {
    const viTriBatDau = (trangHienTai - 1) * SO_DONG_MOI_TRANG;
    const viTriKetThuc = viTriBatDau + SO_DONG_MOI_TRANG;

    return danhSachHienThi.slice(viTriBatDau, viTriKetThuc);
  }, [danhSachHienThi, trangHienTai]);

  return (
    <section className="trang-tien-trinh-admin">
      {thongBao && (
        <div className={`thong-bao-admin ${thongBao.loai}`}>
          {thongBao.loai === "loi" ? "❌" : "✅"} {thongBao.noiDung}
        </div>
      )}

      <h1>Quản lý tiến trình Scraping</h1>

      <p className="mo-ta-trang-admin">
        Theo dõi trạng thái các tác vụ thu thập dữ liệu sản phẩm từ các sàn thương mại điện tử.
      </p>

      {loiTaiDuLieu && <p className="mo-ta-trang-admin">{loiTaiDuLieu}</p>}

      <div className="luoi-the-tien-trinh-admin">
        {thongKeTienTrinhTuApi.map((item) => (
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
            placeholder="Tìm kiếm mã tiến trình, spider, nguồn cào"
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
            {danhSachNguon.map((nguon) => (
              <option value={nguon} key={nguon}>
                {nguon === "Tất cả" ? "Tất cả nguồn" : nguon}
              </option>
            ))}
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>

        <div className="select-boc-ngoai">
          <select
            value={trangThaiLoc}
            onChange={(event) => setTrangThaiLoc(event.target.value)}
          >
            {danhSachTrangThai.map((trangThai) => (
              <option value={trangThai} key={trangThai}>
                {trangThai === "Tất cả" ? "Tất cả trạng thái" : trangThai}
              </option>
            ))}
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>

        <button
          className="nut-hanh-dong-tien-trinh"
          type="button"
          onClick={() => taiTienTrinhScraping(true)}
          disabled={dangTaiDuLieu}
        >
          {dangTaiDuLieu ? "Đang tải..." : "Làm mới"}
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
            {dangTaiDuLieu ? (
              <tr>
                <td colSpan="9">Đang tải tiến trình Scraping...</td>
              </tr>
            ) : danhSachTheoTrang.length > 0 ? (
              danhSachTheoTrang.map((tienTrinh) => (
                <tr key={tienTrinh.maTienTrinh}>
                  <td>{tienTrinh.maTienTrinh}</td>
                  <td>{tienTrinh.nguon}</td>
                  <td>{tienTrinh.spider}</td>
                  <td>
                    <span
                      className={`nhan-tien-trinh ${layClassTrangThaiTienTrinh(
                        tienTrinh.trangThai
                      )}`}
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
                    <span className="so-tien-do-admin">
                      {tienTrinh.tienDo}%
                    </span>
                  </td>
                  <td>{tienTrinh.batDau}</td>
                  <td>{tienTrinh.sanPham}</td>
                  <td>{tienTrinh.loi}</td>
                  <td>
                    <button
                      className="nut-xem-admin"
                      type="button"
                      onClick={() => setTienTrinhDangXem(tienTrinh)}
                    >
                      Xem
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9">
                  Không có tiến trình Scraping phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="phan-trang-admin">
          <button
            type="button"
            onClick={() => setTrangHienTai((trang) => Math.max(1, trang - 1))}
            disabled={trangHienTai === 1}
          >
            ‹
          </button>

          {Array.from({ length: tongSoTrang }, (_, index) => index + 1).map(
            (soTrang) => (
              <button
                type="button"
                key={soTrang}
                className={soTrang === trangHienTai ? "trang-dang-chon" : ""}
                onClick={() => setTrangHienTai(soTrang)}
              >
                {soTrang}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() =>
              setTrangHienTai((trang) => Math.min(tongSoTrang, trang + 1))
            }
            disabled={trangHienTai === tongSoTrang}
          >
            ›
          </button>
        </div>
      </div>

      {tienTrinhDangXem && (
        <div
          className="nen-modal-tien-trinh-admin"
          onClick={() => setTienTrinhDangXem(null)}
        >
          <div
            className="hop-modal-tien-trinh-admin"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dau-modal-tien-trinh-admin">
              <div>
                <p>Chi tiết tiến trình Scraping</p>
                <h2>{tienTrinhDangXem.maTienTrinh}</h2>
              </div>

              <button
                className="nut-dong-modal-tien-trinh-admin"
                type="button"
                onClick={() => setTienTrinhDangXem(null)}
              >
                ×
              </button>
            </div>

            <div className="luoi-thong-tin-modal-tien-trinh">
              <div>
                <span>Nguồn cào</span>
                <strong>{tienTrinhDangXem.nguon}</strong>
              </div>

              <div>
                <span>Spider</span>
                <strong>{tienTrinhDangXem.spider}</strong>
              </div>

              <div>
                <span>Trạng thái</span>
                <strong>{tienTrinhDangXem.trangThai}</strong>
              </div>

              <div>
                <span>Thời gian bắt đầu</span>
                <strong>{tienTrinhDangXem.batDau}</strong>
              </div>

              <div>
                <span>Sản phẩm thu thập</span>
                <strong>{tienTrinhDangXem.sanPham}</strong>
              </div>

              <div>
                <span>Số lỗi</span>
                <strong>{tienTrinhDangXem.loi}</strong>
              </div>
            </div>

            <div className="khoi-tien-do-modal-tien-trinh">
              <div className="dong-tieu-de-tien-do-modal">
                <span>Tiến độ thu thập</span>
                <strong>{tienTrinhDangXem.tienDo}%</strong>
              </div>

              <div className="thanh-tien-do-modal-admin">
                <div
                  className="muc-tien-do-modal-admin"
                  style={{ width: `${tienTrinhDangXem.tienDo}%` }}
                ></div>
              </div>
            </div>

            <p className="mo-ta-modal-tien-trinh">
              {layMoTaTrangThaiTienTrinh(tienTrinhDangXem.trangThai)}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export default QuanLyTienTrinhScraping;

