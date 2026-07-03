import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function DangKy() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [nhapLaiMatKhau, setNhapLaiMatKhau] = useState('');
  const [fileSelected, setFileSelected] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const xuLyDangKySubmit = (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !matKhau || !nhapLaiMatKhau) {
      toast.warning('Vui lòng điền đầy đủ các thông tin đăng ký bắt buộc!');
      return;
    }

    if (matKhau !== nhapLaiMatKhau) {
      toast.warning('Mật khẩu nhập lại không trùng khớp!');
      return;
    }

    setIsSubmitting(true);

    // Giả lập độ trễ API 800ms để chặn double submit & hiện spinner
    setTimeout(() => {
      toast.success('Đăng ký tài khoản thành công! Vui lòng đăng nhập.');
      
      // Lưu thông tin đăng ký tạm vào localStorage để khi đăng nhập điền đúng tên
      const tempRegInfo = {
        name: name,
        email: email,
        avatar: 'initial',
      };
      localStorage.setItem('tempReg', JSON.stringify(tempRegInfo));

      setIsSubmitting(false);
      navigate('/dang-nhap');
    }, 800);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFileSelected(e.target.files[0].name);
    }
  };

  return (
    <main className="user-page auth-page-wrapper">
      <div className="auth-card">
        <h2 className="auth-card__title">ĐĂNG KÝ TÀI KHOẢN</h2>

        <form onSubmit={xuLyDangKySubmit} className="auth-card__form">
          {/* Họ và tên */}
          <div className="form-group">
            <label htmlFor="reg-name">Họ và tên:</label>
            <input
              id="reg-name"
              type="text"
              placeholder="Nhập họ và tên của bạn..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-control"
            />
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="reg-email">Email:</label>
            <input
              id="reg-email"
              type="email"
              placeholder="Nhập địa chỉ email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control"
            />
          </div>

          {/* Mật khẩu */}
          <div className="form-group">
            <label htmlFor="reg-password">Mật khẩu:</label>
            <input
              id="reg-password"
              type="password"
              placeholder="Mật khẩu tối thiểu 6 ký tự..."
              value={matKhau}
              onChange={(e) => setMatKhau(e.target.value)}
              className="form-control"
            />
          </div>

          {/* Nhập lại mật khẩu */}
          <div className="form-group">
            <label htmlFor="reg-re-password">Nhập lại mật khẩu:</label>
            <input
              id="reg-re-password"
              type="password"
              placeholder="Nhập lại mật khẩu để xác nhận..."
              value={nhapLaiMatKhau}
              onChange={(e) => setNhapLaiMatKhau(e.target.value)}
              className="form-control"
            />
          </div>

          {/* Chọn ảnh đại diện (không bắt buộc) */}
          <div className="form-group">
            <label>Chọn ảnh đại diện (Không bắt buộc):</label>
            <div className="custom-file-input">
              <label htmlFor="reg-avatar" className="file-input-label">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginRight: 6 }}
                >
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
                <span>{fileSelected || 'Chọn tệp...'}</span>
              </label>
              <input
                id="reg-avatar"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <button type="submit" className="btn-auth-submit btn-auth-submit--register" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                Đang tạo tài khoản...
              </>
            ) : (
              'Tạo tài khoản'
            )}
          </button>
        </form>

        <div className="auth-card__footer">
          <span>Đã có tài khoản? </span>
          <Link to="/dang-nhap" className="auth-link">
            Đăng nhập
          </Link>
        </div>
      </div>
    </main>
  );
}
