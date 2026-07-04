import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function DangNhap() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const xuLyDangNhapSubmit = (e) => {
    e.preventDefault();

    if (!email.trim() || !matKhau) {
      toast.warning('Vui lòng điền đầy đủ Email và Mật khẩu!');
      return;
    }

    setIsSubmitting(true);

    // Giả lập độ trễ API 800ms để chặn double submit & hiện spinner
    setTimeout(() => {
      const mockUser = {
        name: 'Nhất',
        email: email,
        avatar: 'clover',
        joinDate: new Date().toLocaleDateString('vi-VN'),
      };
      
      localStorage.setItem('user', JSON.stringify(mockUser));
      toast.success('Đăng nhập thành công! Chào mừng quay trở lại.');
      setIsSubmitting(false);
      navigate('/');
    }, 800);
  };

  return (
    <main className="user-page auth-page-wrapper">
      <div className="auth-card">
        <h2 className="auth-card__title">ĐĂNG NHẬP TÀI KHOẢN</h2>
        
        <form onSubmit={xuLyDangNhapSubmit} className="auth-card__form">
          <div className="form-group">
            <label htmlFor="login-email">Email:</label>
            <input
              id="login-email"
              type="email"
              placeholder="Nhập địa chỉ email của bạn..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Mật khẩu:</label>
            <input
              id="login-password"
              type="password"
              placeholder="Nhập mật khẩu..."
              value={matKhau}
              onChange={(e) => setMatKhau(e.target.value)}
              className="form-control"
              disabled={isSubmitting}
            />
          </div>

          <div className="auth-card__forgot">
            <a href="#quen-mat-khau" onClick={(e) => { e.preventDefault(); toast.info('Chức năng Quên mật khẩu đang được phát triển!'); }}>
              Quên mật khẩu?
            </a>
          </div>

          <button type="submit" className="btn-auth-submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                Đang đăng nhập...
              </>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>

        <div className="auth-card__footer">
          <span>Bạn chưa có tài khoản? </span>
          <Link to="/dang-ky" className="auth-link">
            Đăng ký
          </Link>
        </div>
      </div>
    </main>
  );
}
