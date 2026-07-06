import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authService } from '../../services/authService';

export default function DangKy() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    hoTen: '',
    email: '',
    matKhau: '',
    xacNhanMatKhau: ''
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
    if (!formData.email.trim()) {
      return toast.error("Email không được rỗng");
    }
    if (formData.matKhau.length < 6) {
      return toast.error("Mật khẩu phải từ 6 ký tự trở lên");
    }
    if (formData.matKhau !== formData.xacNhanMatKhau) {
      return toast.error("Xác nhận mật khẩu không khớp");
    }

    try {
      setLoading(true);
      const res = await authService.dangKy(formData);
      if (res.success) {
        toast.success("Đăng ký thành công. Vui lòng đăng nhập.");
        navigate('/dang-nhap');
      } else {
        toast.error(res.message || "Đăng ký thất bại");
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Đăng ký thất bại";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="user-page" style={{ padding: '60px 20px', background: '#f8fafc', minHeight: '60vh', display: 'flex', justifyContent: 'center' }}>
      <div className="user-container" style={{ maxWidth: '400px', width: '100%', background: '#fff', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#334155', marginBottom: '24px', textAlign: 'center' }}>
          Đăng ký tài khoản
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '500' }}>Họ tên</label>
            <input 
              type="text" 
              name="hoTen"
              value={formData.hoTen}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
              placeholder="Nhập họ tên"
            />
          </div>
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
              placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '500' }}>Xác nhận mật khẩu</label>
            <input 
              type="password" 
              name="xacNhanMatKhau"
              value={formData.xacNhanMatKhau}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
              placeholder="Nhập lại mật khẩu"
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
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '24px', color: '#64748b' }}>
          Đã có tài khoản? <Link to="/dang-nhap" style={{ color: 'var(--color-primary)', fontWeight: '500', textDecoration: 'none' }}>Đăng nhập</Link>
        </p>
      </div>
    </main>
  );
}
