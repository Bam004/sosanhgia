import { useCallback, useEffect, useState } from "react";

import api from "../../services/api";


const KICH_THUOC_TRANG = 10;

const THONG_KE_MAC_DINH = {
  tongSo: 0,
  daGui: 0,
  thatBai: 0,
  dangCho: 0,
};


function dinhDangTien(giaTri) {
  if (giaTri === null || giaTri === undefined) {
    return "Chưa có";
  }

  return `${Number(giaTri).toLocaleString("vi-VN")}đ`;
}


function dinhDangNgayThang(giaTri) {
  if (!giaTri) {
    return "Chưa có";
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
    second: "2-digit",
  });
}


function layNoiDungLoi(error, noiDungMacDinh) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (detail?.message) {
    return detail.message;
  }

  return (
    error?.response?.data?.message ||
    noiDungMacDinh
  );
}


function layNoiDungTrangThai(trangThai) {
  const danhSach = {
    pending: "Đang chờ",
    sent: "Đã gửi",
    failed: "Thất bại",
  };

  return danhSach[trangThai] || "Không xác định";
}


function layClassTrangThai(trangThai) {
  if (trangThai === "sent") {
    return "da-gui";
  }

  if (trangThai === "failed") {
    return "that-bai";
  }

  return "dang-cho";
}


function taoDanhSachTrang(trangHienTai, tongSoTrang) {
  if (tongSoTrang <= 7) {
    return Array.from(
      { length: tongSoTrang },
      (_, index) => index + 1
    );
  }

  const danhSachTrang = [1];
  const trangBatDau = Math.max(2, trangHienTai - 2);
  const trangKetThuc = Math.min(
    tongSoTrang - 1,
    trangHienTai + 2
  );

  if (trangBatDau > 2) {
    danhSachTrang.push("...");
  }

  for (
    let trang = trangBatDau;
    trang <= trangKetThuc;
    trang += 1
  ) {
    danhSachTrang.push(trang);
  }

  if (trangKetThuc < tongSoTrang - 1) {
    danhSachTrang.push("...");
  }

  danhSachTrang.push(tongSoTrang);

  return danhSachTrang;
}


