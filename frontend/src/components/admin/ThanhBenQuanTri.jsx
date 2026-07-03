import { NavLink } from "react-router-dom";

const danhSachMenu = [
  {
    nhan: "Dashboard",
    duongDan: "/admin",
    bieuTuong: "📊",
    end: true,
  },
  {
    nhan: "Nguồn cào dữ liệu",
    duongDan: "/admin/nguon-cao",
    bieuTuong: "🌐",
  },
  {
    nhan: "Tiến trình Scraping",
    duongDan: "/admin/tien-trinh-scraping",
    bieuTuong: "⚙️",
  },
  {
    nhan: "Nhật ký lỗi",
    duongDan: "/admin/nhat-ky-loi",
    bieuTuong: "🧾",
  },
  {
    nhan: "Sản phẩm thô",
    duongDan: "/admin/san-pham-tho",
    bieuTuong: "📦",
  },
  {
    nhan: "Sản phẩm chuẩn hóa",
    duongDan: "/admin/san-pham-chuan-hoa",
    bieuTuong: "✅",
  },
  {
    nhan: "Gom nhóm sản phẩm",
    duongDan: "/admin/gom-nhom-san-pham",
    bieuTuong: "🔗",
  },
];

function ThanhBenQuanTri() {
  return (
    <aside className="thanh-ben-quan-tri">
      <nav className="menu-admin">
        {danhSachMenu.map((muc) => (
          <NavLink
            key={muc.duongDan}
            to={muc.duongDan}
            end={muc.end}
            className={({ isActive }) =>
              isActive ? "muc-menu-admin dang-chon" : "muc-menu-admin"
            }
          >
            <span className="bieu-tuong-menu">{muc.bieuTuong}</span>
            <span className="nhan-menu-admin">{muc.nhan}</span>
          </NavLink>
        ))}

        <button className="muc-menu-admin nut-dang-xuat" type="button">
          <span className="bieu-tuong-menu">🚪</span>
          <span className="nhan-menu-admin">Đăng xuất</span>
        </button>
      </nav>
    </aside>
  );
}

export default ThanhBenQuanTri;