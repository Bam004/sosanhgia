import { Link } from 'react-router-dom';

const danhMuc = [
  { nhan: 'Điện thoại', tuKhoa: 'điện thoại' },
  { nhan: 'Máy tính bảng', tuKhoa: 'máy tính bảng' },
  { nhan: 'Tivi', tuKhoa: 'tivi' },
  { nhan: 'Laptop', tuKhoa: 'laptop' },
  { nhan: 'Linh kiện', tuKhoa: 'linh kiện máy tính' },
  { nhan: 'Màn hình', tuKhoa: 'màn hình máy tính' },
  { nhan: 'PC', tuKhoa: 'máy tính PC' },
  { nhan: 'Âm thanh', tuKhoa: 'loa tai nghe' },
];

function taoDuongDanTimKiem(tuKhoa) {
  return `/tim-kiem?q=${encodeURIComponent(tuKhoa)}`;
}

export default function ThanhDanhMuc() {
  return (
    <nav className="category-nav" aria-label="Danh mục sản phẩm">
      <div className="category-nav__inner">
        <div className="category-nav__main-btn">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>

          <span>Danh mục sản phẩm</span>

          <div className="category-nav__dropdown">
            {danhMuc.map((item) => (
              <Link
                key={item.nhan}
                to={taoDuongDanTimKiem(item.tuKhoa)}
                className="category-nav__dropdown-item"
              >
                {item.nhan}
              </Link>
            ))}
          </div>
        </div>

        <div className="category-nav__separator" aria-hidden="true">
          |
        </div>

        <div className="category-nav__items">
          {danhMuc.map((item) => (
            <Link
              key={item.nhan}
              to={taoDuongDanTimKiem(item.tuKhoa)}
              className="category-nav__item"
            >
              {item.nhan}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}