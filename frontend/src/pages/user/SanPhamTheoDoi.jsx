import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { dinhDangTien } from '../../utils/dinhDangTien';
import { SinhIconSanPham } from '../../components/user/TheSanPham';

export function SidebarTaiKhoan({ pathHienTai }) {
  return (
    <aside className="account-sidebar">
      <div className="account-sidebar__title">Quản lý cá nhân</div>
      <nav className="account-sidebar__menu">
        <Link
          to="/tai-khoan"
          className={`account-sidebar__link ${pathHienTai === '/tai-khoan' ? 'active' : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          Thông tin tài khoản
        </Link>
        <Link
          to="/tai-khoan/san-pham-theo-doi"
          className={`account-sidebar__link ${pathHienTai === '/tai-khoan/san-pham-theo-doi' ? 'active' : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          Sản phẩm đang theo dõi
        </Link>
      </nav>
    </aside>
  );
}

export default function SanPhamTheoDoi() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dsTheoDoi, setDsTheoDoi] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [newGiaMucTieu, setNewGiaMucTieu] = useState('');

  // Kiểm tra đăng nhập và nạp danh sách theo dõi
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      toast.info('Bạn cần đăng nhập để quản lý danh sách sản phẩm theo dõi!');
      navigate('/dang-nhap');
      return;
    }
    setUser(JSON.parse(savedUser));

    // Nạp dsTheoDoi, nếu chưa có thì tạo dữ liệu mặc định để demo
    const savedDs = localStorage.getItem('dsTheoDoi');
    if (savedDs) {
      setDsTheoDoi(JSON.parse(savedDs));
    } else {
      const macDinh = [
        {
          id: 1,
          tenSanPham: 'Samsung Galaxy S26 Ultra 5G 12GB 512GB',
          thuongHieu: 'Samsung',
          giaThapNhat: 29890000,
          giaMucTieu: 31000000,
          nguon: 'Shopee',
          ngayTheoDoi: '01/07/2026',
          datMucTieu: true, // Vì giá thấp nhất (29.89M) thấp hơn giá mục tiêu (31M)
        },
        {
          id: 4,
          tenSanPham: 'Samsung Galaxy S26 5G 12GB 256GB',
          thuongHieu: 'Samsung',
          giaThapNhat: 20790000,
          giaMucTieu: 19000000,
          nguon: 'FPT Shop',
          ngayTheoDoi: '02/07/2026',
          datMucTieu: false, // Vì giá hiện tại (20.79M) cao hơn giá mục tiêu (19M)
        },
      ];
      localStorage.setItem('dsTheoDoi', JSON.stringify(macDinh));
      setDsTheoDoi(macDinh);
    }
  }, [navigate]);

  // Xóa sản phẩm theo dõi
  const xuLyBoTheoDoi = (id) => {
    const dsCapNhat = dsTheoDoi.filter((item) => item.id !== id);
    localStorage.setItem('dsTheoDoi', JSON.stringify(dsCapNhat));
    setDsTheoDoi(dsCapNhat);
    toast.success('Đã bỏ theo dõi sản phẩm thành công!');
  };

  // Mở chế độ chỉnh sửa giá mong muốn
  const batDauSuaGia = (item) => {
    setEditingId(item.id);
    setNewGiaMucTieu(item.giaMucTieu);
  };

  // Lưu giá chỉnh sửa
  const luuGiaMoi = (id) => {
    if (!newGiaMucTieu || Number(newGiaMucTieu) <= 0) {
      toast.warning('Giá không hợp lệ!');
      return;
    }

    const dsCapNhat = dsTheoDoi.map((item) => {
      if (item.id === id) {
        const targetPrice = Number(newGiaMucTieu);
        return {
          ...item,
          giaMucTieu: targetPrice,
          datMucTieu: item.giaThapNhat <= targetPrice,
        };
      }
      return item;
    });

    localStorage.setItem('dsTheoDoi', JSON.stringify(dsCapNhat));
    setDsTheoDoi(dsCapNhat);
    setEditingId(null);
    toast.success('Đã cập nhật giá mong muốn thành công!');
  };

  if (!user) {
    return null;
  }

  return (
    <main className="user-page">
      <div className="user-container account-layout">
        {/* Cột trái: Sidebar tài khoản */}
        <SidebarTaiKhoan pathHienTai="/tai-khoan/san-pham-theo-doi" />

        {/* Cột phải: Danh sách sản phẩm đang theo dõi */}
        <section className="account-content">
          <div className="account-content__header">
            <h2>Sản phẩm đang theo dõi giá</h2>
            <p>Danh sách các sản phẩm đang được giám sát giá tự động. Hệ thống sẽ báo về tài khoản khi giá giảm đạt đích.</p>
          </div>

          {dsTheoDoi.length > 0 ? (
            <div className="tracked-products-list">
              {dsTheoDoi.map((item) => {
                // Xác định động trạng thái đạt mục tiêu
                const datMucTieu = item.giaThapNhat <= item.giaMucTieu;

                return (
                  <div key={item.id} className="tracked-item-card">
                    {/* Cột 1: Ảnh đại diện */}
                    <div className="tracked-item-card__img">
                      <SinhIconSanPham danhMuc="Điện thoại" width={48} height={48} />
                    </div>

                    {/* Cột 2: Thông tin sản phẩm */}
                    <div className="tracked-item-card__info">
                      <Link to={`/san-pham/${item.id}`} className="tracked-title">
                        {item.tenSanPham}
                      </Link>
                      <div className="tracked-meta">
                        <span>Hãng: <strong>{item.thuongHieu}</strong></span>
                        <span>Ngày theo dõi: {item.ngayTheoDoi}</span>
                      </div>
                    </div>

                    {/* Cột 3: Giá hiện tại vs Giá mong muốn */}
                    <div className="tracked-item-card__pricing">
                      <div className="price-item">
                        <span className="price-lbl">Giá thấp nhất:</span>
                        <strong className="price-val text-red">{dinhDangTien(item.giaThapNhat)}</strong>
                        <span className="price-source">(tại {item.nguon})</span>
                      </div>

                      <div className="price-item">
                        <span className="price-lbl">Giá mong muốn:</span>
                        {editingId === item.id ? (
                          <div className="edit-price-inline">
                            <input
                              type="number"
                              min="0"
                              max="200000000"
                              value={newGiaMucTieu}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (val <= 200000000) setNewGiaMucTieu(e.target.value);
                              }}
                              className="edit-price-input"
                            />
                            <button onClick={() => luuGiaMoi(item.id)} className="btn-save-inline">Lưu</button>
                            <button onClick={() => setEditingId(null)} className="btn-cancel-inline">Hủy</button>
                          </div>
                        ) : (
                          <div className="display-price-inline">
                            <strong className="price-val text-blue">{dinhDangTien(item.giaMucTieu)}</strong>
                            <button onClick={() => batDauSuaGia(item)} className="btn-edit-inline">
                              ✏️ Sửa
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cột 4: Trạng thái & Action */}
                    <div className="tracked-item-card__status-actions">
                      <div className="status-badge-wrapper">
                        {datMucTieu ? (
                          <span className="status-badge status-badge--success">🍀 Đã đạt mục tiêu</span>
                        ) : (
                          <span className="status-badge status-badge--pending">⏳ Chưa đạt mục tiêu</span>
                        )}
                      </div>

                      <button
                        onClick={() => xuLyBoTheoDoi(item.id)}
                        className="btn-unfollow"
                      >
                        Bỏ theo dõi
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="tracked-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <h3>Chưa theo dõi sản phẩm nào</h3>
              <p>Hãy truy cập trang chi tiết sản phẩm hoặc trang Theo dõi giá để bắt đầu nhận tin tức biến động giá.</p>
              <Link to="/theo-doi-gia" className="btn-redirect-track">Đến trang Theo dõi giá</Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
