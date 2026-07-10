import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import { buildLoginUrl } from '../../utils/returnUrl';

export default function ProtectedRoute({ children }) {
  const [authState, setAuthState] = useState({
    loading: true,
    authenticated: false,
    error: null
  });
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const verifyAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        if (isMounted) {
          setAuthState({ loading: false, authenticated: false, error: null });
        }
        return;
      }

      try {
        await authService.layThongTinTaiKhoan();
        if (isMounted) {
          setAuthState({ loading: false, authenticated: true, error: null });
        }
      } catch (err) {
        if (!isMounted) return;
        
        // Phân biệt 401/403 (token hết hạn/không hợp lệ) và lỗi mạng (Network Error/500)
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          setAuthState({ loading: false, authenticated: false, error: null });
        } else {
          setAuthState({ 
            loading: false, 
            authenticated: false, 
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

  return children;
}
