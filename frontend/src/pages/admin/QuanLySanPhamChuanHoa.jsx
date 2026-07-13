import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";

function layClassTrangThaiSPCH(trangThai) {
  if (trangThai === "DU_NGUON" || trangThai === "Đủ nguồn") return "du-nguon";
  if (trangThai === "CHUA_DU_NGUON" || trangThai === "Chưa đủ nguồn") {
    return "chua-du-nguon";
  }
  return "can-kiem-tra";
}

function dinhDangTien(giaTri) {
  const soTien = Number(giaTri || 0);

  if (!soTien) return "Chưa có giá";

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(soTien);
}

function formatMaSPCH(maSPCH) {
  if (!maSPCH) return "Chưa có";
  return `SPCH-${maSPCH}`;
}

function hienThiTrangThaiSPCH(trangThai) {
  if (trangThai === "DU_NGUON") return "Đủ nguồn";
  if (trangThai === "CHUA_DU_NGUON") return "Chưa đủ nguồn";
  if (trangThai === "CAN_KIEM_TRA") return "Cần kiểm tra";
  return trangThai || "Chưa xác định";
}

function hienThiLoaiSanPham(loai) {
  if (loai === "phone") return "Điện thoại";
  if (loai === "accessory") return "Phụ kiện";
  if (loai === "repair_service") return "Dịch vụ sửa chữa";
  return loai || "Chưa phân loại";
}

function taoDanhSachTrang(trangHienTai, tongSoTrang) {
  if (tongSoTrang <= 7) {
    return Array.from({ length: tongSoTrang }, (_, index) => index + 1);
  }

  const danhSachTrang = [1];
  const trangBatDau = Math.max(2, trangHienTai - 2);
  const trangKetThuc = Math.min(tongSoTrang - 1, trangHienTai + 2);

  if (trangBatDau > 2) {
    danhSachTrang.push("...");
  }

  for (let trang = trangBatDau; trang <= trangKetThuc; trang += 1) {
    danhSachTrang.push(trang);
  }

  if (trangKetThuc < tongSoTrang - 1) {
    danhSachTrang.push("...");
  }

  danhSachTrang.push(tongSoTrang);

  return danhSachTrang;
}

