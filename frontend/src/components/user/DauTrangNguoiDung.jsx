import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { buildLoginUrl } from '../../utils/returnUrl';

export default function DauTrangNguoiDung() {
  const location = useLocation();
  const [tuKhoa, setTuKhoa] = useState('');
  const navigate = useNavigate();

  const xuLyChonDanhMuc = (tuKhoaDanhMuc) => {
    setTuKhoa(tuKhoaDanhMuc);
    navigate(`/tim-kiem?q=${encodeURIComponent(tuKhoaDanhMuc)}`);
  };

  const token = localStorage.getItem("accessToken");
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;


  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    setTuKhoa(q);
  }, [location.search]);

  const xuLyTimKiem = (event) => {
    event.preventDefault();
    const q = tuKhoa.trim();
    if (q) {
      navigate(`/tim-kiem?q=${encodeURIComponent(q)}`);
    } else {
      navigate('/tim-kiem');
    }
  };

  return (
    <header className="user-header">
      <div className="user-header__inner">
        <Link to="/" className="user-header__logo">
          SoSanhGia
        </Link>

        <form className="user-header__search" onSubmit={xuLyTimKiem}>
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            value={tuKhoa}
            onChange={(event) => setTuKhoa(event.target.value)}
          />
          <button type="submit" className="user-header__search-btn">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </form>

          <div className="user-header__actions">
            {!token || !user ? (
              <Link to="/dang-nhap" className="user-header__login-link">
                <span>Đăng nhập</span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="user-header__login-icon"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </Link>
            ) : (
              <div className="user-header__profile">
                <Link to="/tai-khoan" className="user-header__profile-name">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>

                  <span>
                    Xin chào, {user.hoTen || (user.vaiTro === 'admin' ? 'Quản trị viên' : 'Người dùng')}
                  </span>
                </Link>
              </div>
            )}

          <button
            type="button"
            onClick={() => {
              const token = localStorage.getItem("accessToken");
              if (!token) {
                toast.info("Vui lòng đăng nhập để sử dụng chức năng theo dõi giá");
                navigate(buildLoginUrl('/tai-khoan/san-pham-theo-doi'));
              } else {
                navigate('/tai-khoan/san-pham-theo-doi');
              }
            }}
            className="user-header__track-button"
            style={{ border: 'none', cursor: 'pointer', outline: 'none' }}
          >
            Theo dõi giá
          </button>
        </div>
      </div>
    </header>
  );
}
