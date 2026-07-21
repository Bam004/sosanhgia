import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";

const KICH_THUOC_TRANG = 10;

function dinhDangTien(giaTri) {
  if (giaTri === null || giaTri === undefined) {
    return "Chưa có giá";
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
  });
}

function layNoiDungLoi(error, noiDungMacDinh) {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    noiDungMacDinh
  );
}

function layTrangThaiHienThi(trangThai) {
  const danhSach = {
    dang_theo_doi: "Đang theo dõi",
    da_dat_gia: "Đã đạt giá",
    da_thong_bao: "Đã gửi thông báo",
    chua_dat_gia_mong_muon: "Chưa đặt giá",
    da_tam_dung: "Đã tạm dừng",
  };

  return danhSach[trangThai] || "Không xác định";
}

function layClassTrangThai(trangThai) {
  if (trangThai === "da_thong_bao") {
    return "da-thong-bao";
  }

  if (trangThai === "da_dat_gia") {
    return "da-dat-gia";
  }

  if (trangThai === "da_tam_dung") {
    return "da-tam-dung";
  }

  if (trangThai === "chua_dat_gia_mong_muon") {
    return "chua-dat-gia";
  }

  return "dang-theo-doi";
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

function QuanLyTheoDoiGia() {
  const [danhSachTheoDoi, setDanhSachTheoDoi] = useState([]);
  const [tuKhoaNhap, setTuKhoaNhap] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [trangThai, setTrangThai] = useState("all");
  const [thongBao, setThongBao] = useState("all");
  const [trangHienTai, setTrangHienTai] = useState(1);

  const [phanTrang, setPhanTrang] = useState({
    trangHienTai: 1,
    kichThuocTrang: KICH_THUOC_TRANG,
    tongSoBanGhi: 0,
    tongSoTrang: 0,
  });

  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(false);
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loiTaiDuLieu, setLoiTaiDuLieu] = useState("");
  const [toastAdmin, setToastAdmin] = useState(null);
  const [theoDoiDangXem, setTheoDoiDangXem] = useState(null);
  const [theoDoiCanXacNhan, setTheoDoiCanXacNhan] = useState(null);
  const [hanhDongXacNhan, setHanhDongXacNhan] = useState(null);

  function hienThongBao(noiDung, loai = "thanh-cong") {
    setToastAdmin({ noiDung, loai });

    window.setTimeout(() => {
      setToastAdmin(null);
    }, 3000);
  }

  const taiDanhSachTheoDoi = useCallback(
    async (hienToast = false) => {
      try {
        setDangTaiDuLieu(true);
        setLoiTaiDuLieu("");

        const response = await api.get("/admin/price-tracking", {
          params: {
            tuKhoa,
            trangThai,
            thongBao,
            trang: trangHienTai,
            kichThuocTrang: KICH_THUOC_TRANG,
          },
        });

        const duLieu = response.data?.data || {};

        setDanhSachTheoDoi(
          Array.isArray(duLieu.items) ? duLieu.items : []
        );

        setPhanTrang({
          trangHienTai:
            Number(duLieu.pagination?.trangHienTai) || trangHienTai,
          kichThuocTrang:
            Number(duLieu.pagination?.kichThuocTrang) ||
            KICH_THUOC_TRANG,
          tongSoBanGhi:
            Number(duLieu.pagination?.tongSoBanGhi) || 0,
          tongSoTrang:
            Number(duLieu.pagination?.tongSoTrang) || 0,
        });

        if (hienToast) {
          hienThongBao(
            "Đã cập nhật danh sách theo dõi giá.",
            "thanh-cong"
          );
        }
      } catch (error) {
        console.error("Lỗi tải danh sách theo dõi giá:", error);

        const noiDungLoi = layNoiDungLoi(
          error,
          "Không thể tải danh sách theo dõi giá."
        );

        setDanhSachTheoDoi([]);
        setLoiTaiDuLieu(noiDungLoi);
        hienThongBao(noiDungLoi, "loi");
      } finally {
        setDangTaiDuLieu(false);
      }
    },
    [thongBao, trangHienTai, trangThai, tuKhoa]
  );

  useEffect(() => {
    taiDanhSachTheoDoi();
  }, [taiDanhSachTheoDoi]);

  function timKiemTheoDoi(event) {
    event.preventDefault();
    setTrangHienTai(1);
    setTuKhoa(tuKhoaNhap.trim());
  }

  function thayDoiTrangThai(event) {
    setTrangThai(event.target.value);
    setTrangHienTai(1);
  }

  function thayDoiThongBao(event) {
    setThongBao(event.target.value);
    setTrangHienTai(1);
  }

  function moXacNhanTrangThai(item) {
    setTheoDoiCanXacNhan(item);
    setHanhDongXacNhan("status");
  }

  function moXacNhanXoa(item) {
    setTheoDoiCanXacNhan(item);
    setHanhDongXacNhan("delete");
  }

  function dongXacNhan() {
    if (dangXuLy) {
      return;
    }

    setTheoDoiCanXacNhan(null);
    setHanhDongXacNhan(null);
  }

  async function capNhatTrangThai(item) {
    try {
      setDangXuLy(true);

      const response = await api.patch(
        `/admin/price-tracking/${item.maTheoDoi}/status`,
        {
          trangThai: !item.trangThai,
        }
      );

      hienThongBao(
        response.data?.message ||
          "Đã cập nhật trạng thái theo dõi.",
        "thanh-cong"
      );

      dongXacNhan();
      setTheoDoiDangXem(null);

      await taiDanhSachTheoDoi();
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái theo dõi:", error);

      hienThongBao(
        layNoiDungLoi(
          error,
          "Không thể cập nhật trạng thái theo dõi."
        ),
        "loi"
      );
    } finally {
      setDangXuLy(false);
      setTheoDoiCanXacNhan(null);
      setHanhDongXacNhan(null);
    }
  }

  async function xoaTheoDoi(item) {
    try {
      setDangXuLy(true);

      const response = await api.delete(
        `/admin/price-tracking/${item.maTheoDoi}`
      );

      hienThongBao(
        response.data?.message ||
          "Đã xóa yêu cầu theo dõi giá.",
        "thanh-cong"
      );

      setTheoDoiDangXem(null);
      setTheoDoiCanXacNhan(null);
      setHanhDongXacNhan(null);

      await taiDanhSachTheoDoi();
    } catch (error) {
      console.error("Lỗi xóa yêu cầu theo dõi:", error);

      hienThongBao(
        layNoiDungLoi(
          error,
          "Không thể xóa yêu cầu theo dõi giá."
        ),
        "loi"
      );
    } finally {
      setDangXuLy(false);
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
    <section className="trang-theo-doi-gia-admin">
      {toastAdmin && (
        <div className={`thong-bao-admin ${toastAdmin.loai}`}>
          {toastAdmin.loai === "loi" ? "❌" : "✅"}{" "}
          {toastAdmin.noiDung}
        </div>
      )}

      <h1>Quản lý theo dõi giá</h1>

      <p className="mo-ta-trang-admin">
        Theo dõi các yêu cầu cảnh báo giá, trạng thái gửi email và
        mức giá mong muốn của người dùng.
      </p>

      {loiTaiDuLieu && (
        <p className="mo-ta-trang-admin loi-theo-doi-gia-admin">
          {loiTaiDuLieu}
        </p>
      )}

      <form
        className="thanh-cong-cu-theo-doi-gia-admin"
        onSubmit={timKiemTheoDoi}
      >
        <div className="o-tim-kiem-theo-doi-gia-admin">
          <input
            type="text"
            placeholder="Tìm người dùng, email hoặc sản phẩm"
            value={tuKhoaNhap}
            onChange={(event) =>
              setTuKhoaNhap(event.target.value)
            }
          />

          <button
            type="submit"
            className="nut-tim-kiem-theo-doi-gia-admin"
            aria-label="Tìm kiếm theo dõi giá"
          >
            ⌕
          </button>
        </div>

        <div className="select-boc-ngoai">
          <select
            value={trangThai}
            onChange={thayDoiTrangThai}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã tạm dừng</option>
          </select>

          <span className="mui-ten-select">⌄</span>
        </div>

        <div className="select-boc-ngoai">
          <select
            value={thongBao}
            onChange={thayDoiThongBao}
          >
            <option value="all">Tất cả thông báo</option>
            <option value="sent">Đã gửi email</option>
            <option value="pending">Chưa gửi email</option>
          </select>

          <span className="mui-ten-select">⌄</span>
        </div>

        <button
          type="button"
          className="nut-lam-moi-theo-doi-gia-admin"
          disabled={dangTaiDuLieu}
          onClick={() => taiDanhSachTheoDoi(true)}
        >
          {dangTaiDuLieu ? "Đang tải..." : "Làm mới"}
        </button>
      </form>

      <div className="khu-vuc-danh-sach-theo-doi-gia-admin">
        <div className="dau-danh-sach-theo-doi-gia-admin">
          <h2>Danh sách theo dõi giá</h2>

          <span>
            Tổng cộng:{" "}
            <strong>{phanTrang.tongSoBanGhi}</strong> yêu cầu
          </span>
        </div>

        <div className="khung-bang-theo-doi-gia-admin">
          <table className="bang-theo-doi-gia-admin">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Người dùng</th>
                <th>Sản phẩm</th>
                <th>Giá hiện tại</th>
                <th>Giá mong muốn</th>
                <th>Trạng thái</th>
                <th>Email</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {dangTaiDuLieu ? (
                <tr>
                  <td colSpan="8">
                    Đang tải danh sách theo dõi giá...
                  </td>
                </tr>
              ) : danhSachTheoDoi.length > 0 ? (
                danhSachTheoDoi.map((item) => (
                  <tr key={item.maTheoDoi}>
                    <td>#{item.maTheoDoi}</td>

                    <td className="cot-nguoi-dung-theo-doi-admin">
                      <strong>
                        {item.nguoiDung?.hoTen || "Chưa cập nhật"}
                      </strong>
                      <span>{item.nguoiDung?.email}</span>
                    </td>

                    <td className="cot-san-pham-theo-doi-admin">
                      <strong>
                        {item.sanPham?.tenChuanHoa ||
                          "Không xác định"}
                      </strong>

                      <span>
                        #{item.sanPham?.maSPCH}
                        {item.sanPham?.thuongHieu
                          ? ` • ${item.sanPham.thuongHieu}`
                          : ""}
                        {item.sanPham?.dungLuong
                          ? ` • ${item.sanPham.dungLuong}`
                          : ""}
                      </span>
                    </td>

                    <td>
                      <strong className="gia-hien-tai-theo-doi-admin">
                        {dinhDangTien(item.giaHienTai)}
                      </strong>

                      <span className="nguon-gia-theo-doi-admin">
                        {item.nguonGiaThapNhat || "Chưa có nguồn"}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {dinhDangTien(item.giaMongMuon)}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`nhan-theo-doi-gia-admin ${layClassTrangThai(
                          item.trangThaiHienThi
                        )}`}
                      >
                        {layTrangThaiHienThi(
                          item.trangThaiHienThi
                        )}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`nhan-email-theo-doi-admin ${
                          item.daThongBao ? "da-gui" : "chua-gui"
                        }`}
                      >
                        {item.daThongBao
                          ? "Đã gửi"
                          : "Chưa gửi"}
                      </span>

                      {item.ngayThongBao && (
                        <small>
                          {dinhDangNgayThang(item.ngayThongBao)}
                        </small>
                      )}
                    </td>

                    <td>
                      <div className="nhom-nut-theo-doi-gia-admin">
                        <button
                          type="button"
                          className="nut-xem-admin"
                          onClick={() =>
                            setTheoDoiDangXem(item)
                          }
                        >
                          Xem
                        </button>

                        <button
                          type="button"
                          className={`nut-trang-thai-theo-doi-gia-admin ${
                            item.trangThai
                              ? "tam-dung"
                              : "kich-hoat"
                          }`}
                          onClick={() =>
                            moXacNhanTrangThai(item)
                          }
                        >
                          {item.trangThai
                            ? "Tạm dừng"
                            : "Bật lại"}
                        </button>

                        <button
                          type="button"
                          className="nut-xoa-theo-doi-gia-admin"
                          onClick={() => moXacNhanXoa(item)}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8">
                    Không có yêu cầu theo dõi phù hợp với bộ lọc.
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
                    onClick={() => setTrangHienTai(item)}
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
                    trangHienTai === phanTrang.tongSoTrang
                }
                >
                ›
                </button>
            </div>
            )}
      </div>

      {theoDoiDangXem && (
        <div
          className="nen-modal-tien-trinh-admin"
          onClick={() => setTheoDoiDangXem(null)}
        >
          <div
            className="hop-modal-theo-doi-gia-admin"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dau-modal-theo-doi-gia-admin">
              <div>
                <p>Chi tiết yêu cầu theo dõi</p>
                <h2>
                  {theoDoiDangXem.sanPham?.tenChuanHoa}
                </h2>
              </div>

              <button
                type="button"
                className="nut-dong-modal-tien-trinh-admin"
                onClick={() => setTheoDoiDangXem(null)}
              >
                ×
              </button>
            </div>

            <div className="luoi-thong-tin-theo-doi-gia-admin">
              <div>
                <span>Mã theo dõi</span>
                <strong>#{theoDoiDangXem.maTheoDoi}</strong>
              </div>

              <div>
                <span>Người dùng</span>
                <strong>
                  {theoDoiDangXem.nguoiDung?.hoTen}
                </strong>
                <small>
                  {theoDoiDangXem.nguoiDung?.email}
                </small>
              </div>

              <div>
                <span>Giá hiện tại</span>
                <strong>
                  {dinhDangTien(theoDoiDangXem.giaHienTai)}
                </strong>
              </div>

              <div>
                <span>Giá mong muốn</span>
                <strong>
                  {dinhDangTien(
                    theoDoiDangXem.giaMongMuon
                  )}
                </strong>
              </div>

              <div>
                <span>Nguồn giá thấp nhất</span>
                <strong>
                  {theoDoiDangXem.nguonGiaThapNhat ||
                    "Chưa có"}
                </strong>
              </div>

              <div>
                <span>Trạng thái</span>
                <strong>
                  {layTrangThaiHienThi(
                    theoDoiDangXem.trangThaiHienThi
                  )}
                </strong>
              </div>

              <div>
                <span>Ngày theo dõi</span>
                <strong>
                  {dinhDangNgayThang(
                    theoDoiDangXem.ngayTheoDoi
                  )}
                </strong>
              </div>

              <div>
                <span>Ngày cập nhật</span>
                <strong>
                  {dinhDangNgayThang(
                    theoDoiDangXem.ngayCapNhat
                  )}
                </strong>
              </div>

              <div>
                <span>Trạng thái email</span>
                <strong>
                  {theoDoiDangXem.daThongBao
                    ? "Đã gửi thông báo"
                    : "Chưa gửi thông báo"}
                </strong>
              </div>

              <div>
                <span>Ngày gửi email</span>
                <strong>
                  {dinhDangNgayThang(
                    theoDoiDangXem.ngayThongBao
                  )}
                </strong>
              </div>

              <div>
                <span>Giá lúc thông báo</span>
                <strong>
                  {dinhDangTien(
                    theoDoiDangXem.giaLucThongBao
                  )}
                </strong>
              </div>
            </div>

            {theoDoiDangXem.linkGoc && (
              <a
                className="lien-ket-nguon-theo-doi-gia-admin"
                href={theoDoiDangXem.linkGoc}
                target="_blank"
                rel="noreferrer"
              >
                Mở sản phẩm tại nguồn ↗
              </a>
            )}
          </div>
        </div>
      )}

      {theoDoiCanXacNhan && (
        <div
          className="nen-modal-tien-trinh-admin"
          onClick={dongXacNhan}
        >
          <div
            className="hop-xac-nhan-theo-doi-gia-admin"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>
              {hanhDongXacNhan === "delete"
                ? "Xác nhận xóa theo dõi"
                : theoDoiCanXacNhan.trangThai
                  ? "Xác nhận tạm dừng"
                  : "Xác nhận bật lại"}
            </h2>

            <p>
              Yêu cầu theo dõi sản phẩm{" "}
              <strong>
                {theoDoiCanXacNhan.sanPham?.tenChuanHoa}
              </strong>{" "}
              của{" "}
              <strong>
                {theoDoiCanXacNhan.nguoiDung?.email}
              </strong>
              .
            </p>

            {hanhDongXacNhan === "delete" && (
              <p className="canh-bao-xoa-theo-doi-gia-admin">
                Dữ liệu theo dõi sẽ bị xóa khỏi hệ thống và không thể
                khôi phục.
              </p>
            )}

            <div className="nhom-nut-xac-nhan-tai-khoan-admin">
              <button
                type="button"
                className="nut-huy-tai-khoan-admin"
                disabled={dangXuLy}
                onClick={dongXacNhan}
              >
                Hủy
              </button>

              <button
                type="button"
                className="nut-xac-nhan-tai-khoan-admin"
                disabled={dangXuLy}
                onClick={() => {
                  if (hanhDongXacNhan === "delete") {
                    xoaTheoDoi(theoDoiCanXacNhan);
                  } else {
                    capNhatTrangThai(theoDoiCanXacNhan);
                  }
                }}
              >
                {dangXuLy
                  ? "Đang xử lý..."
                  : hanhDongXacNhan === "delete"
                    ? "Xóa theo dõi"
                    : theoDoiCanXacNhan.trangThai
                      ? "Tạm dừng"
                      : "Bật lại"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default QuanLyTheoDoiGia;