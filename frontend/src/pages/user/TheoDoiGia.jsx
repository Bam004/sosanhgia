import { Link } from 'react-router-dom';

export default function TheoDoiGia() {
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
