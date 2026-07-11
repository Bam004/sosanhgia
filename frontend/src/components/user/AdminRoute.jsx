import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import { buildLoginUrl } from '../../utils/returnUrl';

export default function AdminRoute({ children }) {
  const [authState, setAuthState] = useState({
    loading: true,
    authenticated: false,
    isAdmin: false,
    error: null
  });
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const verifyAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        if (isMounted) {
          setAuthState({ loading: false, authenticated: false, isAdmin: false, error: null });
        }
        return;
      }

      try {
        const response = await authService.layThongTinTaiKhoan();
        if (isMounted) {
          const user = response.data;
          // Cập nhật localStorage dự phòng
          localStorage.setItem('user', JSON.stringify(user));
          setAuthState({ 
            loading: false, 
            authenticated: true, 
            isAdmin: user.vaiTro === 'admin',
            error: null 
          });
        }
      } catch (err) {
        if (!isMounted) return;
        
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          setAuthState({ loading: false, authenticated: false, isAdmin: false, error: null });
        } else {
          setAuthState({ 
            loading: false, 
            authenticated: false, 
            isAdmin: false,
            error: 'Lỗi kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.' 
          });
        }
      }
    };

    verifyAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  if (authState.loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ border: '4px solid rgba(0,0,0,0.1)', width: '36px', height: '36px', borderRadius: '50%', borderLeftColor: 'var(--color-primary)', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (authState.error) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', minHeight: '60vh' }}>
        <p style={{ color: '#ef4444', marginBottom: '16px', fontWeight: '500' }}>{authState.error}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{ padding: '8px 16px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!authState.authenticated) {
    const currentDestination = location.pathname + location.search + location.hash;
    return <Navigate to={buildLoginUrl(currentDestination)} replace />;
  }

  if (!authState.isAdmin) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', minHeight: '60vh', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '48px', color: '#ef4444', marginBottom: '16px', margin: 0 }}>403</h1>
        <h2 style={{ fontSize: '24px', color: '#334155', marginBottom: '16px' }}>Truy cập bị từ chối</h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>Bạn không có quyền quản trị viên để xem trang này.</p>
        <button 
          onClick={() => window.location.href = '/'}
          style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  return children;
}
