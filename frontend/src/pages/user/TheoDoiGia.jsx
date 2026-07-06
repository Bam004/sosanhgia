import { Link } from 'react-router-dom';

export default function TheoDoiGia() {
  const token = localStorage.getItem("accessToken");

  return (
    <main className="user-page" style={{ padding: '60px 20px', textAlign: 'center', background: '#f8fafc', minHeight: '60vh' }}>
      <div className="user-container">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: '24px' }}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <path d="M12 8v4"></path>
          <path d="M12 16h.01"></path>
        </svg>
        {token ? (
          <>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#334155', marginBottom: '16px' }}>
              Tính năng đang được phát triển
            </h2>
            <p style={{ color: '#64748b', maxWidth: '600px', margin: '0 auto 32px auto', lineHeight: '1.6' }}>
              Tính năng theo dõi giá đang phát triển
            </p>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#334155', marginBottom: '16px' }}>
              Vui lòng đăng nhập
            </h2>
            <p style={{ color: '#64748b', maxWidth: '600px', margin: '0 auto 32px auto', lineHeight: '1.6' }}>
              Vui lòng đăng nhập để sử dụng chức năng theo dõi giá
            </p>
            <Link 
              to="/dang-nhap" 
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
              Đăng nhập
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
