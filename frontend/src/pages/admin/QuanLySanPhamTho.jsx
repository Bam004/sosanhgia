import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";

function layClassTrangThaiSanPhamTho(trangThai) {
  if (trangThai === "Đã gom nhóm") return "da-gom-nhom";
  if (trangThai === "Chưa gom nhóm") return "chua-gom-nhom";
  return "du-lieu-loi";
}

function dinhDangGia(giaTri) {
  const giaSo = Number(giaTri);

  if (!Number.isFinite(giaSo)) {
    return "Chưa có";
  }

  return `${giaSo.toLocaleString("vi-VN")}đ`;
}

function dinhDangSoLuong(soLuong) {
  return Number(soLuong || 0).toLocaleString("vi-VN");
}

const SO_SAN_PHAM_MOI_TRANG = 5;

function xuLyGiaTriCsv(giaTri) {
  const noiDung = String(giaTri ?? "");

  return `"${noiDung.replace(/"/g, '""')}"`;
}

function taoTenFileXuatExcel() {
  const ngay = new Date();

  const nam = ngay.getFullYear();
  const thang = String(ngay.getMonth() + 1).padStart(2, "0");
  const ngayTrongThang = String(ngay.getDate()).padStart(2, "0");
  const gio = String(ngay.getHours()).padStart(2, "0");
  const phut = String(ngay.getMinutes()).padStart(2, "0");

  return `san-pham-tho-${nam}${thang}${ngayTrongThang}-${gio}${phut}.csv`;
}

