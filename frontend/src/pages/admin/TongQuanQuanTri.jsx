import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const giaTriMacDinhDashboard = {
  stats: [
    {
      tieuDe: "Tổng sản phẩm thô",
      giaTri: 0,
      moTa: "Sản phẩm thu thập từ các nguồn cào",
    },
    {
      tieuDe: "Sản phẩm chuẩn hóa",
      giaTri: 0,
      moTa: "Sản phẩm đã được gom nhóm và chuẩn hóa",
    },
    {
      tieuDe: "Nguồn cào hoạt động",
      giaTri: 0,
      moTa: "Chưa có nguồn hoạt động",
    },
    {
      tieuDe: "Lỗi Scraping",
      giaTri: 0,
      moTa: "Lỗi dữ liệu cần kiểm tra trong nhật ký",
    },
  ],
  chart: [],
  systemStatus: [],
  recentJobs: [],
};

function dinhDangSo(giaTri) {
  const so = Number(giaTri || 0);
  return so.toLocaleString("vi-VN");
}

function dinhDangNgayThang(ngay) {
  return ngay.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
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

function TongQuanQuanTri() {
  const [duLieuDashboard, setDuLieuDashboard] = useState(
    giaTriMacDinhDashboard
  );
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(false);
  const [loiTaiDuLieu, setLoiTaiDuLieu] = useState("");
  const [thongBao, setThongBao] = useState(null);
  const [tienTrinhDangXem, setTienTrinhDangXem] = useState(null);

  function hienThongBao(noiDung, loai = "thanh-cong") {
    setThongBao({ noiDung, loai });

    setTimeout(() => {
      setThongBao(null);
    }, 3000);
  }

  async function taiDashboard(hienToast = false) {
    try {
      setDangTaiDuLieu(true);
      setLoiTaiDuLieu("");

      const response = await api.get("/scraping/dashboard");
      const duLieuTraVe = response.data || {};

      setDuLieuDashboard({
        stats: duLieuTraVe.stats || giaTriMacDinhDashboard.stats,
        chart: duLieuTraVe.chart || [],
        systemStatus: duLieuTraVe.systemStatus || [],
        recentJobs: duLieuTraVe.recentJobs || [],
      });

      if (hienToast) {
        hienThongBao("Đã cập nhật dữ liệu tổng quan.", "thanh-cong");
      }
    } catch (error) {
      console.error(error);
      setLoiTaiDuLieu("Không thể tải dữ liệu tổng quan từ backend.");
      hienThongBao("Không thể tải dữ liệu tổng quan.", "loi");
    } finally {
      setDangTaiDuLieu(false);
    }
  }

  useEffect(() => {
    taiDashboard();
  }, []);

  const duLieuBieuDoBayNgay = useMemo(() => {
    const danhSachTuApi = Array.isArray(duLieuDashboard.chart)
      ? duLieuDashboard.chart
      : [];

    const homNay = new Date();
    homNay.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
      const ngayCanHienThi = new Date(homNay);
      ngayCanHienThi.setDate(homNay.getDate() - index);

      const duLieuTuApi =
        danhSachTuApi[danhSachTuApi.length - 1 - index];

      return {
        ngay: dinhDangNgayThang(ngayCanHienThi),
        ngayDayDu: ngayCanHienThi.toLocaleDateString("vi-VN"),
        soLuong: Number(duLieuTuApi?.soLuong || 0),
      };
    });
  }, [duLieuDashboard.chart]);

  const giaTriLonNhatBieuDo = useMemo(() => {
    const danhSachSoLuong = duLieuBieuDoBayNgay.map((item) =>
      Number(item.soLuong || 0)
    );

    return Math.max(...danhSachSoLuong, 1);
  }, [duLieuBieuDoBayNgay]);

  return (
    <section className="trang-tong-quan-admin">
      {thongBao && (
        <div className={`thong-bao-admin ${thongBao.loai}`}>
          {thongBao.loai === "loi" ? "❌" : "✅"} {thongBao.noiDung}
        </div>
      )}

      <h1>Tổng quan hệ thống</h1>

      <p className="mo-ta-trang-admin">
        Theo dõi tình trạng thu thập dữ liệu, sản phẩm và tiến trình scraping của hệ thống SoSanhGia.
      </p>

      {loiTaiDuLieu && <p className="mo-ta-trang-admin">{loiTaiDuLieu}</p>}

      <div className="luoi-the-thong-ke-admin">
        {duLieuDashboard.stats.map((item) => (
          <div className="the-thong-ke-admin" key={item.tieuDe}>
            <h3>
              {item.tieuDe === "Sản phẩm chuẩn hóa"
                ? "Nhóm sản phẩm chuẩn hóa"
                : item.tieuDe}
            </h3>
            <strong>{dinhDangSo(item.giaTri)}</strong>
            <p>
              {item.tieuDe === "Sản phẩm chuẩn hóa"
                ? "Sản phẩm đại diện sau khi gom nhóm"
                : item.moTa}
            </p>
          </div>
        ))}
      </div>

      <div className="hang-bieu-do-trang-thai-admin">
        <div className="khung-bieu-do-admin">
          <h2>Sản phẩm thu thập trong 7 ngày gần nhất</h2>

          <div className="noi-dung-bieu-do-admin">
            <div className="truc-y-admin">
              <span>{giaTriLonNhatBieuDo}</span>
              <span>{Math.round(giaTriLonNhatBieuDo / 2)}</span>
              <span>0</span>
            </div>

            <div className="vung-cot-bieu-do-admin">
              {duLieuBieuDoBayNgay.map((item) => {
                const soLuong = Number(item.soLuong || 0);

                const chieuCao =
                  soLuong > 0
                    ? Math.max(
                        10,
                        Math.round((soLuong / giaTriLonNhatBieuDo) * 190)
                      )
                    : 4;

                return (
                  <div
                    className="cot-theo-ngay-admin"
                    key={item.ngayDayDu}
                  >
                   <div
                      className="cot-so-luong-admin"
                      title={`${item.ngayDayDu}: ${dinhDangSo(
                        soLuong
                      )} sản phẩm`}
                      style={{ height: `${chieuCao}px` }}
                    >
                      <span className="cot-gia-tri-admin">
                        {dinhDangSo(soLuong)}
                      </span>
                    </div>

                    <span>{item.ngay}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="khung-trang-thai-admin">
          <h2>Trạng thái hệ thống</h2>

          <div className="danh-sach-trang-thai-admin">
            {duLieuDashboard.systemStatus.length > 0 ? (
              duLieuDashboard.systemStatus.map((item) => <p key={item}>{item}</p>)
            ) : (
              <p>Chưa có dữ liệu trạng thái hệ thống.</p>
            )}
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
            {dangTaiDuLieu ? (
              <tr>
                <td colSpan="7">Đang tải dữ liệu tổng quan...</td>
              </tr>
            ) : duLieuDashboard.recentJobs.length > 0 ? (
              duLieuDashboard.recentJobs.map((item) => (
                <tr key={item.spider}>
                  <td>{item.nguon}</td>
                  <td>{item.spider}</td>
                  <td>
                    <span
                      className={`nhan-tien-trinh ${layClassTrangThaiTienTrinh(
                        item.trangThai
                      )}`}
                    >
                      {item.trangThai}
                    </span>
                  </td>
                  <td>{item.lanChay}</td>
                  <td>{item.sanPham}</td>
                  <td>{item.loi}</td>
                  <td>
                    <button
                      className="nut-xem-admin"
                      type="button"
                      onClick={() => setTienTrinhDangXem(item)}
                    >
                      Xem
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">Chưa có tiến trình Scraping để hiển thị.</td>
              </tr>
            )}
          </tbody>
        </table>
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
                <h2>{tienTrinhDangXem.nguon}</h2>
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
                <span>Nguồn dữ liệu</span>
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
                <span>Lần chạy gần nhất</span>
                <strong>{tienTrinhDangXem.lanChay}</strong>
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

            <p className="mo-ta-modal-tien-trinh">
              {layMoTaTrangThaiTienTrinh(tienTrinhDangXem.trangThai)}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export default TongQuanQuanTri;

