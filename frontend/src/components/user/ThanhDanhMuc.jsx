import { Link } from 'react-router-dom';

const danhMuc = [
  'Điện thoại',
  'Máy tính bảng',
  'Tivi',
  'Laptop',
  'Linh kiện',
  'Màn hình',
  'PC',
  'Âm thanh',
];

export default function ThanhDanhMuc() {
  return (
    <nav className="category-nav">
      <div className="category-nav__inner">
        {/* Nút Danh mục sản phẩm có Dropdown */}
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
          >
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
          <span>Danh mục sản phẩm</span>

          {/* Menu Dropdown Thả Xuống (Dọc) */}
          <div className="category-nav__dropdown">
            {danhMuc.map((item) => (
              <Link
                key={item}
                to={`/tim-kiem?danh-muc=${encodeURIComponent(item)}`}
                className="category-nav__dropdown-item"
              >
                {item}
              </Link>
            ))}
          </div>
        </div>

        <div className="category-nav__separator">|</div>

        {/* Danh sách các danh mục ngang (Sẽ được CSS giãn cách đều) */}
        <div className="category-nav__items">
          {danhMuc.map((tenDanhMuc) => (
            <Link
              key={tenDanhMuc}
              to={`/tim-kiem?danh-muc=${encodeURIComponent(tenDanhMuc)}`}
              className="category-nav__item"
            >
              {tenDanhMuc}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
