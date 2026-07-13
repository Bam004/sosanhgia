import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';

import SidebarTaiKhoan from '../../components/user/SidebarTaiKhoan';

export default function ThongTinTaiKhoan() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("accessToken");

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
    <main className="user-page" style={{ padding: '60px 20px', background: '#f8fafc', minHeight: '60vh' }}>
      <div className="user-container account-layout">
        <SidebarTaiKhoan pathHienTai="/tai-khoan" />
        <section className="account-content" style={{ background: '#fff', padding: '32px', borderRadius: '12px', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ textAlign: 'center', marginTop: '40px' }}>Đang tải dữ liệu...</div>
          ) : !token || !user ? (
            <div style={{ textAlign: 'center', margin: 'auto' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#334155', marginBottom: '16px' }}>
                Vui lòng đăng nhập để xem thông tin tài khoản
              </h2>
              <Link 
                to="/dang-nhap" 
                style={{ display: 'inline-block', background: 'var(--color-primary)', color: '#fff', padding: '10px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: '500' }}
              >
                Đăng nhập
              </Link>
            </div>
          ) : (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#334155', marginBottom: '24px' }}>
                Thông tin tài khoản
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
                <div>
                  <label style={{ display: 'block', color: '#64748b', marginBottom: '4px', fontSize: '14px' }}>Họ tên</label>
                  <div style={{ padding: '10px 12px', background: '#f1f5f9', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#334155', fontWeight: '500' }}>
                    {user.hoTen}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748b', marginBottom: '4px', fontSize: '14px' }}>Email</label>
                  <div style={{ padding: '10px 12px', background: '#f1f5f9', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#334155', fontWeight: '500' }}>
                    {user.email}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748b', marginBottom: '4px', fontSize: '14px' }}>Vai trò</label>
                  <div style={{ padding: '10px 12px', background: '#f1f5f9', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#334155', fontWeight: '500' }}>
                    {user.vaiTro === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
