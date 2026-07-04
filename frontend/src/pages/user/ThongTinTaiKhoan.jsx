import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { SidebarTaiKhoan } from './SanPhamTheoDoi';

export default function ThongTinTaiKhoan() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  // States cho form thông tin cá nhân
  const [hoTen, setHoTen] = useState('');
  const [email, setEmail] = useState('');
  const [ngayThamGia, setNgayThamGia] = useState('');
  const [soSpTheoDoi, setSoSpTheoDoi] = useState(0);

  // States cho form đổi mật khẩu
  const [matKhauCu, setMatKhauCu] = useState('');
  const [matKhauMoi, setMatKhauMoi] = useState('');
  const [nhapLaiMatKhauMoi, setNhapLaiMatKhauMoi] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      toast.info('Vui lòng đăng nhập để xem thông tin tài khoản!');
      navigate('/dang-nhap');
      return;
    }
    const userObj = JSON.parse(savedUser);
    setUser(userObj);
    setHoTen(userObj.name || '');
    setEmail(userObj.email || '');
    setNgayThamGia(userObj.joinDate || '01/07/2026');

    // Đọc số lượng sản phẩm theo dõi
    const savedDs = localStorage.getItem('dsTheoDoi');
    if (savedDs) {
      setSoSpTheoDoi(JSON.parse(savedDs).length);
    } else {
      setSoSpTheoDoi(2); // Dữ liệu mặc định demo
    }
  }, [navigate]);

  const [isUpdatingInfo, setIsUpdatingInfo] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);

  const xuLyCapNhatThongTin = (e) => {
    e.preventDefault();
    if (!hoTen.trim()) {
      toast.warning('Họ và tên không được để trống!');
      return;
    }

    setIsUpdatingInfo(true);
    setTimeout(() => {
      const userMoi = {
        ...user,
        name: hoTen,
        email: email,
      };
      localStorage.setItem('user', JSON.stringify(userMoi));
      setUser(userMoi);
      toast.success('Cập nhật thông tin cá nhân thành công!');
      setIsUpdatingInfo(false);
    }, 800);
  };

  const xuLyDoiMatKhau = (e) => {
    e.preventDefault();
    if (!matKhauCu || !matKhauMoi || !nhapLaiMatKhauMoi) {
      toast.warning('Vui lòng nhập đầy đủ các trường đổi mật khẩu!');
      return;
    }
    if (matKhauMoi !== nhapLaiMatKhauMoi) {
      toast.warning('Mật khẩu mới nhập lại không khớp!');
      return;
    }
    
    setIsChangingPw(true);
    setTimeout(() => {
      toast.success('Đổi mật khẩu thành công! (Giả lập)');
      setMatKhauCu('');
      setMatKhauMoi('');
      setNhapLaiMatKhauMoi('');
      setIsChangingPw(false);
    }, 800);
  };

  if (!user) {
    return null;
  }

  return (
    <main className="user-page">
      <div className="user-container account-layout">
        {/* Cột trái: Sidebar tài khoản */}
        <SidebarTaiKhoan pathHienTai="/tai-khoan" />

        {/* Cột phải: Form thông tin chi tiết */}
        <section className="account-content">
          <div className="account-content__header">
            <h2>Thông tin tài khoản</h2>
            <p>Xem và cập nhật thông tin cá nhân của bạn, cũng như thay đổi mật khẩu.</p>
          </div>

          <div className="account-profile-grid">
            {/* Khối Trái: Thống kê & Avatar */}
            <div className="account-profile-card">
              <div className="account-avatar-wrapper">
                <span className="account-big-avatar">
                  {user.avatar === 'clover' ? '🍀' : hoTen[0]?.toUpperCase() || 'U'}
                </span>
                <h3>{hoTen}</h3>
                <span className="account-role-badge">Thành viên chính thức</span>
              </div>

              <div className="account-stats-list">
                <div className="stat-row">
                  <span>Trạng thái tài khoản:</span>
                  <strong className="text-green">Đang hoạt động</strong>
                </div>
                <div className="stat-row">
                  <span>Ngày tham gia:</span>
                  <strong>{ngayThamGia}</strong>
                </div>
                <div className="stat-row">
                  <span>Sản phẩm đang theo dõi:</span>
                  <strong className="text-blue">{soSpTheoDoi} sản phẩm</strong>
                </div>
                <div className="stat-row">
                  <span>Vai trò:</span>
                  <strong>Thành viên</strong>
                </div>
              </div>
            </div>

            {/* Khối Phải: Biểu mẫu cập nhật */}
            <div className="account-forms-wrapper">
              {/* Form 1: Cập nhật thông tin cá nhân */}
              <div className="profile-form-block">
                <h4>Cập nhật thông tin</h4>
                <form onSubmit={xuLyCapNhatThongTin}>
                  <div className="form-group">
                    <label htmlFor="pf-name">Họ và tên:</label>
                    <input
                      id="pf-name"
                      type="text"
                      value={hoTen}
                      onChange={(e) => setHoTen(e.target.value)}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pf-email">Địa chỉ Email:</label>
                    <input
                      id="pf-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-control"
                    />
                  </div>
                  <button type="submit" className="btn-primary-account" disabled={isUpdatingInfo}>
                    {isUpdatingInfo ? (
                      <>
                        <span className="spinner"></span>
                        Đang lưu thay đổi...
                      </>
                    ) : (
                      'Lưu thông tin thay đổi'
                    )}
                  </button>
                </form>
              </div>

              {/* Form 2: Thay đổi mật khẩu */}
              <div className="profile-form-block margin-top-lg">
                <h4>Đổi mật khẩu bảo mật</h4>
                <form onSubmit={xuLyDoiMatKhau}>
                  <div className="form-group">
                    <label htmlFor="pf-pw-old">Mật khẩu cũ:</label>
                    <input
                      id="pf-pw-old"
                      type="password"
                      value={matKhauCu}
                      onChange={(e) => setMatKhauCu(e.target.value)}
                      className="form-control"
                      placeholder="Nhập mật khẩu hiện tại..."
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pf-pw-new">Mật khẩu mới:</label>
                    <input
                      id="pf-pw-new"
                      type="password"
                      value={matKhauMoi}
                      onChange={(e) => setMatKhauMoi(e.target.value)}
                      className="form-control"
                      placeholder="Mật khẩu mới ít nhất 6 ký tự..."
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pf-pw-confirm">Xác nhận mật khẩu mới:</label>
                    <input
                      id="pf-pw-confirm"
                      type="password"
                      value={nhapLaiMatKhauMoi}
                      onChange={(e) => setNhapLaiMatKhauMoi(e.target.value)}
                      className="form-control"
                      placeholder="Gõ lại mật khẩu mới..."
                    />
                  </div>
                  <button type="submit" className="btn-secondary-account" disabled={isChangingPw}>
                    {isChangingPw ? (
                      <>
                        <span className="spinner"></span>
                        Đang đổi mật khẩu...
                      </>
                    ) : (
                      'Thay đổi mật khẩu'
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
