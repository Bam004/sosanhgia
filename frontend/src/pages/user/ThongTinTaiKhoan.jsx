import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { toast } from 'react-toastify';

import SidebarTaiKhoan from '../../components/user/SidebarTaiKhoan';

export default function ThongTinTaiKhoan() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("accessToken");

  const xuLyDangXuat = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');

    toast.success('Đăng xuất thành công');

    navigate('/dang-nhap');
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await authService.layThongTinTaiKhoan();
        if (res.success) {
          setUser(res.data);
        } else {
          throw new Error("Lỗi xác thực");
        }
      } catch (error) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  return (
    <main className="user-page account-page">
      <div className="user-container">
        <div className="account-shell">
          <aside className="account-sidebar">
            <div className="account-sidebar__card">
              <div className="account-sidebar__user">
                <div className="account-sidebar__avatar">
                  {(user?.hoTen || user?.email || "U").charAt(0).toUpperCase()}
                </div>

                <div className="account-sidebar__user-info">
                  <h2>{user?.hoTen || "Người dùng"}</h2>
                  <p>{user?.email || "Chưa có email"}</p>
                  <span className="account-role-badge">
                    {user?.vaiTro === "admin" ? "Quản trị viên" : "Người dùng"}
                  </span>
                </div>
              </div>

              <div className="account-sidebar__menu">
                <Link to="/tai-khoan" className="account-menu__item is-active">
                  <span>👤</span>
                  <span>Thông tin tài khoản</span>
                </Link>

                <Link
                  to="/tai-khoan/san-pham-theo-doi"
                  className="account-menu__item"
                >
                  <span>🔔</span>
                  <span>Sản phẩm đang theo dõi</span>
                </Link>

                <button
                  type="button"
                  className="account-menu__item account-menu__item--danger"
                  onClick={xuLyDangXuat}
                >
                  <span>↪</span>
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          </aside>

          <section className="account-content">
            <div className="account-content__card">
              <div className="account-content__header">
                <div>
                  <p className="account-content__eyebrow">Quản lý hồ sơ</p>
                  <h1>Thông tin tài khoản</h1>
                  <p className="account-content__desc">
                    Xem nhanh thông tin cá nhân và vai trò đăng nhập hiện tại.
                  </p>
                </div>

                <div className="account-status-pill">
                  {user?.vaiTro === "admin" ? "Admin" : "User"}
                </div>
              </div>

              <div className="account-info-grid">
                <div className="account-field">
                  <label>Họ tên</label>
                  <div className="account-field__value">
                    {user?.hoTen || "Chưa cập nhật"}
                  </div>
                </div>

                <div className="account-field">
                  <label>Email</label>
                  <div className="account-field__value">
                    {user?.email || "Chưa cập nhật"}
                  </div>
                </div>

                <div className="account-field">
                  <label>Vai trò</label>
                  <div className="account-field__value">
                    {user?.vaiTro === "admin" ? "Quản trị viên" : "Người dùng"}
                  </div>
                </div>

                <div className="account-field">
                  <label>Trạng thái</label>
                  <div className="account-field__value">
                    {user?.trangThai || "Đang hoạt động"}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
