import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const SO_DONG_MOI_TRANG = 8;

const giaTriMacDinhThongKe = [
  {
    tieuDe: "Tổng lỗi",
    giaTri: 0,
    moTa: "Lỗi phát hiện từ dữ liệu sản phẩm thô",
  },
  {
    tieuDe: "Lỗi nghiêm trọng",
    giaTri: 0,
    moTa: "Cần kiểm tra selector hoặc dữ liệu đầu vào",
  },
  {
    tieuDe: "Nguồn có lỗi",
    giaTri: 0,
    moTa: "Số sàn TMĐT đang phát sinh lỗi dữ liệu",
  },
  {
    tieuDe: "Chưa xử lý",
    giaTri: 0,
    moTa: "Các lỗi cần quản trị viên kiểm tra",
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

function xuatCsvNhatKyLoi(danhSachLoi) {
  const tieuDeCot = [
    "Mã lỗi",
    "Thời gian",
    "Nguồn",
    "Spider",
    "Loại lỗi",
    "Mức độ",
    "Trạng thái",
    "Mã SPT",
    "Mã SPCH",
    "Tên sản phẩm",
    "Mô tả",
    "Đề xuất xử lý",
  ];

  const dongDuLieu = danhSachLoi.map((loi) => [
    loi.maLoi,
    loi.thoiGian,
    loi.nguon,
    loi.spider,
    loi.loaiLoi,
    loi.mucDo,
    loi.trangThai,
    loi.maSanPhamThoHienThi,
    loi.maSanPhamChuanHoaHienThi,
    loi.tenSanPham,
    loi.moTa,
    loi.deXuatXuLy,
  ]);

  const noiDungCsv = [tieuDeCot, ...dongDuLieu]
    .map((dong) =>
      dong
        .map((giaTri) => `"${String(giaTri ?? "").replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([`\uFEFF${noiDungCsv}`], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const linkTai = document.createElement("a");

  linkTai.href = url;
  linkTai.download = `nhat-ky-loi-scraping-${Date.now()}.csv`;
  linkTai.click();

  URL.revokeObjectURL(url);
}

function NhatKyLoiScraping() {
  const [tuKhoa, setTuKhoa] = useState("");
  const [nguonLoc, setNguonLoc] = useState("Tất cả");
  const [loaiLoiLoc, setLoaiLoiLoc] = useState("Tất cả");
  const [trangThaiLoc, setTrangThaiLoc] = useState("Tất cả");

  const [danhSachLoiTuApi, setDanhSachLoiTuApi] = useState([]);
  const [thongKeLoiTuApi, setThongKeLoiTuApi] = useState(giaTriMacDinhThongKe);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(false);
  const [loiTaiDuLieu, setLoiTaiDuLieu] = useState("");
  const [thongBao, setThongBao] = useState(null);
  const [trangHienTai, setTrangHienTai] = useState(1);

  function hienThongBao(noiDung, loai = "thanh-cong") {
    setThongBao({ noiDung, loai });

    setTimeout(() => {
      setThongBao(null);
    }, 3000);
  }

  async function taiNhatKyLoiScraping(hienToast = false) {
    try {
      setDangTaiDuLieu(true);
      setLoiTaiDuLieu("");

      const response = await api.get("/scraping/error-logs");
      const duLieuTraVe = response.data;

      setDanhSachLoiTuApi(duLieuTraVe?.data || []);
      setThongKeLoiTuApi(duLieuTraVe?.stats || giaTriMacDinhThongKe);

      if (hienToast) {
        hienThongBao("Đã cập nhật nhật ký lỗi Scraping.", "thanh-cong");
      }
    } catch (error) {
      console.error(error);
      setLoiTaiDuLieu("Không thể tải nhật ký lỗi Scraping từ backend.");
      hienThongBao("Không thể tải nhật ký lỗi Scraping.", "loi");
    } finally {
      setDangTaiDuLieu(false);
    }
  }

  useEffect(() => {
    taiNhatKyLoiScraping();
  }, []);

  useEffect(() => {
    setTrangHienTai(1);
  }, [tuKhoa, nguonLoc, loaiLoiLoc, trangThaiLoc]);

  const danhSachNguon = useMemo(() => {
    return taoDanhSachGiaTriKhongTrungLap(danhSachLoiTuApi, "nguon");
  }, [danhSachLoiTuApi]);

  const danhSachLoaiLoi = useMemo(() => {
    return taoDanhSachGiaTriKhongTrungLap(danhSachLoiTuApi, "loaiLoi");
  }, [danhSachLoiTuApi]);

  const danhSachHienThi = useMemo(() => {
    return danhSachLoiTuApi.filter((loi) => {
      const tuKhoaChuanHoa = tuKhoa.toLowerCase().trim();

      const khopTuKhoa =
        !tuKhoaChuanHoa ||
        String(loi.maLoi || "").toLowerCase().includes(tuKhoaChuanHoa) ||
        String(loi.spider || "").toLowerCase().includes(tuKhoaChuanHoa) ||
        String(loi.nguon || "").toLowerCase().includes(tuKhoaChuanHoa) ||
        String(loi.loaiLoi || "").toLowerCase().includes(tuKhoaChuanHoa) ||
        String(loi.tenSanPham || "").toLowerCase().includes(tuKhoaChuanHoa);

      const khopNguon = nguonLoc === "Tất cả" || loi.nguon === nguonLoc;
      const khopLoaiLoi =
        loaiLoiLoc === "Tất cả" || loi.loaiLoi === loaiLoiLoc;
      const khopTrangThai =
        trangThaiLoc === "Tất cả" || loi.trangThai === trangThaiLoc;

      return khopTuKhoa && khopNguon && khopLoaiLoi && khopTrangThai;
    });
  }, [danhSachLoiTuApi, tuKhoa, nguonLoc, loaiLoiLoc, trangThaiLoc]);

  const tongSoTrang = Math.max(
    1,
    Math.ceil(danhSachHienThi.length / SO_DONG_MOI_TRANG)
  );

  const danhSachTheoTrang = useMemo(() => {
    const viTriBatDau = (trangHienTai - 1) * SO_DONG_MOI_TRANG;
    const viTriKetThuc = viTriBatDau + SO_DONG_MOI_TRANG;

    return danhSachHienThi.slice(viTriBatDau, viTriKetThuc);
  }, [danhSachHienThi, trangHienTai]);

  function xuLyXuatLog() {
    if (danhSachHienThi.length === 0) {
      hienThongBao("Không có nhật ký lỗi để xuất.", "loi");
      return;
    }

    xuatCsvNhatKyLoi(danhSachHienThi);
    hienThongBao("Đã xuất nhật ký lỗi Scraping.", "thanh-cong");
  }

  return (
    <section className="trang-nhat-ky-loi-admin">
      {thongBao && (
        <div className={`thong-bao-admin ${thongBao.loai}`}>
          {thongBao.loai === "loi" ? "❌" : "✅"} {thongBao.noiDung}
        </div>
      )}

      <h1>Quản lý nhật ký lỗi Scraping</h1>

      <p className="mo-ta-trang-admin">
        Theo dõi các lỗi phát sinh trong quá trình thu thập dữ liệu từ các sàn thương mại điện tử.
      </p>

      {loiTaiDuLieu && <p className="mo-ta-trang-admin">{loiTaiDuLieu}</p>}

      <div className="luoi-the-loi-admin">
        {thongKeLoiTuApi.map((item) => (
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
            placeholder="Tìm kiếm mã lỗi, spider, nguồn cào, sản phẩm"
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
            value={loaiLoiLoc}
            onChange={(event) => setLoaiLoiLoc(event.target.value)}
          >
            {danhSachLoaiLoi.map((loaiLoi) => (
              <option value={loaiLoi} key={loaiLoi}>
                {loaiLoi === "Tất cả" ? "Tất cả loại lỗi" : loaiLoi}
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
            <option value="Tất cả">Tất cả trạng thái</option>
            <option value="Chưa xử lý">Chưa xử lý</option>
            <option value="Đã xử lý">Đã xử lý</option>
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>

        <button
          className="nut-hanh-dong-loi"
          type="button"
          onClick={() => taiNhatKyLoiScraping(true)}
          disabled={dangTaiDuLieu}
        >
          {dangTaiDuLieu ? "Đang tải..." : "Làm mới"}
        </button>

        <button className="nut-hanh-dong-loi" type="button" onClick={xuLyXuatLog}>
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
            {dangTaiDuLieu ? (
              <tr>
                <td colSpan="8">Đang tải nhật ký lỗi Scraping...</td>
              </tr>
            ) : danhSachTheoTrang.length > 0 ? (
              danhSachTheoTrang.map((loi) => (
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
                    <button
                      className="nut-xem-admin"
                      type="button"
                      title={loi.moTa || "Xem lỗi"}
                      onClick={() =>
                        hienThongBao(
                          loi.deXuatXuLy || "Chưa có đề xuất xử lý cho lỗi này.",
                          "thanh-cong"
                        )
                      }
                    >
                      Xem
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">
                  Không có nhật ký lỗi Scraping phù hợp với bộ lọc hiện tại.
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
    </section>
  );
}

export default NhatKyLoiScraping;

