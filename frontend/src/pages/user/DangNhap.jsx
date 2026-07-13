import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authService } from '../../services/authService';
import { sanitizeReturnUrl } from '../../utils/returnUrl';

export default function DangNhap() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = sanitizeReturnUrl(searchParams.get('returnUrl'));
  const [formData, setFormData] = useState({
    email: '',
    matKhau: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.matKhau.trim()) {
      return toast.error("Vui lòng nhập đủ email và mật khẩu");
    }

    try {
      setLoading(true);
      const res = await authService.dangNhap(formData);
     if (res.success) {
      const taiKhoan = res.data?.user;

      const email = String(taiKhoan?.email || "")
        .trim()
        .toLowerCase();

      const vaiTro = String(taiKhoan?.vaiTro || "")
        .trim()
        .toLowerCase();

      const dangTruyCapAdmin =
        returnUrl === "/admin" ||
        returnUrl.startsWith("/admin/");

      const laTaiKhoanAdmin =
        email === "sosanhgia@gmail.com" &&
        vaiTro === "admin";

      if (dangTruyCapAdmin && !laTaiKhoanAdmin) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");

        toast.error(
          "Chỉ tài khoản quản trị viên mới được truy cập trang Admin."
        );

        return;
      }

      localStorage.setItem(
        "accessToken",
        res.data.accessToken
      );

      localStorage.setItem(
        "user",
        JSON.stringify(taiKhoan)
      );

      toast.success("Đăng nhập thành công");

      navigate(returnUrl, {
        replace: true,
      });
    } else {
        toast.error(res.message || "Sai email hoặc mật khẩu");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || "Sai email hoặc mật khẩu";
      if (error.response?.status === 403) {
        toast.error("Tài khoản đã bị vô hiệu hóa");
      } else if (error.response?.status === 401) {
        toast.error("Sai email hoặc mật khẩu");
      } else if (!error.response) {
        toast.error("Lỗi kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="user-page" style={{ padding: '60px 20px', background: '#f8fafc', minHeight: '60vh', display: 'flex', justifyContent: 'center' }}>
      <div className="user-container" style={{ maxWidth: '400px', width: '100%', background: '#fff', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#334155', marginBottom: '24px', textAlign: 'center' }}>
          Đăng nhập
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '500' }}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
              placeholder="Nhập email"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '500' }}>Mật khẩu</label>
            <input
              type="password"
              name="matKhau"
              value={formData.matKhau}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
              placeholder="Nhập mật khẩu"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: 'var(--color-primary)',
              color: '#fff',
              padding: '12px',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '24px', color: '#64748b' }}>
          Chưa có tài khoản? <Link to={returnUrl !== '/' ? `/dang-ky?returnUrl=${encodeURIComponent(returnUrl)}` : '/dang-ky'} style={{ color: 'var(--color-primary)', fontWeight: '500', textDecoration: 'none' }}>Đăng ký</Link>
        </p>
      </div>
    </main>
  );
}
