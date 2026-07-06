import { Link } from 'react-router-dom';

export default function DangNhap() {
  return (
    <main className="user-page" style={{ padding: '60px 20px', textAlign: 'center', background: '#f8fafc', minHeight: '60vh' }}>
      <div className="user-container">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: '24px' }}>
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
          <polyline points="10 17 15 12 10 7"></polyline>
          <line x1="15" y1="12" x2="3" y2="12"></line>
        </svg>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#334155', marginBottom: '16px' }}>
          Tính năng đang được phát triển
        </h2>
        <p style={{ color: '#64748b', maxWidth: '600px', margin: '0 auto 32px auto', lineHeight: '1.6' }}>
          Hệ thống Đăng nhập / Đăng ký hiện đang trong quá trình phát triển. Xin vui lòng quay lại sau!
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
