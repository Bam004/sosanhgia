import { Link } from 'react-router-dom';

export default function DangKy() {
  return (
    <main className="user-page" style={{ padding: '60px 20px', textAlign: 'center', background: '#f8fafc', minHeight: '60vh' }}>
      <div className="user-container">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: '24px' }}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="8.5" cy="7" r="4"></circle>
          <line x1="20" y1="8" x2="20" y2="14"></line>
          <line x1="23" y1="11" x2="17" y2="11"></line>
        </svg>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#334155', marginBottom: '16px' }}>
          Tính năng đang được phát triển
        </h2>
        <p style={{ color: '#64748b', maxWidth: '600px', margin: '0 auto 32px auto', lineHeight: '1.6' }}>
          Hệ thống Đăng ký tài khoản hiện đang trong quá trình phát triển. Xin vui lòng quay lại sau!
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
