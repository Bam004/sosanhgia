import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";

const KICH_THUOC_TRANG = 10;

function dinhDangNgayThang(giaTri) {
  if (!giaTri) {
    return "Chưa cập nhật";
  }

  const ngay = new Date(giaTri);

  if (Number.isNaN(ngay.getTime())) {
    return "Không xác định";
  }

  return ngay.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function layTenVaiTro(vaiTro) {
  return String(vaiTro || "").toLowerCase() === "admin"
    ? "Quản trị viên"
    : "Người dùng";
}

function layTenTrangThai(trangThai) {
  return String(trangThai || "").toLowerCase() === "active"
    ? "Đang hoạt động"
    : "Đã khóa";
}

function layNoiDungLoi(error, noiDungMacDinh) {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    noiDungMacDinh
  );
}

function QuanLyTaiKhoan() {
  const [danhSachTaiKhoan, setDanhSachTaiKhoan] = useState([]);
  const [tuKhoaNhap, setTuKhoaNhap] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [vaiTro, setVaiTro] = useState("all");
  const [trangThai, setTrangThai] = useState("all");
  const [trangHienTai, setTrangHienTai] = useState(1);

  const [phanTrang, setPhanTrang] = useState({
    trangHienTai: 1,
    kichThuocTrang: KICH_THUOC_TRANG,
    tongSoTaiKhoan: 0,
    tongSoTrang: 0,
  });

  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(false);
  const [dangCapNhat, setDangCapNhat] = useState(false);
  const [loiTaiDuLieu, setLoiTaiDuLieu] = useState("");
  const [thongBao, setThongBao] = useState(null);
  const [taiKhoanDangXem, setTaiKhoanDangXem] = useState(null);
  const [taiKhoanCanXacNhan, setTaiKhoanCanXacNhan] = useState(null);

  const taiKhoanDangNhap = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  function hienThongBao(noiDung, loai = "thanh-cong") {
    setThongBao({ noiDung, loai });

    window.setTimeout(() => {
      setThongBao(null);
    }, 3000);
  }

  const taiDanhSachTaiKhoan = useCallback(
    async (hienToast = false) => {
      try {
        setDangTaiDuLieu(true);
        setLoiTaiDuLieu("");

        const response = await api.get("/admin/accounts", {
          params: {
            tuKhoa,
            vaiTro,
            trangThai,
            trang: trangHienTai,
            kichThuocTrang: KICH_THUOC_TRANG,
          },
        });

        const duLieu = response.data?.data || {};
        const danhSach = Array.isArray(duLieu.items)
          ? duLieu.items
          : [];

        setDanhSachTaiKhoan(danhSach);

        setPhanTrang({
          trangHienTai:
            Number(duLieu.pagination?.trangHienTai) || trangHienTai,
          kichThuocTrang:
            Number(duLieu.pagination?.kichThuocTrang) ||
            KICH_THUOC_TRANG,
          tongSoTaiKhoan:
            Number(duLieu.pagination?.tongSoTaiKhoan) || 0,
          tongSoTrang:
            Number(duLieu.pagination?.tongSoTrang) || 0,
        });

        if (hienToast) {
          hienThongBao(
            "Đã cập nhật danh sách tài khoản.",
            "thanh-cong"
          );
        }
      } catch (error) {
        console.error("Lỗi tải danh sách tài khoản:", error);

        const noiDungLoi = layNoiDungLoi(
          error,
          "Không thể tải danh sách tài khoản từ backend."
        );

        setDanhSachTaiKhoan([]);
        setLoiTaiDuLieu(noiDungLoi);
        hienThongBao(noiDungLoi, "loi");
      } finally {
        setDangTaiDuLieu(false);
      }
    },
    [trangHienTai, trangThai, tuKhoa, vaiTro]
  );

  useEffect(() => {
    taiDanhSachTaiKhoan();
  }, [taiDanhSachTaiKhoan]);

  function timKiemTaiKhoan(event) {
    event.preventDefault();
    setTrangHienTai(1);
    setTuKhoa(tuKhoaNhap.trim());
  }

  function thayDoiVaiTro(event) {
    setVaiTro(event.target.value);
    setTrangHienTai(1);
  }

  function thayDoiTrangThai(event) {
    setTrangThai(event.target.value);
    setTrangHienTai(1);
  }

  async function capNhatTrangThaiTaiKhoan(taiKhoan) {
    const trangThaiMoi =
      taiKhoan.trangThai === "active" ? "inactive" : "active";

    try {
      setDangCapNhat(true);

      const response = await api.patch(
        `/admin/accounts/${taiKhoan.maTaiKhoan}/status`,
        {
          trangThai: trangThaiMoi,
        }
      );

      hienThongBao(
        response.data?.message || "Đã cập nhật trạng thái tài khoản.",
        "thanh-cong"
      );

      setTaiKhoanCanXacNhan(null);
      setTaiKhoanDangXem(null);

      await taiDanhSachTaiKhoan();
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái tài khoản:", error);

      hienThongBao(
        layNoiDungLoi(
          error,
          "Không thể cập nhật trạng thái tài khoản."
        ),
        "loi"
      );
    } finally {
      setDangCapNhat(false);
    }
  }

  function chuyenTrang(trangMoi) {
    if (
      trangMoi < 1 ||
      trangMoi > phanTrang.tongSoTrang ||
      trangMoi === trangHienTai
    ) {
      return;
    }

    setTrangHienTai(trangMoi);
  }

  return (
    <section className="trang-tai-khoan-admin">
      {thongBao && (
        <div className={`thong-bao-admin ${thongBao.loai}`}>
          {thongBao.loai === "loi" ? "❌" : "✅"}{" "}
          {thongBao.noiDung}
        </div>
      )}

      <h1>Quản lý tài khoản</h1>

      <p className="mo-ta-trang-admin">
        Theo dõi thông tin người dùng và quản lý trạng thái hoạt động
        của các tài khoản trong hệ thống SoSanhGia.
      </p>

      {loiTaiDuLieu && (
        <p className="mo-ta-trang-admin loi-tai-khoan-admin">
          {loiTaiDuLieu}
        </p>
      )}

      <form
        className="thanh-cong-cu-tai-khoan-admin"
        onSubmit={timKiemTaiKhoan}
      >
        <div className="o-tim-kiem-tai-khoan-admin">
          <input
            type="text"
            placeholder="Tìm kiếm theo họ tên hoặc email"
            value={tuKhoaNhap}
            onChange={(event) => setTuKhoaNhap(event.target.value)}
          />

          <button
            type="submit"
            className="nut-tim-kiem-tai-khoan-admin"
            aria-label="Tìm kiếm tài khoản"
          >
            ⌕
          </button>
        </div>

        <div className="select-boc-ngoai">
          <select value={vaiTro} onChange={thayDoiVaiTro}>
            <option value="all">Tất cả vai trò</option>
            <option value="user">Người dùng</option>
            <option value="admin">Quản trị viên</option>
          </select>

          <span className="mui-ten-select">⌄</span>
        </div>

        <div className="select-boc-ngoai">
          <select value={trangThai} onChange={thayDoiTrangThai}>
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã khóa</option>
          </select>

          <span className="mui-ten-select">⌄</span>
        </div>

        <button
          type="button"
          className="nut-lam-moi-tai-khoan-admin"
          onClick={() => taiDanhSachTaiKhoan(true)}
          disabled={dangTaiDuLieu}
        >
          {dangTaiDuLieu ? "Đang tải..." : "Làm mới"}
        </button>
      </form>

      <div className="khu-vuc-danh-sach-tai-khoan-admin">
        <div className="dau-danh-sach-tai-khoan-admin">
          <h2>Danh sách tài khoản</h2>

          <span>
            Tổng cộng:{" "}
            <strong>{phanTrang.tongSoTaiKhoan}</strong> tài khoản
          </span>
        </div>

        <div className="khung-bang-tai-khoan-admin">
          <table className="bang-tai-khoan-admin">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Họ và tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {dangTaiDuLieu ? (
                <tr>
                  <td colSpan="7">
                    Đang tải danh sách tài khoản...
                  </td>
                </tr>
              ) : danhSachTaiKhoan.length > 0 ? (
                danhSachTaiKhoan.map((taiKhoan) => {
                  const laTaiKhoanDangNhap =
                    Number(taiKhoan.maTaiKhoan) ===
                    Number(taiKhoanDangNhap?.maTaiKhoan);

                  return (
                    <tr key={taiKhoan.maTaiKhoan}>
                      <td>#{taiKhoan.maTaiKhoan}</td>

                      <td className="cot-ho-ten-tai-khoan-admin">
                        <strong>
                          {taiKhoan.hoTen || "Chưa cập nhật"}
                        </strong>

                        {laTaiKhoanDangNhap && (
                          <span className="nhan-tai-khoan-hien-tai">
                            Tài khoản hiện tại
                          </span>
                        )}
                      </td>

                      <td>{taiKhoan.email}</td>

                      <td>
                        <span
                          className={`nhan-vai-tro-tai-khoan ${
                            taiKhoan.vaiTro === "admin"
                              ? "quan-tri-vien"
                              : "nguoi-dung"
                          }`}
                        >
                          {layTenVaiTro(taiKhoan.vaiTro)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`nhan-trang-thai ${
                            taiKhoan.trangThai === "active"
                              ? "hoat-dong"
                              : "loi"
                          }`}
                        >
                          {layTenTrangThai(taiKhoan.trangThai)}
                        </span>
                      </td>

                      <td>{dinhDangNgayThang(taiKhoan.ngayTao)}</td>

                      <td>
                        <div className="nhom-nut-tai-khoan-admin">
                          <button
                            type="button"
                            className="nut-xem-admin"
                            onClick={() =>
                              setTaiKhoanDangXem(taiKhoan)
                            }
                          >
                            Xem
                          </button>

                          {!laTaiKhoanDangNhap &&
                            taiKhoan.email !==
                              "sosanhgia@gmail.com" && (
                              <button
                                type="button"
                                className={`nut-trang-thai-tai-khoan-admin ${
                                  taiKhoan.trangThai === "active"
                                    ? "khoa"
                                    : "mo-khoa"
                                }`}
                                onClick={() =>
                                  setTaiKhoanCanXacNhan(taiKhoan)
                                }
                              >
                                {taiKhoan.trangThai === "active"
                                  ? "Khóa"
                                  : "Mở khóa"}
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7">
                    Không có tài khoản phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {phanTrang.tongSoTrang > 1 && (
          <div className="phan-trang-tai-khoan-admin">
            <button
              type="button"
              onClick={() => chuyenTrang(trangHienTai - 1)}
              disabled={trangHienTai <= 1}
            >
              Trước
            </button>

            <span>
              Trang {trangHienTai} / {phanTrang.tongSoTrang}
            </span>

            <button
              type="button"
              onClick={() => chuyenTrang(trangHienTai + 1)}
              disabled={trangHienTai >= phanTrang.tongSoTrang}
            >
              Sau
            </button>
          </div>
        )}
      </div>

      {taiKhoanDangXem && (
        <div
          className="nen-modal-tien-trinh-admin"
          onClick={() => setTaiKhoanDangXem(null)}
        >
          <div
            className="hop-modal-tai-khoan-admin"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dau-modal-tai-khoan-admin">
              <div>
                <p>Chi tiết tài khoản</p>
                <h2>
                  {taiKhoanDangXem.hoTen || "Chưa cập nhật họ tên"}
                </h2>
              </div>

              <button
                type="button"
                className="nut-dong-modal-tien-trinh-admin"
                onClick={() => setTaiKhoanDangXem(null)}
              >
                ×
              </button>
            </div>

            <div className="luoi-thong-tin-tai-khoan-admin">
              <div>
                <span>Mã tài khoản</span>
                <strong>#{taiKhoanDangXem.maTaiKhoan}</strong>
              </div>

              <div>
                <span>Họ và tên</span>
                <strong>
                  {taiKhoanDangXem.hoTen || "Chưa cập nhật"}
                </strong>
              </div>

              <div>
                <span>Email</span>
                <strong>{taiKhoanDangXem.email}</strong>
              </div>

              <div>
                <span>Vai trò</span>
                <strong>
                  {layTenVaiTro(taiKhoanDangXem.vaiTro)}
                </strong>
              </div>

              <div>
                <span>Trạng thái</span>
                <strong>
                  {layTenTrangThai(taiKhoanDangXem.trangThai)}
                </strong>
              </div>

              <div>
                <span>Ngày tạo</span>
                <strong>
                  {dinhDangNgayThang(taiKhoanDangXem.ngayTao)}
                </strong>
              </div>

              <div>
                <span>Cập nhật gần nhất</span>
                <strong>
                  {dinhDangNgayThang(
                    taiKhoanDangXem.ngayCapNhat
                  )}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {taiKhoanCanXacNhan && (
        <div
          className="nen-modal-tien-trinh-admin"
          onClick={() => {
            if (!dangCapNhat) {
              setTaiKhoanCanXacNhan(null);
            }
          }}
        >
          <div
            className="hop-xac-nhan-tai-khoan-admin"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>
              {taiKhoanCanXacNhan.trangThai === "active"
                ? "Xác nhận khóa tài khoản"
                : "Xác nhận mở khóa tài khoản"}
            </h2>

            <p>
              Cậu có chắc muốn{" "}
              <strong>
                {taiKhoanCanXacNhan.trangThai === "active"
                  ? "khóa"
                  : "mở khóa"}
              </strong>{" "}
              tài khoản{" "}
              <strong>{taiKhoanCanXacNhan.email}</strong>?
            </p>

            {taiKhoanCanXacNhan.trangThai === "active" && (
              <p className="canh-bao-khoa-tai-khoan-admin">
                Người dùng sẽ không thể đăng nhập sau khi tài khoản
                bị khóa.
              </p>
            )}

            <div className="nhom-nut-xac-nhan-tai-khoan-admin">
              <button
                type="button"
                className="nut-huy-tai-khoan-admin"
                disabled={dangCapNhat}
                onClick={() => setTaiKhoanCanXacNhan(null)}
              >
                Hủy
              </button>

              <button
                type="button"
                className="nut-xac-nhan-tai-khoan-admin"
                disabled={dangCapNhat}
                onClick={() =>
                  capNhatTrangThaiTaiKhoan(
                    taiKhoanCanXacNhan
                  )
                }
              >
                {dangCapNhat
                  ? "Đang xử lý..."
                  : taiKhoanCanXacNhan.trangThai === "active"
                    ? "Khóa tài khoản"
                    : "Mở khóa tài khoản"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default QuanLyTaiKhoan;

