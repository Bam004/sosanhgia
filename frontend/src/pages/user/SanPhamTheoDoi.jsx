import { Link } from 'react-router-dom';

export function SidebarTaiKhoan({ pathHienTai }) {
  return (
    <aside className="account-sidebar">
      <div className="account-sidebar__title">Quản lý cá nhân</div>
      <nav className="account-sidebar__menu">
        <Link
          to="/tai-khoan"
          className={`account-sidebar__link ${pathHienTai === '/tai-khoan' ? 'active' : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          Thông tin tài khoản
        </Link>
        <Link
          to="/tai-khoan/san-pham-theo-doi"
          className={`account-sidebar__link ${pathHienTai === '/tai-khoan/san-pham-theo-doi' ? 'active' : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          Sản phẩm đang theo dõi
        </Link>
      </nav>
    </aside>
  );
}

export default function SanPhamTheoDoi() {
  return (
    <main className="user-page" style={{ padding: '60px 20px', textAlign: 'center', background: '#f8fafc', minHeight: '60vh' }}>
      <div className="user-container">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: '24px' }}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <path d="M12 8v4"></path>
          <path d="M12 16h.01"></path>
        </svg>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#334155', marginBottom: '16px' }}>
          Tính năng đang được phát triển
        </h2>
        <p style={{ color: '#64748b', maxWidth: '600px', margin: '0 auto 32px auto', lineHeight: '1.6' }}>
          Chức năng sản phẩm theo dõi cần hệ thống tài khoản người dùng và API lưu sản phẩm theo dõi. Hiện chưa được triển khai.
        </p>
        <Link 
          to="/" 
          style={{ 
            display: 'inline-block', 
            background: 'var(--color-primary)', 
            color: '#fff', 
            padding: '10px 24px', 
            borderRadius: '6px', 
            textDecoration: 'none',
            fontWeight: '500'
          }}
        >
          Trở về Trang chủ
        </Link>
      </div>
    </main>
  );
}
