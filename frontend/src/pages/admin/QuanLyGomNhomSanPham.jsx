import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

function formatVND(value) {
  const numberValue = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(numberValue);
}

function formatMaSPTho(maSPTho) {
  return `SPT-${maSPTho}`;
}

function formatMaSPCH(maSPCH) {
  if (!maSPCH) return "Chưa có";
  return `SPCH-${maSPCH}`;
}

function chuanHoaChuoi(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function layDongMayTuTen(tenSanPham) {
  const ten = chuanHoaChuoi(tenSanPham);

  const danhSachDongMay = [
    "iphone 15 pro max",
    "iphone 15 pro",
    "iphone 15 plus",
    "iphone 15",
    "iphone 14 pro max",
    "iphone 14 pro",
    "iphone 14 plus",
    "iphone 14",
    "redmi note 13",
    "redmi note 12",
    "redmi note 10",
    "macbook air m2",
    "macbook air m1",
  ];

  return danhSachDongMay.find((dongMay) => ten.includes(dongMay)) || "";
}

function layDungLuongTuTen(tenSanPham) {
  const ten = chuanHoaChuoi(tenSanPham);
  const ketQua = ten.match(/\b(\d+)\s*(gb|tb)\b/);

  if (!ketQua) return "";

  return `${ketQua[1]}${ketQua[2]}`.toUpperCase();
}

function laPhuKien(tenSanPham) {
  const ten = chuanHoaChuoi(tenSanPham);

  const tuKhoaPhuKien = [
    "op lung",
    "mieng dan",
    "kinh cuong luc",
    "kinh dan",
    "cuong luc",
    "case",
    "cover",
    "magsafe",
    "sac",
    "cap",
    "tai nghe",
    "adapter",
    "pin du phong",
    "thay man hinh",
  ];

  return tuKhoaPhuKien.some((tuKhoa) => ten.includes(tuKhoa));
}

function tachTuKhoa(tenSanPham) {
  const tuBoQua = new Set([
    "chinh",
    "hang",
    "vn",
    "vna",
    "apple",
    "dien",
    "thoai",
    "cho",
    "va",
    "the",
    "new",
  ]);

  return chuanHoaChuoi(tenSanPham)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((tu) => tu.length >= 2 && !tuBoQua.has(tu));
}

function tinhDiemTrungTuKhoa(tenA, tenB) {
  const tapA = new Set(tachTuKhoa(tenA));
  const tapB = new Set(tachTuKhoa(tenB));

  if (tapA.size === 0 || tapB.size === 0) return 0;

  const soTuTrung = [...tapA].filter((tu) => tapB.has(tu)).length;
  const tongTuKhacNhau = new Set([...tapA, ...tapB]).size;

  return soTuTrung / tongTuKhacNhau;
}

function tinhPhanTramTuongDong(tenSanPhamTho, tenNhomChuanHoa) {
  const dongMaySanPhamTho = layDongMayTuTen(tenSanPhamTho);
  const dongMayNhom = layDongMayTuTen(tenNhomChuanHoa);

  const dungLuongSanPhamTho = layDungLuongTuTen(tenSanPhamTho);
  const dungLuongNhom = layDungLuongTuTen(tenNhomChuanHoa);

  const sanPhamThoLaPhuKien = laPhuKien(tenSanPhamTho);
  const nhomLaPhuKien = laPhuKien(tenNhomChuanHoa);

  const diemTuKhoa = tinhDiemTrungTuKhoa(tenSanPhamTho, tenNhomChuanHoa);

  let diem = 0;

  if (dongMaySanPhamTho && dongMayNhom) {
    diem += dongMaySanPhamTho === dongMayNhom ? 55 : 0;
  } else {
    diem += diemTuKhoa * 45;
  }

  if (dungLuongSanPhamTho && dungLuongNhom) {
    diem += dungLuongSanPhamTho === dungLuongNhom ? 25 : -15;
  } else if (!dungLuongSanPhamTho && !dungLuongNhom) {
    diem += 5;
  }

  if (sanPhamThoLaPhuKien === nhomLaPhuKien) {
    diem += 10;
  } else {
    diem -= 30;
  }

  diem += diemTuKhoa * 20;

  return Math.max(0, Math.min(100, Math.round(diem)));
}

function layTrangThaiGomNhom(sanPham) {
  return sanPham.maSPCH ? "Đã gom nhóm" : "Chưa gom nhóm";
}

function layClassTrangThaiGomNhom(trangThai) {
  if (trangThai === "Đã gom nhóm") return "da-gom-nhom";
  return "chua-gom-nhom";
}

function tinhThongKeGomNhom(danhSachSanPham) {
  const tongSanPham = danhSachSanPham.length;
  const daGom = danhSachSanPham.filter((item) => item.maSPCH).length;
  const chuaGom = danhSachSanPham.filter((item) => !item.maSPCH).length;

  const soNhom = new Set(
    danhSachSanPham
      .filter((item) => item.maSPCH)
      .map((item) => item.maSPCH)
  ).size;

  return [
    {
      tieuDe: "Tổng sản phẩm thô",
      giaTri: tongSanPham,
      moTa: "Dữ liệu lấy từ API /api/items",
    },
    {
      tieuDe: "Chưa gom nhóm",
      giaTri: chuaGom,
      moTa: "Sản phẩm có maSPCH rỗng",
    },
    {
      tieuDe: "Đã gom nhóm",
      giaTri: daGom,
      moTa: "Sản phẩm đã có maSPCH",
    },
    {
      tieuDe: "Số nhóm hiện có",
      giaTri: soNhom,
      moTa: "Nhóm sản phẩm chuẩn hóa",
    },
  ];
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

function QuanLyGomNhomSanPham() {
  const [danhSachSanPham, setDanhSachSanPham] = useState([]);
  const [tuKhoa, setTuKhoa] = useState("");
  const [sanLoc, setSanLoc] = useState("Tất cả");
  const [sanPhamDangChon, setSanPhamDangChon] = useState(null);
  const [dangTai, setDangTai] = useState(false);
  const [loiTaiDuLieu, setLoiTaiDuLieu] = useState("");
  const [dangGanNhom, setDangGanNhom] = useState(false);
  const [thongBao, setThongBao] = useState(null);
  const [trangNhomHienTai, setTrangNhomHienTai] = useState(1);
  const [trangSanPhamThoHienTai, setTrangSanPhamThoHienTai] = useState(1);

  const SO_DONG_MOI_TRANG = 5;


  async function taiDanhSachSanPham(coHienThongBao = false) {
    try {
      setDangTai(true);
      setLoiTaiDuLieu("");

      const response = await api.get("/items", {
        params: { limit: 1000 },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Không thể tải danh sách sản phẩm");
      }

      const data = Array.isArray(response.data?.data) ? response.data.data : [];
      setDanhSachSanPham(data);

      const sanPhamChuaGomDauTien = data.find((item) => !item.maSPCH);

      setSanPhamDangChon((sanPhamHienTai) => {
        const sanPhamDangChonConTonTai = data.find(
          (item) =>
            item.maSPTho === sanPhamHienTai?.maSPTho && !item.maSPCH
        );

        return sanPhamDangChonConTonTai || sanPhamChuaGomDauTien || null;
      });

      if (coHienThongBao) {
        setThongBao({
          loai: "thanh-cong",
          noiDung: "Đã cập nhật dữ liệu gom nhóm sản phẩm.",
        });
      }
    } catch (error) {
      const noiDungLoi = error.message || "Có lỗi xảy ra khi tải dữ liệu";

      setLoiTaiDuLieu(noiDungLoi);

      if (coHienThongBao) {
        setThongBao({
          loai: "loi",
          noiDung: "Không thể cập nhật dữ liệu gom nhóm sản phẩm.",
        });
      }
    } finally {
      setDangTai(false);
    }
  }

  async function ganSanPhamVaoNhom(maSPCH) {
    if (!sanPhamDangChon) {
      setThongBao({
        loai: "loi",
        noiDung: "Vui lòng chọn một sản phẩm thô trước khi gắn nhóm.",
      });
      return;
    }

    if (sanPhamDangChon.maSPCH) {
      setThongBao({
        loai: "loi",
        noiDung: "Sản phẩm này đã được gom nhóm trước đó.",
      });
      return;
    }

    try {
      setDangGanNhom(true);
      setThongBao(null);

      const response = await api.put(`/items/${sanPhamDangChon.maSPTho}`, {
        maSPCH,
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.error || "Không thể gắn sản phẩm vào nhóm"
        );
      }

      setDanhSachSanPham((prevDanhSach) =>
        prevDanhSach.map((item) =>
          item.maSPTho === sanPhamDangChon.maSPTho
            ? {
                ...item,
                maSPCH,
              }
            : item
        )
      );

      const sanPhamChuaGomTiepTheo = danhSachSanPham.find(
        (item) => !item.maSPCH && item.maSPTho !== sanPhamDangChon.maSPTho
      );

      setSanPhamDangChon(sanPhamChuaGomTiepTheo || null);

      setThongBao({
        loai: "thanh-cong",
        noiDung: `Đã gắn ${formatMaSPTho(
          sanPhamDangChon.maSPTho
        )} vào ${formatMaSPCH(maSPCH)}.`,
      });
    } catch (error) {
      setThongBao({
        loai: "loi",
        noiDung: error.message || "Có lỗi xảy ra khi gắn nhóm sản phẩm.",
      });
    } finally {
      setDangGanNhom(false);
    }
  }

  useEffect(() => {
    taiDanhSachSanPham();
  }, []);

  useEffect(() => {
    if (!thongBao) return;

    const timeoutId = setTimeout(() => {
      setThongBao(null);
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [thongBao]);

  const thongKeGomNhom = useMemo(() => {
    return tinhThongKeGomNhom(danhSachSanPham);
  }, [danhSachSanPham]);

  const danhSachSan = useMemo(() => {
    const danhSach = danhSachSanPham
      .map((item) => item.sanTMDT)
      .filter(Boolean);

    return ["Tất cả", ...new Set(danhSach)];
  }, [danhSachSanPham]);

  const danhSachSanPhamChuaGom = useMemo(() => {
    return danhSachSanPham.filter((item) => !item.maSPCH);
  }, [danhSachSanPham]);

  const danhSachHienThi = useMemo(() => {
    const tuKhoaChuanHoa = chuanHoaChuoi(tuKhoa);

    return danhSachSanPhamChuaGom.filter((sanPham) => {
      const khopTuKhoa =
        chuanHoaChuoi(formatMaSPTho(sanPham.maSPTho)).includes(tuKhoaChuanHoa) ||
        chuanHoaChuoi(sanPham.tenSanPham).includes(tuKhoaChuanHoa) ||
        chuanHoaChuoi(sanPham.sanTMDT).includes(tuKhoaChuanHoa);

      const khopSan = sanLoc === "Tất cả" || sanPham.sanTMDT === sanLoc;

      return khopTuKhoa && khopSan;
    });
  }, [danhSachSanPhamChuaGom, tuKhoa, sanLoc]);

  const tongSoTrangSanPhamTho = Math.max(
    1,
    Math.ceil(danhSachHienThi.length / SO_DONG_MOI_TRANG)
  );

  const danhSachSanPhamThoTheoTrang = useMemo(() => {
    const viTriBatDau = (trangSanPhamThoHienTai - 1) * SO_DONG_MOI_TRANG;
    const viTriKetThuc = viTriBatDau + SO_DONG_MOI_TRANG;

    return danhSachHienThi.slice(viTriBatDau, viTriKetThuc);
  }, [danhSachHienThi, trangSanPhamThoHienTai]);

  useEffect(() => {
    setTrangSanPhamThoHienTai(1);
  }, [tuKhoa, sanLoc]);

  useEffect(() => {
    if (trangSanPhamThoHienTai > tongSoTrangSanPhamTho) {
      setTrangSanPhamThoHienTai(tongSoTrangSanPhamTho);
    }
  }, [trangSanPhamThoHienTai, tongSoTrangSanPhamTho]);

  const danhSachNhomDaCo = useMemo(() => {
    const mapNhom = new Map();

    danhSachSanPham
      .filter((item) => item.maSPCH)
      .forEach((item) => {
        const nhomHienTai = mapNhom.get(item.maSPCH);

        if (!nhomHienTai) {
          mapNhom.set(item.maSPCH, {
            maSPCH: item.maSPCH,
            tenDaiDien: item.tenSanPham,
            giaThapNhat: Number(item.giaHienTai || 0),
            giaCaoNhat: Number(item.giaHienTai || 0),
            soSanPham: 1,
            danhSachSan: new Set([item.sanTMDT]),
          });
        } else {
          nhomHienTai.giaThapNhat = Math.min(
            nhomHienTai.giaThapNhat,
            Number(item.giaHienTai || 0)
          );
          nhomHienTai.giaCaoNhat = Math.max(
            nhomHienTai.giaCaoNhat,
            Number(item.giaHienTai || 0)
          );
          nhomHienTai.soSanPham += 1;
          nhomHienTai.danhSachSan.add(item.sanTMDT);
        }
      });

    return Array.from(mapNhom.values()).map((nhom) => ({
      ...nhom,
      soSan: nhom.danhSachSan.size,
    }));
  }, [danhSachSanPham]);

  const danhSachNhomCoTuongDong = useMemo(() => {
    if (!sanPhamDangChon) {
      return danhSachNhomDaCo.map((nhom) => ({
        ...nhom,
        diemTuongDong: 0,
      }));
    }

    return danhSachNhomDaCo
      .map((nhom) => ({
        ...nhom,
        diemTuongDong: tinhPhanTramTuongDong(
          sanPhamDangChon.tenSanPham,
          nhom.tenDaiDien
        ),
      }))
      .sort((nhomA, nhomB) => nhomB.diemTuongDong - nhomA.diemTuongDong);
  }, [danhSachNhomDaCo, sanPhamDangChon]);

  const tongSoTrangNhom = Math.max(
    1,
    Math.ceil(danhSachNhomCoTuongDong.length / SO_DONG_MOI_TRANG)
  );

  const danhSachNhomTheoTrang = useMemo(() => {
    const viTriBatDau = (trangNhomHienTai - 1) * SO_DONG_MOI_TRANG;
    const viTriKetThuc = viTriBatDau + SO_DONG_MOI_TRANG;

    return danhSachNhomCoTuongDong.slice(viTriBatDau, viTriKetThuc);
  }, [danhSachNhomCoTuongDong, trangNhomHienTai]);

  useEffect(() => {
    setTrangNhomHienTai(1);
  }, [sanPhamDangChon]);

  useEffect(() => {
    if (trangNhomHienTai > tongSoTrangNhom) {
      setTrangNhomHienTai(tongSoTrangNhom);
    }
  }, [trangNhomHienTai, tongSoTrangNhom]);

  return (
    <section className="trang-gom-nhom-admin">
      <h1>Quản lý gom nhóm sản phẩm</h1>

      <p className="mo-ta-trang-admin">
        Kiểm tra các sản phẩm thô chưa có mã sản phẩm chuẩn hóa và đối chiếu với
        các nhóm sản phẩm đã tồn tại trong hệ thống.
      </p>

      <div className="luoi-the-gom-nhom-admin">
        {thongKeGomNhom.map((item) => (
          <div className="the-gom-nhom-admin" key={item.tieuDe}>
            <h3>{item.tieuDe}</h3>
            <strong>{item.giaTri}</strong>
            <p>{item.moTa}</p>
          </div>
        ))}
      </div>

      <div className="bo-cuc-gom-nhom">
        <div className="cot-goi-y-gom-nhom">
          <h2>Danh sách nhóm chuẩn hóa hiện có</h2>

          {thongBao && (
            <div className={`thong-bao-admin ${thongBao.loai}`}>
              {thongBao.loai === "loi" ? "❌" : "✅"} {thongBao.noiDung}
            </div>
          )}

          <table className="bang-goi-y-gom-nhom">
            <thead>
              <tr>
                <th>Mã SPCH</th>
                <th>Tên đại diện</th>
                <th>Số SP</th>
                <th>Số sàn</th>
                <th>Tương đồng</th>
                <th>Khoảng giá</th>
                <th>Gắn</th>
              </tr>
            </thead>

            <tbody>
              {danhSachNhomTheoTrang.map((nhom) => (
                <tr key={nhom.maSPCH}>
                  <td>{formatMaSPCH(nhom.maSPCH)}</td>
                  <td className="ten-spch-goi-y">{nhom.tenDaiDien}</td>
                  <td>{nhom.soSanPham}</td>
                  <td>{nhom.soSan}</td>
                  <td>
                    <strong>{nhom.diemTuongDong}%</strong>
                  </td>
                  <td>
                    {formatVND(nhom.giaThapNhat)} - {formatVND(nhom.giaCaoNhat)}
                  </td>
                  <td>
                    <button
                      className="nut-gan-gom-nhom"
                      type="button"
                      disabled={
                        !sanPhamDangChon ||
                        Boolean(sanPhamDangChon.maSPCH) ||
                        dangGanNhom
                      }
                      onClick={() => ganSanPhamVaoNhom(nhom.maSPCH)}
                    >
                      {dangGanNhom ? "Đang gắn..." : "Gắn"}
                    </button>
                  </td>
                </tr>
              ))}

              {danhSachNhomCoTuongDong.length === 0 && (
                <tr>
                  <td colSpan="7">
                    Chưa có nhóm sản phẩm chuẩn hóa nào trong dữ liệu hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {danhSachNhomCoTuongDong.length > 0 && (
            <div className="phan-trang-admin">
              <button
                type="button"
                onClick={() => setTrangNhomHienTai((trang) => Math.max(1, trang - 1))}
                disabled={trangNhomHienTai === 1}
              >
                ‹
              </button>

              {taoDanhSachTrang(trangNhomHienTai, tongSoTrangNhom).map(
                (item, index) => {
                  if (item === "...") {
                    return (
                      <span
                        className="dau-ba-cham-phan-trang"
                        key={`nhom-ellipsis-${index}`}
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
                        trangNhomHienTai === item ? "trang-dang-chon" : ""
                      }
                      onClick={() => setTrangNhomHienTai(item)}
                    >
                      {item}
                    </button>
                  );
                }
              )}

              <button
                type="button"
                onClick={() =>
                  setTrangNhomHienTai((trang) => Math.min(tongSoTrangNhom, trang + 1))
                }
                disabled={trangNhomHienTai === tongSoTrangNhom}
              >
                ›
              </button>
            </div>
          )}
        </div>

        <div className="cot-san-pham-tho-chua-gom">
          <h2>Sản phẩm thô chưa gom nhóm</h2>

          <h3 className="nhan-thong-tin-gom-nhom">Sản phẩm thô đang chọn</h3>

          {sanPhamDangChon ? (
            <div className="khung-san-pham-dang-chon">
              <p>
                <span>Mã sản phẩm thô:</span>{" "}
                {formatMaSPTho(sanPhamDangChon.maSPTho)}
              </p>
              <p>
                <span>Tên sản phẩm thô:</span> {sanPhamDangChon.tenSanPham}
              </p>
              <p>
                <span>Nguồn:</span> {sanPhamDangChon.sanTMDT}
              </p>
              <p>
                <span>Giá hiện tại:</span> {formatVND(sanPhamDangChon.giaHienTai)}
              </p>
              <p>
                <span>Mã SPCH hiện tại:</span>{" "}
                {formatMaSPCH(sanPhamDangChon.maSPCH)}
              </p>
            </div>
          ) : (
            <div className="khung-san-pham-dang-chon">
              Chưa có sản phẩm thô chưa gom nhóm nào được chọn.
            </div>
          )}

          <div className="thanh-cong-cu-gom-nhom">
            <div className="o-tim-kiem-gom-nhom">
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm thô"
                value={tuKhoa}
                onChange={(event) => setTuKhoa(event.target.value)}
              />
              <span>⌕</span>
            </div>

            <div className="select-boc-ngoai">
              <select
                value={sanLoc}
                onChange={(event) => setSanLoc(event.target.value)}
              >
                {danhSachSan.map((san) => (
                  <option value={san} key={san}>
                    {san === "Tất cả" ? "Tất cả sàn" : san}
                  </option>
                ))}
              </select>
              <span className="mui-ten-select">⌄</span>
            </div>

            <button
              className="nut-cap-nhat-gom-nhom"
              type="button"
              onClick={() => taiDanhSachSanPham(true)}
              disabled={dangTai}
            >
              {dangTai ? "Đang tải..." : "Cập nhật dữ liệu"}
            </button>
          </div>

          {loiTaiDuLieu && <div className="khung-loi-admin">{loiTaiDuLieu}</div>}

          {dangTai ? (
            <div className="khung-trang-thai-admin">
              Đang tải dữ liệu gom nhóm...
            </div>
          ) : (
            <>
              <h4>Danh sách sản phẩm thô chưa gom nhóm</h4>

              <table className="bang-san-pham-tho-gom-nhom">
                <thead>
                  <tr>
                    <th>Mã SPT</th>
                    <th>Tên SPT</th>
                    <th>Sàn</th>
                    <th>Giá</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>

                <tbody>
                  {danhSachSanPhamThoTheoTrang.map((sanPham) => {
                    const trangThai = layTrangThaiGomNhom(sanPham);

                    return (
                      <tr
                        key={sanPham.maSPTho}
                        className={
                          sanPham.maSPTho === sanPhamDangChon?.maSPTho
                            ? "dong-dang-chon"
                            : ""
                        }
                        onClick={() => setSanPhamDangChon(sanPham)}
                      >
                        <td>{formatMaSPTho(sanPham.maSPTho)}</td>
                        <td className="ten-spt-gom-nhom">{sanPham.tenSanPham}</td>
                        <td>{sanPham.sanTMDT}</td>
                        <td>{formatVND(sanPham.giaHienTai)}</td>
                        <td>
                          <span
                            className={`nhan-gom-nhom ${layClassTrangThaiGomNhom(
                              trangThai
                            )}`}
                          >
                            {trangThai}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {danhSachHienThi.length === 0 && (
                    <tr>
                      <td colSpan="5">
                        Không có sản phẩm thô chưa gom nhóm phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {danhSachHienThi.length > 0 && (
                <div className="phan-trang-admin">
                  <button
                    type="button"
                    onClick={() =>
                      setTrangSanPhamThoHienTai((trang) => Math.max(1, trang - 1))
                    }
                    disabled={trangSanPhamThoHienTai === 1}
                  >
                    ‹
                  </button>

                  {taoDanhSachTrang(
                    trangSanPhamThoHienTai,
                    tongSoTrangSanPhamTho
                  ).map((item, index) => {
                    if (item === "...") {
                      return (
                        <span
                          className="dau-ba-cham-phan-trang"
                          key={`san-pham-tho-ellipsis-${index}`}
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
                          trangSanPhamThoHienTai === item ? "trang-dang-chon" : ""
                        }
                        onClick={() => setTrangSanPhamThoHienTai(item)}
                      >
                        {item}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() =>
                      setTrangSanPhamThoHienTai((trang) =>
                        Math.min(tongSoTrangSanPhamTho, trang + 1)
                      )
                    }
                    disabled={trangSanPhamThoHienTai === tongSoTrangSanPhamTho}
                  >
                    ›
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default QuanLyGomNhomSanPham;