function NhatKyEmail() {
  const [danhSachNhatKy, setDanhSachNhatKy] = useState([]);

  const [tuKhoaNhap, setTuKhoaNhap] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [trangThai, setTrangThai] = useState("all");
  const [trangHienTai, setTrangHienTai] = useState(1);

  const [thongKe, setThongKe] = useState(THONG_KE_MAC_DINH);

  const [phanTrang, setPhanTrang] = useState({
    trangHienTai: 1,
    kichThuocTrang: KICH_THUOC_TRANG,
    tongSoBanGhi: 0,
    tongSoTrang: 0,
  });

  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(false);
  const [dangGuiLai, setDangGuiLai] = useState(false);
  const [loiTaiDuLieu, setLoiTaiDuLieu] = useState("");

  const [toastAdmin, setToastAdmin] = useState(null);
  const [nhatKyDangXem, setNhatKyDangXem] = useState(null);
  const [nhatKyCanGuiLai, setNhatKyCanGuiLai] = useState(null);

  function hienThongBao(noiDung, loai = "thanh-cong") {
    setToastAdmin({
      noiDung,
      loai,
    });

    window.setTimeout(() => {
      setToastAdmin(null);
    }, 3000);
  }

  const taiDanhSachNhatKy = useCallback(
    async (hienToast = false) => {
      try {
        setDangTaiDuLieu(true);
        setLoiTaiDuLieu("");

        const response = await api.get(
          "/admin/email-logs",
          {
            params: {
              tuKhoa,
              trangThai,
              trang: trangHienTai,
              kichThuocTrang: KICH_THUOC_TRANG,
            },
          }
        );

        const duLieu = response.data?.data || {};

        setDanhSachNhatKy(
          Array.isArray(duLieu.items)
            ? duLieu.items
            : []
        );

        setThongKe({
          tongSo:
            Number(duLieu.statistics?.tongSo) || 0,
          daGui:
            Number(duLieu.statistics?.daGui) || 0,
          thatBai:
            Number(duLieu.statistics?.thatBai) || 0,
          dangCho:
            Number(duLieu.statistics?.dangCho) || 0,
        });

        setPhanTrang({
          trangHienTai:
            Number(
              duLieu.pagination?.trangHienTai
            ) || trangHienTai,
          kichThuocTrang:
            Number(
              duLieu.pagination?.kichThuocTrang
            ) || KICH_THUOC_TRANG,
          tongSoBanGhi:
            Number(
              duLieu.pagination?.tongSoBanGhi
            ) || 0,
          tongSoTrang:
            Number(
              duLieu.pagination?.tongSoTrang
            ) || 0,
        });

        if (hienToast) {
          hienThongBao(
            "Đã cập nhật nhật ký email.",
            "thanh-cong"
          );
        }
      } catch (error) {
        console.error(
          "Lỗi tải nhật ký email:",
          error
        );

        const noiDungLoi = layNoiDungLoi(
          error,
          "Không thể tải nhật ký email."
        );

        setDanhSachNhatKy([]);
        setThongKe(THONG_KE_MAC_DINH);
        setLoiTaiDuLieu(noiDungLoi);
        hienThongBao(noiDungLoi, "loi");
      } finally {
        setDangTaiDuLieu(false);
      }
    },
    [trangHienTai, trangThai, tuKhoa]
  );

  useEffect(() => {
    taiDanhSachNhatKy();
  }, [taiDanhSachNhatKy]);

  function timKiemNhatKy(event) {
    event.preventDefault();

    setTrangHienTai(1);
    setTuKhoa(tuKhoaNhap.trim());
  }

  function thayDoiTrangThai(event) {
    setTrangThai(event.target.value);
    setTrangHienTai(1);
  }

  function dongXacNhanGuiLai() {
    if (dangGuiLai) {
      return;
    }

    setNhatKyCanGuiLai(null);
  }

  async function guiLaiEmail() {
    if (!nhatKyCanGuiLai) {
      return;
    }

    try {
      setDangGuiLai(true);

      const response = await api.post(
        `/admin/email-logs/${nhatKyCanGuiLai.maNhatKyEmail}/retry`
      );

      hienThongBao(
        response.data?.message ||
          "Đã gửi lại email thành công.",
        "thanh-cong"
      );

      setNhatKyCanGuiLai(null);
      setNhatKyDangXem(null);

      await taiDanhSachNhatKy();
    } catch (error) {
      console.error(
        "Lỗi gửi lại email:",
        error
      );

      hienThongBao(
        layNoiDungLoi(
          error,
          "Không thể gửi lại email."
        ),
        "loi"
      );

      setNhatKyCanGuiLai(null);

      await taiDanhSachNhatKy();
    } finally {
      setDangGuiLai(false);
    }
  }

  return (
    <section className="trang-nhat-ky-email-admin">
      {toastAdmin && (
        <div
          className={`thong-bao-admin ${toastAdmin.loai}`}
        >
          {toastAdmin.loai === "loi"
            ? "❌"
            : "✅"}{" "}
          {toastAdmin.noiDung}
        </div>
      )}

      <h1>Nhật ký email</h1>

      <p className="mo-ta-trang-admin">
        Theo dõi trạng thái gửi email cảnh báo giá và
        thực hiện gửi lại những email thất bại.
      </p>

      {loiTaiDuLieu && (
        <p className="mo-ta-trang-admin loi-nhat-ky-email-admin">
          {loiTaiDuLieu}
        </p>
      )}

      <div className="luoi-the-thong-ke-admin">
        <div className="the-thong-ke-admin">
          <h3>Tổng email</h3>
          <strong>{thongKe.tongSo}</strong>
          <p>Tổng số lần hệ thống đã tạo email.</p>
        </div>

        <div className="the-thong-ke-admin">
          <h3>Đã gửi</h3>
          <strong>{thongKe.daGui}</strong>
          <p>Email đã được máy chủ SMTP tiếp nhận.</p>
        </div>

        <div className="the-thong-ke-admin">
          <h3>Thất bại</h3>
          <strong>{thongKe.thatBai}</strong>
          <p>Email cần kiểm tra lỗi hoặc gửi lại.</p>
        </div>

        <div className="the-thong-ke-admin">
          <h3>Đang chờ</h3>
          <strong>{thongKe.dangCho}</strong>
          <p>Email đã tạo nhưng chưa hoàn tất gửi.</p>
        </div>
      </div>

      <form
        className="thanh-cong-cu-nhat-ky-email-admin"
        onSubmit={timKiemNhatKy}
      >
        <div className="o-tim-kiem-nhat-ky-email-admin">
          <input
            type="text"
            placeholder="Tìm email, người nhận, sản phẩm hoặc nguồn"
            value={tuKhoaNhap}
            onChange={(event) =>
              setTuKhoaNhap(event.target.value)
            }
          />

          <button
            type="submit"
            className="nut-tim-kiem-nhat-ky-email-admin"
            aria-label="Tìm kiếm nhật ký email"
          >
            ⌕
          </button>
        </div>

        <div className="select-boc-ngoai">
          <select
            value={trangThai}
            onChange={thayDoiTrangThai}
          >
            <option value="all">
              Tất cả trạng thái
            </option>
            <option value="sent">Đã gửi</option>
            <option value="failed">Thất bại</option>
            <option value="pending">Đang chờ</option>
          </select>

          <span className="mui-ten-select">⌄</span>
        </div>

        <button
          type="button"
          className="nut-lam-moi-nhat-ky-email-admin"
          disabled={dangTaiDuLieu}
          onClick={() =>
            taiDanhSachNhatKy(true)
          }
        >
          {dangTaiDuLieu
            ? "Đang tải..."
            : "Làm mới"}
        </button>
      </form>

      <div className="khu-vuc-danh-sach-nhat-ky-email-admin">
        <div className="dau-danh-sach-nhat-ky-email-admin">
          <h2>Danh sách email</h2>

          <span>
            Tổng cộng:{" "}
            <strong>
              {phanTrang.tongSoBanGhi}
            </strong>{" "}
            bản ghi
          </span>
        </div>

        <div className="khung-bang-nhat-ky-email-admin">
          <table className="bang-nhat-ky-email-admin">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Thời gian</th>
                <th>Người nhận</th>
                <th>Sản phẩm</th>
                <th>Giá hiện tại</th>
                <th>Trạng thái</th>
                <th>Lần thử</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {dangTaiDuLieu ? (
                <tr>
                  <td colSpan="8">
                    Đang tải nhật ký email...
                  </td>
                </tr>
              ) : danhSachNhatKy.length > 0 ? (
                danhSachNhatKy.map((item) => (
                  <tr key={item.maNhatKyEmail}>
                    <td>
                      #{item.maNhatKyEmail}
                    </td>

                    <td>
                      {dinhDangNgayThang(
                        item.ngayTao
                      )}
                    </td>

                    <td className="cot-nguoi-nhan-email-admin">
                      <strong>
                        {item.tenNguoiNhan ||
                          "Chưa cập nhật"}
                      </strong>
                      <span
                        className="email-nguoi-nhan-nhat-ky-admin"
                        title={item.emailNhan}
                      >
                        {item.emailNhan}
                      </span>
                    </td>

                    <td className="cot-san-pham-email-admin">
                      <strong>
                        {item.tenSanPham ||
                          "Không xác định"}
                      </strong>
                      <span>
                        {item.nguonGia ||
                          "Chưa có nguồn"}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {dinhDangTien(
                          item.giaHienTai
                        )}
                      </strong>

                      <small>
                        Mục tiêu:{" "}
                        {dinhDangTien(
                          item.giaMucTieu
                        )}
                      </small>
                    </td>

                    <td>
                      <span
                        className={`nhan-trang-thai-email-admin ${layClassTrangThai(
                          item.trangThai
                        )}`}
                      >
                        {layNoiDungTrangThai(
                          item.trangThai
                        )}
                      </span>
                    </td>

                    <td>
                      {item.soLanThu || 0}
                    </td>

                    <td>
                      <div className="nhom-nut-nhat-ky-email-admin">
                        <button
                          type="button"
                          className="nut-xem-admin"
                          onClick={() =>
                            setNhatKyDangXem(item)
                          }
                        >
                          Xem
                        </button>

                        {item.trangThai ===
                          "failed" && (
                          <button
                            type="button"
                            className="nut-gui-lai-email-admin"
                            onClick={() =>
                              setNhatKyCanGuiLai(
                                item
                              )
                            }
                          >
                            Gửi lại
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8">
                    Không có nhật ký email phù hợp với
                    bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {phanTrang.tongSoTrang > 1 && (
          <div className="phan-trang-admin">
            <button
              type="button"
              onClick={() =>
                setTrangHienTai((trang) =>
                  Math.max(1, trang - 1)
                )
              }
              disabled={trangHienTai === 1}
            >
              ‹
            </button>

            {taoDanhSachTrang(
              trangHienTai,
              phanTrang.tongSoTrang
            ).map((item, index) => {
              if (item === "...") {
                return (
                  <span
                    className="dau-ba-cham-phan-trang"
                    key={`ellipsis-${index}`}
                  >
                    ...
                  </span>
                );
              }

              return (
                <button
                  type="button"
                  key={item}
                  className={
                    trangHienTai === item
                      ? "trang-dang-chon"
                      : ""
                  }
                  onClick={() =>
                    setTrangHienTai(item)
                  }
                >
                  {item}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() =>
                setTrangHienTai((trang) =>
                  Math.min(
                    phanTrang.tongSoTrang,
                    trang + 1
                  )
                )
              }
              disabled={
                trangHienTai ===
                phanTrang.tongSoTrang
              }
            >
              ›
            </button>
          </div>
        )}
      </div>

      {nhatKyDangXem && (
        <div
          className="nen-modal-tien-trinh-admin"
          onClick={() =>
            setNhatKyDangXem(null)
          }
        >
          <div
            className="hop-modal-nhat-ky-email-admin"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="dau-modal-nhat-ky-email-admin">
              <div>
                <p>Chi tiết nhật ký email</p>
                <h2>
                  #{nhatKyDangXem.maNhatKyEmail}
                </h2>
              </div>

              <button
                type="button"
                className="nut-dong-modal-tien-trinh-admin"
                onClick={() =>
                  setNhatKyDangXem(null)
                }
              >
                ×
              </button>
            </div>

            <div className="luoi-thong-tin-nhat-ky-email-admin">
              <div>
                <span>Người nhận</span>
                <strong>
                  {nhatKyDangXem.tenNguoiNhan ||
                    "Chưa cập nhật"}
                </strong>
                <small>
                  {nhatKyDangXem.emailNhan}
                </small>
              </div>

              <div>
                <span>Trạng thái</span>
                <strong>
                  {layNoiDungTrangThai(
                    nhatKyDangXem.trangThai
                  )}
                </strong>
              </div>

              <div>
                <span>Tiêu đề</span>
                <strong>
                  {nhatKyDangXem.tieuDe}
                </strong>
              </div>

              <div>
                <span>Sản phẩm</span>
                <strong>
                  {nhatKyDangXem.tenSanPham ||
                    "Không xác định"}
                </strong>
              </div>

              <div>
                <span>Giá mục tiêu</span>
                <strong>
                  {dinhDangTien(
                    nhatKyDangXem.giaMucTieu
                  )}
                </strong>
              </div>

              <div>
                <span>Giá hiện tại</span>
                <strong>
                  {dinhDangTien(
                    nhatKyDangXem.giaHienTai
                  )}
                </strong>
              </div>

              <div>
                <span>Nguồn giá</span>
                <strong>
                  {nhatKyDangXem.nguonGia ||
                    "Chưa có"}
                </strong>
              </div>

              <div>
                <span>Số lần thử</span>
                <strong>
                  {nhatKyDangXem.soLanThu || 0}
                </strong>
              </div>

              <div>
                <span>Ngày tạo</span>
                <strong>
                  {dinhDangNgayThang(
                    nhatKyDangXem.ngayTao
                  )}
                </strong>
              </div>

              <div>
                <span>Ngày gửi</span>
                <strong>
                  {dinhDangNgayThang(
                    nhatKyDangXem.ngayGui
                  )}
                </strong>
              </div>
            </div>

            {nhatKyDangXem.loiGanNhat && (
              <div className="khung-loi-email-admin">
                <span>Lỗi gần nhất</span>
                <p>
                  {nhatKyDangXem.loiGanNhat}
                </p>
              </div>
            )}

            <div className="nhom-lien-ket-email-admin">
              {nhatKyDangXem.linkSanPham && (
                <a
                  href={
                    nhatKyDangXem.linkSanPham
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Xem trên So Sánh Giá ↗
                </a>
              )}

              {nhatKyDangXem.linkGoc && (
                <a
                  href={nhatKyDangXem.linkGoc}
                  target="_blank"
                  rel="noreferrer"
                >
                  Mở sản phẩm tại nguồn ↗
                </a>
              )}
            </div>

            {nhatKyDangXem.trangThai ===
              "failed" && (
              <button
                type="button"
                className="nut-gui-lai-email-trong-modal-admin"
                onClick={() =>
                  setNhatKyCanGuiLai(
                    nhatKyDangXem
                  )
                }
              >
                Gửi lại email
              </button>
            )}
          </div>
        </div>
      )}

      {nhatKyCanGuiLai && (
        <div
          className="nen-modal-tien-trinh-admin"
          onClick={dongXacNhanGuiLai}
        >
          <div
            className="hop-xac-nhan-nhat-ky-email-admin"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <h2>Xác nhận gửi lại email</h2>

            <p>
              Gửi lại email cảnh báo giá đến{" "}
              <strong>
                {nhatKyCanGuiLai.emailNhan}
              </strong>
              ?
            </p>

            <p className="ghi-chu-gui-lai-email-admin">
              Hệ thống sẽ tạo một bản ghi nhật ký mới
              cho lần gửi này.
            </p>

            <div className="nhom-nut-xac-nhan-tai-khoan-admin">
              <button
                type="button"
                className="nut-huy-tai-khoan-admin"
                disabled={dangGuiLai}
                onClick={dongXacNhanGuiLai}
              >
                Hủy
              </button>

              <button
                type="button"
                className="nut-xac-nhan-tai-khoan-admin"
                disabled={dangGuiLai}
                onClick={guiLaiEmail}
              >
                {dangGuiLai
                  ? "Đang gửi..."
                  : "Gửi lại email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


export default NhatKyEmail;