function chuanHoaTuKhoaTimKiem(giaTri) {
  return String(giaTri || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

function chuanHoaTenSan(sanTMDT) {
  const sanDaChuanHoa = chuanHoaTuKhoaTimKiem(sanTMDT);

  if (sanDaChuanHoa.includes("cellphone")) return "CellPhoneS";
  if (sanDaChuanHoa.includes("fpt")) return "FPT Shop";
  if (sanDaChuanHoa.includes("hoangha")) return "HoangHaMobile";
  if (sanDaChuanHoa.includes("lazada")) return "Lazada";
  if (sanDaChuanHoa.includes("tiki")) return "Tiki";
  if (sanDaChuanHoa.includes("shopee")) return "Shopee";

  return sanTMDT || "Không rõ";
}

function xacDinhLoaiSanPham(sanPham) {
  const loaiTuApi =
    sanPham.attributes?.loaiSP ||
    sanPham.attributes?.category ||
    sanPham.attributes?.loai;

  const loaiDaChuanHoa = chuanHoaTuKhoaTimKiem(loaiTuApi);

  const laLoaiKhongHopLe =
    !loaiDaChuanHoa ||
    loaiDaChuanHoa === "tim-kiem" ||
    loaiDaChuanHoa.includes("graphql") ||
    loaiDaChuanHoa.includes("advanced-search") ||
    loaiDaChuanHoa.includes("advanced search");

  if (!laLoaiKhongHopLe) {
    if (loaiDaChuanHoa.includes("dien thoai")) return "Điện thoại";
    if (loaiDaChuanHoa.includes("may tinh bang")) return "Máy tính bảng";
    if (loaiDaChuanHoa.includes("tablet")) return "Máy tính bảng";
    if (loaiDaChuanHoa.includes("laptop")) return "Laptop";
    if (loaiDaChuanHoa.includes("phu kien")) return "Phụ kiện";
    if (loaiDaChuanHoa.includes("tai nghe")) return "Phụ kiện";
    if (loaiDaChuanHoa.includes("dong ho")) return "Đồng hồ";

    return loaiTuApi;
  }

  const noiDungSanPham = chuanHoaTuKhoaTimKiem(
    `${sanPham.tenSanPham || ""} ${sanPham.linkGoc || ""}`
  );

  const nhomTuKhoaLoaiSanPham = [
  {
    loai: "Phụ kiện",
      tuKhoa: [
        "tai nghe",
        "airpods",
        "chuot",
        "ban phim",
        "sac",
        "cap",
        "op lung",
        "cuong luc",
        "mieng dan",
        "kinh cuong luc",
        "bao da",
        "day deo",
        "adapter",
        "cu sac",
        "pin sac du phong",
        "sac du phong",
      ],
    },
    {
      loai: "Máy tính bảng",
      tuKhoa: ["ipad", "tablet", "may tinh bang"],
    },
    {
      loai: "Laptop",
      tuKhoa: [
        "laptop",
        "macbook",
        "acer",
        "asus",
        "lenovo",
        "dell",
        "hp",
      ],
    },
    {
      loai: "Đồng hồ",
      tuKhoa: ["apple watch", "smartwatch", "dong ho"],
    },
    {
      loai: "Điện thoại",
      tuKhoa: [
        "iphone",
        "samsung",
        "galaxy",
        "xiaomi",
        "redmi",
        "oppo",
        "vivo",
        "realme",
        "nokia",
        "dien thoai",
        "smartphone",
      ],
    },
  ];

  const nhomTimThay = nhomTuKhoaLoaiSanPham.find((nhom) =>
    nhom.tuKhoa.some((tuKhoa) => noiDungSanPham.includes(tuKhoa))
  );

  return nhomTimThay?.loai || "Chưa phân loại";
}

function dinhDangNgayCapNhat(ngayCapNhat) {
  if (!ngayCapNhat) {
    return "-";
  }

  const ngay = new Date(ngayCapNhat);

  if (Number.isNaN(ngay.getTime())) {
    return ngayCapNhat;
  }

  return ngay.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function layTrangThaiTuSanPhamTho(sanPham) {
  if (!sanPham.giaHienTai || !sanPham.linkGoc) {
    return "Dữ liệu lỗi";
  }

  if (sanPham.maSPCH) {
    return "Đã gom nhóm";
  }

  return "Chưa gom nhóm";
}

function chuyenSanPhamThoTuApi(sanPham) {
  return {
    maSP: `SPT-${sanPham.maSPTho}`,
    maSPTho: sanPham.maSPTho,
    anh: sanPham.hinhAnh || "📦",
    tenSPGoc: sanPham.tenSanPham || "Chưa có tên sản phẩm",
    san: chuanHoaTenSan(sanPham.sanTMDT),
    gia: dinhDangGia(sanPham.giaHienTai),
    danhGia: sanPham.danhGia ?? "Chưa có",
    trangThai: layTrangThaiTuSanPhamTho(sanPham),
    loaiSP: xacDinhLoaiSanPham(sanPham),
    ngayCapNhat: dinhDangNgayCapNhat(sanPham.ngayCapNhat),
    maSPCH: sanPham.maSPCH,
    linkGoc: sanPham.linkGoc,
    hinhAnh: sanPham.hinhAnh,
    giaHienTai: sanPham.giaHienTai,
    soLuongDanhGia: sanPham.soLuongDanhGia,
    attributes: sanPham.attributes,
    ngayCapNhatGoc: sanPham.ngayCapNhat,
  };
}

function AnhSanPhamTho({ anh, tenSPGoc }) {
  const [loiAnh, setLoiAnh] = useState(false);

  if (!anh || loiAnh || !String(anh).startsWith("http")) {
    return <span className="anh-san-pham-tho">📦</span>;
  }

  return (
    <img
      className="anh-san-pham-tho"
      src={anh}
      alt={tenSPGoc}
      onError={() => setLoiAnh(true)}
    />
  );
}

function QuanLySanPhamTho() {
  const [tuKhoa, setTuKhoa] = useState("");
  const [sanLoc, setSanLoc] = useState("Tất cả");
  const [trangThaiLoc, setTrangThaiLoc] = useState("Tất cả");
  const [loaiSPLoc, setLoaiSPLoc] = useState("Tất cả");
  const [danhSachTuApi, setDanhSachTuApi] = useState([]);
  const [dangTai, setDangTai] = useState(false);
  const [loiTaiDuLieu, setLoiTaiDuLieu] = useState("");
  const [thongBao, setThongBao] = useState(null);
  const thongBaoTimeoutRef = useRef(null);
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [sanPhamDangXem, setSanPhamDangXem] = useState(null);
  const [sanPhamDangXoa, setSanPhamDangXoa] = useState(null);

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

  const layDanhSachSanPhamTho = useCallback(async (coHienThongBao = false) => {
    try {
      setDangTai(true);
      setLoiTaiDuLieu("");

      const response = await api.get("/items", {
        params: { limit: 100 },
      });

      setDanhSachTuApi(response.data?.data || []);

      if (coHienThongBao) {
        hienThongBao("Đã cập nhật dữ liệu sản phẩm thô.");
      }
    } catch (error) {
      console.error("Lỗi tải sản phẩm thô:", error);
      setLoiTaiDuLieu("Không thể tải danh sách sản phẩm thô từ backend.");

      if (coHienThongBao) {
        hienThongBao("Không thể tải dữ liệu sản phẩm thô từ backend.", "loi");
      }
    } finally {
      setDangTai(false);
    }
  }, [hienThongBao]);

  useEffect(() => {
    layDanhSachSanPhamTho();
  }, [layDanhSachSanPhamTho]);

  const xoaSanPhamTho = useCallback(
    async (sanPham) => {
      if (!sanPham) {
        return;
      }

      try {
        await api.delete(`/items/${sanPham.maSPTho}`);

        hienThongBao(`Đã xóa sản phẩm ${sanPham.maSP}.`);
        setSanPhamDangXoa(null);

        await layDanhSachSanPhamTho();
      } catch (error) {
        console.error("Lỗi xóa sản phẩm thô:", error);
        hienThongBao("Không thể xóa sản phẩm thô.", "loi");
      }
    },
    [hienThongBao, layDanhSachSanPhamTho]
  );

  const danhSachSanPhamThoTuApi = useMemo(() => {
    return danhSachTuApi.map(chuyenSanPhamThoTuApi);
  }, [danhSachTuApi]);

  const thongKeSanPhamThoTuApi = useMemo(() => {
  const tongSanPham = danhSachSanPhamThoTuApi.length;

  const daGomNhom = danhSachSanPhamThoTuApi.filter(
    (sanPham) => sanPham.trangThai === "Đã gom nhóm"
  ).length;

  const chuaGomNhom = danhSachSanPhamThoTuApi.filter(
    (sanPham) => sanPham.trangThai === "Chưa gom nhóm"
  ).length;

  const duLieuLoi = danhSachSanPhamThoTuApi.filter(
    (sanPham) => sanPham.trangThai === "Dữ liệu lỗi"
  ).length;

  return [
    {
      tieuDe: "Tổng sản phẩm thô",
      giaTri: dinhDangSoLuong(tongSanPham),
      moTa: "Dữ liệu đã thu thập",
    },
    {
      tieuDe: "Đã gom nhóm",
      giaTri: dinhDangSoLuong(daGomNhom),
      moTa: "Đã liên kết sản phẩm chuẩn hóa",
    },
    {
      tieuDe: "Chưa gom nhóm",
      giaTri: dinhDangSoLuong(chuaGomNhom),
      moTa: "Cần xử lý gom nhóm",
    },
    {
      tieuDe: "Dữ liệu lỗi",
      giaTri: dinhDangSoLuong(duLieuLoi),
      moTa: "Thiếu giá, ảnh hoặc link gốc",
    },
  ];
}, [danhSachSanPhamThoTuApi]);

  const danhSachLoaiSP = useMemo(() => {
    const danhSachLoai = danhSachSanPhamThoTuApi
      .map((sanPham) => sanPham.loaiSP)
      .filter(Boolean);

    return ["Tất cả", ...new Set(danhSachLoai)];
  }, [danhSachSanPhamThoTuApi]);

  const danhSachHienThi = useMemo(() => {
    const tuKhoaDaChuanHoa = chuanHoaTuKhoaTimKiem(tuKhoa);

    return danhSachSanPhamThoTuApi.filter((sanPham) => {
      const noiDungTimKiem = chuanHoaTuKhoaTimKiem(
        [
          sanPham.maSP,
          sanPham.maSPCH ? `SPCH-${sanPham.maSPCH}` : "Chưa gom nhóm",
          sanPham.tenSPGoc,
          sanPham.san,
          sanPham.gia,
          sanPham.danhGia,
          sanPham.trangThai,
          sanPham.loaiSP,
          sanPham.ngayCapNhat,
        ].join(" ")
      );

      const khopTuKhoa =
        !tuKhoaDaChuanHoa || noiDungTimKiem.includes(tuKhoaDaChuanHoa);

      const khopSan =
        sanLoc === "Tất cả" ||
        chuanHoaTenSan(sanPham.san) === chuanHoaTenSan(sanLoc);

      const khopTrangThai =
        trangThaiLoc === "Tất cả" || sanPham.trangThai === trangThaiLoc;

      const khopLoaiSP =
        loaiSPLoc === "Tất cả" || sanPham.loaiSP === loaiSPLoc;

      return khopTuKhoa && khopSan && khopTrangThai && khopLoaiSP;
    });
  }, [danhSachSanPhamThoTuApi, tuKhoa, sanLoc, trangThaiLoc, loaiSPLoc]);

  const tongSoTrang = Math.max(
    1,
    Math.ceil(danhSachHienThi.length / SO_SAN_PHAM_MOI_TRANG)
  );

  const danhSachPhanTrang = useMemo(() => {
    const viTriBatDau = (trangHienTai - 1) * SO_SAN_PHAM_MOI_TRANG;
    const viTriKetThuc = viTriBatDau + SO_SAN_PHAM_MOI_TRANG;

    return danhSachHienThi.slice(viTriBatDau, viTriKetThuc);
  }, [danhSachHienThi, trangHienTai]);

  const xuatExcelSanPhamTho = useCallback(() => {
    if (danhSachHienThi.length === 0) {
      hienThongBao("Không có dữ liệu để xuất.", "loi");
      return;
    }

    const tieuDeCot = [
      "Mã sản phẩm thô",
      "Tên sản phẩm gốc",
      "Sàn TMĐT",
      "Giá hiện tại",
      "Đánh giá",
      "Số lượng đánh giá",
      "Loại sản phẩm",
      "Trạng thái",
      "Ngày cập nhật",
      "Link gốc",
    ];

    const dongDuLieu = danhSachHienThi.map((sanPham) => [
      sanPham.maSP,
      sanPham.tenSPGoc,
      sanPham.san,
      sanPham.gia,
      sanPham.danhGia,
      sanPham.soLuongDanhGia ?? 0,
      sanPham.loaiSP,
      sanPham.trangThai,
      `\t${sanPham.ngayCapNhat || ""}`,
      sanPham.linkGoc || "",
    ]);

    const noiDungCsv = [tieuDeCot, ...dongDuLieu]
      .map((dong) => dong.map(xuLyGiaTriCsv).join(","))
      .join("\n");

    const blob = new Blob([`\uFEFF${noiDungCsv}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const theTaiFile = document.createElement("a");

    theTaiFile.href = url;
    theTaiFile.download = taoTenFileXuatExcel();
    theTaiFile.click();

    URL.revokeObjectURL(url);

    hienThongBao("Đã xuất danh sách sản phẩm thô.");
  }, [danhSachHienThi, hienThongBao]);

  useEffect(() => {
    setTrangHienTai(1);
  }, [tuKhoa, sanLoc, trangThaiLoc, loaiSPLoc]);

  return (
    <section className="trang-san-pham-tho-admin">
      {thongBao && (
        <div className={`thong-bao-admin ${thongBao.loai}`}>
          {thongBao.loai === "loi" ? "❌" : "✅"} {thongBao.noiDung}
        </div>
      )}

      <h1>Quản lý sản phẩm thô</h1>

      <p className="mo-ta-trang-admin">
        Theo dõi dữ liệu sản phẩm được thu thập trực tiếp từ các sàn TMĐT trước khi chuẩn hóa và gom nhóm.
      </p>

      <div className="luoi-the-san-pham-tho-admin">
        {thongKeSanPhamThoTuApi.map((item) => (
          <div className="the-san-pham-tho-admin" key={item.tieuDe}>
            <h3>{item.tieuDe}</h3>
            <strong>{item.giaTri}</strong>
            <p>{item.moTa}</p>
          </div>
        ))}
      </div>

      <div className="thanh-cong-cu-san-pham-tho">
        <div className="o-tim-kiem-san-pham-tho">
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm thô"
            value={tuKhoa}
            onChange={(event) => setTuKhoa(event.target.value)}
          />
          <button
            className="nut-tim-kiem-san-pham-tho"
            type="button"
            aria-label="Tìm kiếm sản phẩm thô"
            title="Tìm kiếm"
            onClick={() => setTuKhoa((giaTri) => giaTri.trim())}
          >
            ⌕
          </button>
        </div>

        <div className="select-boc-ngoai">
          <select value={sanLoc} onChange={(event) => setSanLoc(event.target.value)}>
            <option value="Tất cả">Tất cả sàn</option>
            <option value="Lazada">Lazada</option>
            <option value="Tiki">Tiki</option>
            <option value="FPT Shop">FPT Shop</option>
            <option value="CellphoneS">CellPhoneS</option>
            <option value="HoangHaMobile">HoangHaMobile</option>
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>

        <div className="select-boc-ngoai">
          <select
            value={trangThaiLoc}
            onChange={(event) => setTrangThaiLoc(event.target.value)}
          >
            <option value="Tất cả">Tất cả trạng thái</option>
            <option value="Đã gom nhóm">Đã gom nhóm</option>
            <option value="Chưa gom nhóm">Chưa gom nhóm</option>
            <option value="Dữ liệu lỗi">Dữ liệu lỗi</option>
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>

        <div className="select-boc-ngoai">
          <select
            value={loaiSPLoc}
            onChange={(event) => setLoaiSPLoc(event.target.value)}
          >
            {danhSachLoaiSP.map((loaiSP) => (
              <option value={loaiSP} key={loaiSP}>
                {loaiSP === "Tất cả" ? "Tất cả loại SP" : loaiSP}
              </option>
            ))}
          </select>
          <span className="mui-ten-select">⌄</span>
        </div>

        <button
          className="nut-hanh-dong-san-pham-tho"
          type="button"
          onClick={() => layDanhSachSanPhamTho(true)}
          disabled={dangTai}
        >
          {dangTai ? "Đang cập nhật..." : "Cập nhật dữ liệu"}
        </button>

        <button className="nut-hanh-dong-san-pham-tho" type="button" onClick={xuatExcelSanPhamTho}>
          Xuất Excel
        </button>
      </div>

      <div className="khu-vuc-danh-sach-san-pham-tho">
        <h2>Danh sách sản phẩm thô</h2>
        {dangTai && <p>Đang tải dữ liệu sản phẩm thô...</p>}

        {loiTaiDuLieu && <p>{loiTaiDuLieu}</p>}

        <table className="bang-san-pham-tho-admin">
          <thead>
            <tr>
              <th>Mã SPT</th>
              <th>Mã SPCH</th>
              <th>Ảnh</th>
              <th>Tên SP gốc</th>
              <th>Sàn</th>
              <th>Giá hiện tại</th>
              <th>Đánh giá</th>
              <th>Trạng thái</th>
              <th>Ngày cập nhật</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {danhSachPhanTrang.map((sanPham) => (
              <tr key={sanPham.maSP}>
                <td>{sanPham.maSP}</td>
                <td>{sanPham.maSPCH ? `SPCH-${sanPham.maSPCH}` : "Chưa gom"}</td>
                <td>
                  <AnhSanPhamTho anh={sanPham.anh} tenSPGoc={sanPham.tenSPGoc} />
                </td>
                <td className="ten-sp-goc">{sanPham.tenSPGoc}</td>
                <td>{sanPham.san}</td>
                <td>{sanPham.gia}</td>
                <td>{sanPham.danhGia}</td>
                <td>
                  <span
                    className={`nhan-san-pham-tho ${layClassTrangThaiSanPhamTho(
                      sanPham.trangThai
                    )}`}
                  >
                    {sanPham.trangThai}
                  </span>
                </td>
                <td>{sanPham.ngayCapNhat}</td>
                <td>
                  <button
                    className="nut-xem-admin"
                    type="button"
                    onClick={() => setSanPhamDangXem(sanPham)}
                  >
                    Xem
                  </button>

                  <button
                    className="nut-xoa-admin"
                    type="button"
                    onClick={() => setSanPhamDangXoa(sanPham)}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
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

          {Array.from({ length: tongSoTrang }, (_, index) => {
            const soTrang = index + 1;

            return (
              <button
                type="button"
                key={soTrang}
                className={trangHienTai === soTrang ? "trang-dang-chon" : ""}
                onClick={() => setTrangHienTai(soTrang)}
              >
                {soTrang}
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
              <h2>Chi tiết sản phẩm thô</h2>

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
                <AnhSanPhamTho
                  anh={sanPhamDangXem.hinhAnh}
                  tenSPGoc={sanPhamDangXem.tenSPGoc}
                />
              </div>

              <div className="thong-tin-chi-tiet-san-pham-tho">
                <p><strong>Mã sản phẩm thô:</strong> {sanPhamDangXem.maSP}</p>
                <p><strong>Mã sản phẩm chuẩn hóa:</strong> {sanPhamDangXem.maSPCH || "Chưa gom nhóm"}</p>
                <p><strong>Tên sản phẩm gốc:</strong> {sanPhamDangXem.tenSPGoc}</p>
                <p><strong>Sàn TMĐT:</strong> {sanPhamDangXem.san}</p>
                <p><strong>Giá hiện tại:</strong> {sanPhamDangXem.gia}</p>
                <p><strong>Đánh giá:</strong> {sanPhamDangXem.danhGia}</p>
                <p><strong>Số lượng đánh giá:</strong> {sanPhamDangXem.soLuongDanhGia ?? 0}</p>
                <p><strong>Loại sản phẩm:</strong> {sanPhamDangXem.loaiSP}</p>
                <p><strong>Trạng thái:</strong> {sanPhamDangXem.trangThai}</p>
                <p><strong>Ngày cập nhật:</strong> {sanPhamDangXem.ngayCapNhat}</p>

                <p>
                  <strong>Link gốc:</strong>{" "}
                  {sanPhamDangXem.linkGoc ? (
                    <a href={sanPhamDangXem.linkGoc} target="_blank" rel="noreferrer">
                      Mở sản phẩm
                    </a>
                  ) : (
                    "Chưa có"
                  )}
                </p>
              </div>
            </div>

            <div className="attributes-san-pham-tho">
              <strong>Attributes:</strong>
              <pre>
                {JSON.stringify(sanPhamDangXem.attributes || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {sanPhamDangXoa && (
        <div className="modal-nen-admin">
          <div className="modal-xac-nhan-xoa-admin">
            <h2>Xác nhận xóa sản phẩm</h2>

            <p>
              Bạn có chắc muốn xóa sản phẩm{" "}
              <strong>{sanPhamDangXoa.maSP}</strong> không?
            </p>

            <p className="canh-bao-xoa-admin">
              Hành động này không thể hoàn tác.
            </p>

            <div className="nhom-nut-modal-xoa-admin">
              <button
                type="button"
                className="nut-huy-xoa-admin"
                onClick={() => setSanPhamDangXoa(null)}
              >
                Hủy
              </button>

              <button
                type="button"
                className="nut-xac-nhan-xoa-admin"
                onClick={() => xoaSanPhamTho(sanPhamDangXoa)}
              >
                Xóa sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}

export default QuanLySanPhamTho;