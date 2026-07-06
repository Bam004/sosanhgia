import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authService } from '../../services/authService';

export default function DangNhap() {
  const navigate = useNavigate();
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
        localStorage.setItem("accessToken", res.data.accessToken);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        toast.success("Đăng nhập thành công");
        navigate('/');
      } else {
        toast.error("Sai email hoặc mật khẩu");
      }
    } catch (error) {
      toast.error("Sai email hoặc mật khẩu");
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
          Chưa có tài khoản? <Link to="/dang-ky" style={{ color: 'var(--color-primary)', fontWeight: '500', textDecoration: 'none' }}>Đăng ký</Link>
        </p>
      </div>
    </main>
  );
}
