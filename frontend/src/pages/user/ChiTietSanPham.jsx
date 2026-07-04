import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { dinhDangTien } from '../../utils/dinhDangTien';
import { SinhIconSanPham } from '../../components/user/TheSanPham';
import BangSoSanhGia from '../../components/user/BangSoSanhGia';
import { productService } from '../../services/productService';

export default function ChiTietSanPham() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sanPham, setSanPham] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState(null);

  // Accordion states
  const [hienSpec, setHienSpec] = useState(true);
  const [hienSoSanh, setHienSoSanh] = useState(true);

  // Sắp xếp nơi bán
  const [kieuSapXep, setKieuSapXep] = useState('asc');

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await productService.layChiTietSanPham(id);
        if (res.data) {
          setSanPham(res.data);
          setIsOffline(res.isOffline);
          if (res.isOffline) {
            toast.warning('Đang hiển thị dữ liệu offline do không kết nối được máy chủ API!');
          }
        } else {
          setError('Không tìm thấy sản phẩm.');
        }
      } catch (err) {
        console.error(err);
        setError('Lỗi kết nối máy chủ API và không tìm thấy dữ liệu dự phòng.');
        toast.error('Lỗi kết nối máy chủ API.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    productService.layChiTietSanPham(id).then(res => {
      if (res.data) {
        setSanPham(res.data);
        setIsOffline(res.isOffline);
      } else {
        setError('Không tìm thấy sản phẩm.');
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError('Lỗi kết nối máy chủ API.');
      setLoading(false);
    });
  };

  const xuLyTheoDoiGia = () => {
    if (!sanPham) return;
    
    // Kiểm tra đăng nhập
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      toast.info('Bạn cần đăng nhập để sử dụng tính năng theo dõi giá!');
      navigate('/dang-nhap');
      return;
    }

    // Lưu vào localStorage sản phẩm đang theo dõi
    const giaMucTieu = Math.round(sanPham.giaThapNhat * 0.9); // Đặt mặc định giảm 10%
    const sanPhamTheoDoiMoi = {
      id: sanPham.id,
      tenSanPham: sanPham.tenSanPham,
      thuongHieu: sanPham.thuongHieu,
      giaThapNhat: sanPham.giaThapNhat,
      giaMucTieu: giaMucTieu,
      nguon: sanPham.domain || 'Tiki',
      ngayTheoDoi: new Date().toLocaleDateString('vi-VN'),
      datMucTieu: false,
    };

    let dsTheoDoi = [];
    const savedDs = localStorage.getItem('dsTheoDoi');
    if (savedDs) {
      dsTheoDoi = JSON.parse(savedDs);
    }

    // Kiểm tra xem đã theo dõi chưa
    const daTonTai = dsTheoDoi.some((item) => item.id === sanPham.id);
    if (daTonTai) {
      toast.warning('Bạn đã theo dõi sản phẩm này rồi!');
      navigate('/tai-khoan/san-pham-theo-doi');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      dsTheoDoi.push(sanPhamTheoDoiMoi);
      localStorage.setItem('dsTheoDoi', JSON.stringify(dsTheoDoi));
      toast.success(`Đã thêm ${sanPham.tenSanPham} vào danh sách theo dõi giá!`);
      setIsSubmitting(false);
      navigate('/tai-khoan/san-pham-theo-doi');
    }, 800);
  };

  if (error && !sanPham) {
    return (
      <main className="user-page">
        <div className="user-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3>Đã xảy ra lỗi kết nối</h3>
          <p style={{ color: '#64748b', marginBottom: '16px' }}>{error}</p>
          <button className="btn-retry" onClick={handleRetry} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>Thử lại</button>
        </div>
      </main>
    );
  }

  if (loading || !sanPham) {
    return (
      <main className="user-page">
        <div className="user-container product-detail-layout">
          {/* Breadcrumb skeleton */}
          <div className="breadcrumb skeleton" style={{ width: '30%', height: '16px', marginBottom: '20px' }}></div>

          <div className="detail-grid">
            {/* Cột trái: Ảnh skeleton */}
            <section className="detail-media skeleton-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '320px' }}>
              <div className="skeleton" style={{ width: '200px', height: '200px', borderRadius: '12px' }}></div>
            </section>

            {/* Cột phải: Thông tin skeleton */}
            <section className="detail-info skeleton-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="skeleton skeleton-title" style={{ width: '80%' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '40%' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '90%' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '60%', height: '36px', marginTop: '24px' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '50%', height: '44px', borderRadius: '24px', marginTop: '12px' }}></div>
            </section>
          </div>

          {/* Accordions skeleton */}
          <div className="skeleton-card" style={{ marginTop: '24px', height: '200px' }}>
            <div className="skeleton skeleton-title" style={{ width: '30%', marginBottom: '24px' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '95%' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '90%' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '85%' }}></div>
          </div>
        </div>
      </main>
    );
  }

  // Tỷ lệ giảm giá giả lập
  const phanTramGiam = sanPham.phanTramGiam || 17;
  const giaGoc = sanPham.giaGoc || Math.round(sanPham.giaThapNhat * 1.2);
  const domainTarget = sanPham.domain || 'fptshop.com.vn';

  return (
    <main className="user-page">
      <div className="user-container product-detail-layout">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/">Trang chủ</Link> &gt;{' '}
          <Link to={`/tim-kiem?danh-muc=${encodeURIComponent(sanPham.danhMuc)}`}>
            {sanPham.danhMuc}
          </Link>{' '}
          &gt; <Link to={`/tim-kiem?q=${encodeURIComponent(sanPham.thuongHieu)}`}>{sanPham.thuongHieu}</Link> &gt;{' '}
          <span>{sanPham.tenSanPham}</span>
        </div>

        {/* Khối thông tin chính sản phẩm */}
        <section className="product-main-card">
          {/* Cột trái: Hình ảnh */}
          <div className="product-main-card__left">
            <div className="product-main-card__image-container">
              {sanPham.hinhAnh ? (
                <img src={sanPham.hinhAnh} alt={sanPham.tenSanPham} className="product-main-card__img" />
              ) : (
                <div className="product-main-card__placeholder">
                  <SinhIconSanPham danhMuc={sanPham.danhMuc || 'Điện thoại'} width={180} height={180} />
                </div>
              )}
            </div>
          </div>

          {/* Cột phải: Thông số tóm tắt, giá, CTA */}
          <div className="product-main-card__right">
            <h1 className="product-main-card__title">
              {sanPham.tenSanPham}
              {isOffline && (
                <span className="badge-offline" style={{ marginLeft: '10px', background: '#fef3c7', color: '#d97706', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block', verticalAlign: 'middle' }}>
                  Offline
                </span>
              )}
            </h1>
            
            <div className="product-main-card__meta">
              <span className="brand-badge">Hãng: {sanPham.thuongHieu}</span>
              <span className="rating-badge">⭐ {sanPham.danhGia?.toFixed(1)}/5 (Từ {sanPham.soLuongDanhGia} đánh giá)</span>
            </div>

            <div className="product-main-card__pricing">
              <div className="price-row">
                <span className="label">Giá khuyến mãi tốt nhất:</span>
                <span className="price-value">{dinhDangTien(sanPham.giaThapNhat)}</span>
              </div>
              <div className="price-original-row">
                <span className="label">Giá gốc hãng công bố:</span>
                <span className="price-original-value">{dinhDangTien(giaGoc)}</span>
                <span className="price-discount-tag">Giảm {phanTramGiam}%</span>
              </div>
              <p className="price-note">
                * Giá thấp nhất hiện tại đang được cập nhật tự động từ sàn TMĐT lớn nhất.
              </p>
            </div>

            <div className="product-main-card__actions">
              <a
                href={sanPham.linkMuaTotNhat}
                target="_blank"
                rel="noreferrer"
                className="btn-primary-go"
              >
                Tới nơi bán rẻ nhất
              </a>
              <button
                onClick={xuLyTheoDoiGia}
                className="btn-secondary-track"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner"></span>
                    Đang kích hoạt...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    Theo dõi giảm giá
                  </>
                )}
              </button>
            </div>

            <div className="product-main-card__chart-link">
              <Link to={`/san-pham/${sanPham.id}/lich-su-gia`} className="chart-redirect">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                <span>Xem biểu đồ biến động lịch sử giá (So sánh đa sàn) &gt;</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Accordion 1: Thông số kỹ thuật */}
        <section className="accordion-section">
          <div className="accordion-header" onClick={() => setHienSpec(!hienSpec)}>
            <h3>Thông số kỹ thuật {hienSpec ? '▲' : '▼'}</h3>
          </div>
          {hienSpec && sanPham.thongSoKyThuat && (
            <div className="accordion-body spec-grid">
              {Object.entries(sanPham.thongSoKyThuat).map(([key, val]) => (
                <div key={key} className="spec-row">
                  <div className="spec-label">{key}</div>
                  <div className="spec-value">{val}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Accordion 2: Bảng so sánh giá bán lẻ */}
        <section className="accordion-section">
          <div className="accordion-header flex-between" onClick={() => setHienSoSanh(!hienSoSanh)}>
            <h3>So sánh giá giữa các sàn {hienSoSanh ? '▼' : '▲'}</h3>
            <div className="sort-wrapper" onClick={(e) => e.stopPropagation()}>
              <label htmlFor="sort-price" style={{ fontSize: 13, marginRight: 8, fontWeight: 'normal' }}>
                Sắp xếp giá:
              </label>
              <select
                id="sort-price"
                value={kieuSapXep}
                onChange={(e) => setKieuSapXep(e.target.value)}
                className="sort-dropdown"
              >
                <option value="asc">Giá tăng dần</option>
                <option value="desc">Giá giảm dần</option>
              </select>
            </div>
          </div>
          {hienSoSanh && (
            <div className="accordion-body">
              <BangSoSanhGia noiBanChiTiet={sanPham.noiBanChiTiet} sapXepKieu={kieuSapXep} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