function QuanLySanPhamChuanHoa() {
  const [tuKhoa, setTuKhoa] = useState("");
  const [loaiLoc, setLoaiLoc] = useState("Tất cả");
  const [thuongHieuLoc, setThuongHieuLoc] = useState("Tất cả");
  const [trangThaiLoc, setTrangThaiLoc] = useState("Tất cả");
  const [danhSachSanPhamChuanHoaTuApi, setDanhSachSanPhamChuanHoaTuApi] = useState([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(false);
  const [loiTaiDuLieu, setLoiTaiDuLieu] = useState("");
  const [thongBao, setThongBao] = useState(null);
  const thongBaoTimeoutRef = useRef(null);
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [sanPhamDangXem, setSanPhamDangXem] = useState(null);
  const [lichSuGiaDangXem, setLichSuGiaDangXem] = useState(null);
  const [dangTaiLichSuGia, setDangTaiLichSuGia] = useState(false);
  const soSanPhamMoiTrang = 5;

  const hienThongBao = useCallback((noiDung, loai = "thanh-cong") => {
    setThongBao({
      noiDung,
      loai,
    });

    if (thongBaoTimeoutRef.current) {
      clearTimeout(thongBaoTimeoutRef.current);
    }

    thongBaoTimeoutRef.current = setTimeout(() => {
      setThongBao(null);
    }, 3000);
  }, []);

  const taiDanhSachSanPhamChuanHoa = useCallback(
    async (coHienThongBao = false) => {
      try {
        setDangTaiDuLieu(true);
        setLoiTaiDuLieu("");

        const response = await api.get("/products/standardized");
        const danhSachMoi = response.data?.data || [];

        setDanhSachSanPhamChuanHoaTuApi(danhSachMoi);

        if (coHienThongBao) {
          hienThongBao("Đã cập nhật dữ liệu sản phẩm chuẩn hóa.");
        }
      } catch (error) {
        console.error("Lỗi tải sản phẩm chuẩn hóa:", error);
        setLoiTaiDuLieu("Không thể tải danh sách sản phẩm chuẩn hóa.");

        if (coHienThongBao) {
          hienThongBao("Không thể tải dữ liệu sản phẩm chuẩn hóa.", "loi");
        }
      } finally {
        setDangTaiDuLieu(false);
      }
    },
    [hienThongBao]
  );

  const taiLichSuGiaSanPham = useCallback(
    async (sanPham) => {
      try {
        setDangTaiLichSuGia(true);
        setLichSuGiaDangXem(null);

        const response = await api.get(
          `/scraping/price-history/standardized/${sanPham.maSPCH}`
        );

        setLichSuGiaDangXem(response.data?.data || null);
      } catch (error) {
        console.error("Lỗi tải lịch sử giá:", error);
        hienThongBao("Không thể tải lịch sử giá sản phẩm.", "loi");
      } finally {
        setDangTaiLichSuGia(false);
      }
    },
    [hienThongBao]
  );

  useEffect(() => {
    taiDanhSachSanPhamChuanHoa();
  }, [taiDanhSachSanPhamChuanHoa]);

  useEffect(() => {
    setTrangHienTai(1);
  }, [tuKhoa, loaiLoc, thuongHieuLoc, trangThaiLoc]);

  const danhSachHienThi = useMemo(() => {
    return danhSachSanPhamChuanHoaTuApi.filter((sanPham) => {
      const khopTuKhoa =
        String(sanPham.maSPCH).toLowerCase().includes(tuKhoa.toLowerCase()) ||
        formatMaSPCH(sanPham.maSPCH).toLowerCase().includes(tuKhoa.toLowerCase()) ||
        (sanPham.tenChuan || "").toLowerCase().includes(tuKhoa.toLowerCase()) ||
        (sanPham.thuongHieu || "").toLowerCase().includes(tuKhoa.toLowerCase());

      const khopLoai = loaiLoc === "Tất cả" || sanPham.loai === loaiLoc;

      const khopThuongHieu =
        thuongHieuLoc === "Tất cả" || sanPham.thuongHieu === thuongHieuLoc;

      const khopTrangThai =
        trangThaiLoc === "Tất cả" || sanPham.trangThai === trangThaiLoc;

      return khopTuKhoa && khopLoai && khopThuongHieu && khopTrangThai;
    });
  }, [danhSachSanPhamChuanHoaTuApi, tuKhoa, loaiLoc, thuongHieuLoc, trangThaiLoc]);

  const danhSachThuongHieu = useMemo(() => {
    return Array.from(
      new Set(
        danhSachSanPhamChuanHoaTuApi
          .map((sanPham) => sanPham.thuongHieu)
          .filter(Boolean)
      )
    ).sort();
  }, [danhSachSanPhamChuanHoaTuApi]);

  const tongSoTrang = Math.max(
    1,
    Math.ceil(danhSachHienThi.length / soSanPhamMoiTrang)
  );

  const danhSachTheoTrang = useMemo(() => {
    const viTriBatDau = (trangHienTai - 1) * soSanPhamMoiTrang;
    return danhSachHienThi.slice(viTriBatDau, viTriBatDau + soSanPhamMoiTrang);
  }, [danhSachHienThi, trangHienTai]);

  const thongKeSanPhamChuanHoaTuApi = useMemo(() => {
    const tongSanPhamChuanHoa = danhSachSanPhamChuanHoaTuApi.length;

    const tongSanPhamThoDaLienKet = danhSachSanPhamChuanHoaTuApi.reduce(
      (tong, sanPham) => tong + Number(sanPham.soSanPhamTho || 0),
      0
    );

    const chuaDuNguon = danhSachSanPhamChuanHoaTuApi.filter(
      (sanPham) => sanPham.trangThai === "CHUA_DU_NGUON"
    ).length;

    const canKiemTra = danhSachSanPhamChuanHoaTuApi.filter(
      (sanPham) => sanPham.trangThai === "CAN_KIEM_TRA" || sanPham.canKiemTra
    ).length;

    return [
      {
        tieuDe: "Sản phẩm chuẩn hóa",
        giaTri: tongSanPhamChuanHoa,
        moTa: "Đã tạo nhóm sản phẩm",
      },
      {
        tieuDe: "Đã liên kết nguồn bán",
        giaTri: tongSanPhamThoDaLienKet,
        moTa: "Sản phẩm thô đã gom nhóm",
      },
      {
        tieuDe: "Chưa đủ nguồn so sánh",
        giaTri: chuaDuNguon,
        moTa: "Chỉ có dữ liệu từ 1 sàn",
      },
      {
        tieuDe: "Cần kiểm tra",
        giaTri: canKiemTra,
        moTa: "Có khả năng gom nhóm sai",
      },
    ];
  }, [danhSachSanPhamChuanHoaTuApi]);

  return (
    <section className="trang-san-pham-chuan-hoa-admin">
      {thongBao && (
        <div className={`thong-bao-admin ${thongBao.loai}`}>
          {thongBao.loai === "loi" ? "❌" : "✅"} {thongBao.noiDung}
        </div>
      )}
      <h1>Quản lý sản phẩm chuẩn hóa</h1>

      <p className="mo-ta-trang-admin">
        Quản lý các sản phẩm đã được chuẩn hóa và gom nhóm từ dữ liệu sản phẩm thô của nhiều sàn TMĐT.
      </p>

      {dangTaiDuLieu && (
        <p className="mo-ta-trang-admin">Đang tải dữ liệu sản phẩm chuẩn hóa...</p>
      )}

      {loiTaiDuLieu && (
        <p className="mo-ta-trang-admin">{loiTaiDuLieu}</p>
      )}

      <div className="luoi-the-san-pham-chuan-hoa-admin">
        {thongKeSanPhamChuanHoaTuApi.map((item) => (
          <div className="the-san-pham-chuan-hoa-admin" key={item.tieuDe}>
            <h3>{item.tieuDe}</h3>
            <strong>{item.giaTri}</strong>
            <p>{item.moTa}</p>
          </div>
        ))}
      </div>

      <div className="thanh-cong-cu-san-pham-chuan-hoa">
        <div className="o-tim-kiem-san-pham-chuan-hoa">
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm chuẩn hóa"
            value={tuKhoa}
            onChange={(event) => setTuKhoa(event.target.value)}
          />
          <span>⌕</span>
        </div>

        <div className="select-boc-ngoai">
          <select value={loaiLoc} onChange={(event) => setLoaiLoc(event.target.value)}>
            <option value="Tất cả">Tất cả loại SP</option>
            <option value="phone">Điện thoại</option>
            <option value="accessory">Phụ kiện</option>
            <option value="repair_service">Dịch vụ sửa chữa</option>
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>

        <div className="select-boc-ngoai">
          <select
            value={thuongHieuLoc}
            onChange={(event) => setThuongHieuLoc(event.target.value)}
          >
            <option value="Tất cả">Tất cả thương hiệu</option>

            {danhSachThuongHieu.map((thuongHieu) => (
              <option value={thuongHieu} key={thuongHieu}>
                {thuongHieu}
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
            <option value="DU_NGUON">Đủ nguồn</option>
            <option value="CHUA_DU_NGUON">Chưa đủ nguồn</option>
            <option value="CAN_KIEM_TRA">Cần kiểm tra</option>
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>

        <button
          className="nut-hanh-dong-san-pham-chuan-hoa"
          type="button"
          onClick={() => taiDanhSachSanPhamChuanHoa(true)}
          disabled={dangTaiDuLieu}
        >
          {dangTaiDuLieu ? "Đang cập nhật..." : "Cập nhật dữ liệu"}
        </button>
      </div>

      <div className="khu-vuc-danh-sach-san-pham-chuan-hoa">
        <h2>Danh sách sản phẩm chuẩn hóa</h2>

        <table className="bang-san-pham-chuan-hoa-admin">
          <thead>
            <tr>
              <th>Mã SPCH</th>
              <th>Ảnh</th>
              <th>Tên chuẩn hóa</th>
              <th>Loại</th>
              <th>Thương hiệu</th>
              <th>Giá thấp nhất</th>
              <th>Giá cao nhất</th>
              <th>Nguồn bán</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {danhSachTheoTrang.length === 0 ? (
              <tr>
                <td colSpan="10" className="o-khong-co-du-lieu">
                  Không tìm thấy sản phẩm chuẩn hóa phù hợp.
                </td>
              </tr>
            ) : (
              danhSachTheoTrang.map((sanPham) => (
                <tr key={sanPham.maSPCH}>
                  <td>{formatMaSPCH(sanPham.maSPCH)}</td>

                  <td>
                    {sanPham.hinhAnhChinh ? (
                      <img
                        className="anh-san-pham-chuan-hoa"
                        src={sanPham.hinhAnhChinh}
                        alt={sanPham.tenChuan}
                      />
                    ) : (
                      <span className="anh-san-pham-chuan-hoa">📦</span>
                    )}
                  </td>

                  <td className="cot-ten-san-pham-chuan-hoa">
                    <div
                      className="ten-san-pham-chuan-hoa-rut-gon"
                      title={sanPham.tenChuan}
                    >
                      {sanPham.tenChuan}
                    </div>
                  </td>
                  <td>{hienThiLoaiSanPham(sanPham.loai)}</td>
                  <td>{sanPham.thuongHieu || "Chưa xác định"}</td>
                  <td>{dinhDangTien(sanPham.giaThapNhat)}</td>
                  <td>{dinhDangTien(sanPham.giaCaoNhat)}</td>
                  <td>{sanPham.soNguonBan}</td>

                  <td>
                    <span
                      className={`nhan-san-pham-chuan-hoa ${layClassTrangThaiSPCH(
                        sanPham.trangThai
                      )}`}
                    >
                      {hienThiTrangThaiSPCH(sanPham.trangThai)}
                    </span>
                  </td>

                  <td className="cot-thao-tac-san-pham-chuan-hoa">
                    <div className="nhom-nut-thao-tac-san-pham-chuan-hoa">
                      <button
                        className="nut-xem-admin"
                        type="button"
                        onClick={() => setSanPhamDangXem(sanPham)}
                      >
                        Xem
                      </button>

                      <button
                        className="nut-xem-admin nut-lich-su-gia-admin"
                        type="button"
                        onClick={() => taiLichSuGiaSanPham(sanPham)}
                        disabled={dangTaiLichSuGia}
                      >
                        Lịch sử giá
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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

          {taoDanhSachTrang(trangHienTai, tongSoTrang).map((item, index) => {
            if (item === "...") {
              return (
                <span className="dau-ba-cham-phan-trang" key={`ellipsis-${index}`}>
                  ...
                </span>
              );
            }

            return (
              <button
                type="button"
                key={item}
                className={trangHienTai === item ? "trang-dang-chon" : ""}
                onClick={() => setTrangHienTai(item)}
              >
                {item}
              </button>
            );
          })}

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

      {sanPhamDangXem && (
        <div className="modal-nen-admin">
          <div className="modal-san-pham-tho">
            <div className="modal-tieu-de-admin">
              <h2>Chi tiết sản phẩm chuẩn hóa</h2>

              <button
                type="button"
                className="nut-dong-modal-admin"
                onClick={() => setSanPhamDangXem(null)}
              >
                ×
              </button>
            </div>

            <div className="noi-dung-modal-san-pham-tho">
              <div className="anh-chi-tiet-san-pham-tho">
                {sanPhamDangXem.hinhAnhChinh ? (
                  <img
                    className="anh-san-pham-tho"
                    src={sanPhamDangXem.hinhAnhChinh}
                    alt={sanPhamDangXem.tenChuan}
                  />
                ) : (
                  <span className="anh-san-pham-tho">📦</span>
                )}
              </div>

              <div className="thong-tin-chi-tiet-san-pham-tho">
                <p>
                  <strong>Mã sản phẩm chuẩn hóa:</strong>{" "}
                  {formatMaSPCH(sanPhamDangXem.maSPCH)}
                </p>

                <p>
                  <strong>Tên chuẩn hóa:</strong> {sanPhamDangXem.tenChuan}
                </p>

                <p>
                  <strong>Loại sản phẩm:</strong>{" "}
                  {hienThiLoaiSanPham(sanPhamDangXem.loai)}
                </p>

                <p>
                  <strong>Thương hiệu:</strong>{" "}
                  {sanPhamDangXem.thuongHieu || "Chưa xác định"}
                </p>

                <p>
                  <strong>Giá thấp nhất:</strong>{" "}
                  {dinhDangTien(sanPhamDangXem.giaThapNhat)}
                </p>

                <p>
                  <strong>Giá cao nhất:</strong>{" "}
                  {dinhDangTien(sanPhamDangXem.giaCaoNhat)}
                </p>

                <p>
                  <strong>Số sản phẩm thô:</strong>{" "}
                  {sanPhamDangXem.soSanPhamTho}
                </p>

                <p>
                  <strong>Số nguồn bán:</strong> {sanPhamDangXem.soNguonBan}
                </p>

                <p>
                  <strong>Trạng thái:</strong>{" "}
                  {hienThiTrangThaiSPCH(sanPhamDangXem.trangThai)}
                </p>

                <p>
                  <strong>Cần kiểm tra:</strong>{" "}
                  {sanPhamDangXem.canKiemTra ? "Có" : "Không"}
                </p>
              </div>
            </div>

            <div className="attributes-san-pham-tho">
              <strong>Mô tả:</strong>
              <pre>{sanPhamDangXem.moTa || "Chưa có mô tả"}</pre>
            </div>
          </div>
        </div>
      )}

      {lichSuGiaDangXem && (
        <div className="modal-nen-admin">
          <div className="modal-san-pham-tho modal-lich-su-gia-admin">
            <div className="modal-tieu-de-admin">
              <h2>Lịch sử giá sản phẩm</h2>

              <button
                type="button"
                className="nut-dong-modal-admin"
                onClick={() => setLichSuGiaDangXem(null)}
              >
                ×
              </button>
            </div>

            <div className="noi-dung-lich-su-gia-admin">
              <div className="tom-tat-lich-su-gia-admin">
                <p>
                  <strong>Mã SPCH:</strong>{" "}
                  {formatMaSPCH(lichSuGiaDangXem.sanPhamChuanHoa?.maSPCH)}
                </p>

                <p>
                  <strong>Tên sản phẩm:</strong>{" "}
                  {lichSuGiaDangXem.sanPhamChuanHoa?.tenChuan}
                </p>

                <p>
                  <strong>Thương hiệu:</strong>{" "}
                  {lichSuGiaDangXem.sanPhamChuanHoa?.thuongHieu || "Chưa xác định"}
                </p>

                <p>
                  <strong>Khoảng giá hiện tại:</strong>{" "}
                  {dinhDangTien(lichSuGiaDangXem.sanPhamChuanHoa?.giaThapNhat)} -{" "}
                  {dinhDangTien(lichSuGiaDangXem.sanPhamChuanHoa?.giaCaoNhat)}
                </p>

                <p>
                  <strong>Số sản phẩm thô:</strong>{" "}
                  {lichSuGiaDangXem.tongSanPhamTho}
                </p>

                <p>
                  <strong>Tổng bản ghi lịch sử:</strong>{" "}
                  {lichSuGiaDangXem.tongBanGhiLichSuGia}
                </p>
              </div>

              {lichSuGiaDangXem.items?.length === 0 ? (
                <p className="mo-ta-trang-admin">
                  Chưa có dữ liệu lịch sử giá cho sản phẩm này.
                </p>
              ) : (
                lichSuGiaDangXem.items.map((item) => (
                  <div className="khoi-nguon-lich-su-gia" key={item.maSPTho}>
                    <div className="dau-khoi-nguon-lich-su-gia">
                      <div>
                        <h3>{item.sanTMDT}</h3>
                        <p>{item.tenSanPham}</p>
                      </div>

                      <strong>{dinhDangTien(item.giaHienTai)}</strong>
                    </div>

                    <table className="bang-lich-su-gia-admin">
                      <thead>
                        <tr>
                          <th>Mã LSG</th>
                          <th>Thời điểm ghi nhận</th>
                          <th>Giá ghi nhận</th>
                        </tr>
                      </thead>

                      <tbody>
                        {item.lichSuGia?.length === 0 ? (
                          <tr>
                            <td colSpan="3" className="o-khong-co-du-lieu">
                              Chưa có lịch sử giá.
                            </td>
                          </tr>
                        ) : (
                          item.lichSuGia.map((lichSu) => (
                            <tr key={lichSu.maLSG}>
                              <td>LSG-{lichSu.maLSG}</td>
                              <td>{lichSu.ngayGhiNhan}</td>
                              <td>{dinhDangTien(lichSu.gia)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default QuanLySanPhamChuanHoa;

