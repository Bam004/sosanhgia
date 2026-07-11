import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { dinhDangTien } from '../../utils/dinhDangTien';
import { SinhIconSanPham } from '../../components/user/TheSanPham';
import BangSoSanhGia from '../../components/user/BangSoSanhGia';
import { productService } from '../../services/productService';
//import { theoDoiGiaService } from '../../services/theoDoiGiaService';
//import { buildLoginUrl } from '../../utils/returnUrl';

export default function ChiTietSanPham() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const stateProduct = location.state?.sanPham;

  const [sanPham, setSanPham] = useState(() => {
    // 1. Dùng dữ liệu truyền từ trang tìm kiếm qua state
    if (stateProduct) return stateProduct;
    return null;
  });

  const [loading, setLoading] = useState(!sanPham);
  const [error, setError] = useState(null);

  // Accordion states
  const [hienSpec, setHienSpec] = useState(true);
  const [hienSoSanh, setHienSoSanh] = useState(true);

  // Sắp xếp nơi bán
  const [kieuSapXep, setKieuSapXep] = useState('asc');

  //const [dangTheoDoi, setDangTheoDoi] = useState(false);
  //const [daTheoDoi, setDaTheoDoi] = useState(false);
  //const [maTheoDoi, setMaTheoDoi] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!sanPham) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await productService.layChiTietSanPham(id);
        if (res.data) {
          setSanPham(res.data);
          
        } else {
          setError(res.errorMessage || 'Không tìm thấy sản phẩm.');
        }
      } catch (err) {
        console.error('API compare failed:', err);
        setError('Lỗi kết nối máy chủ API.');
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
    navigate(`/theo-doi-gia?maSPCH=${encodeURIComponent(id)}`);
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

  const layNhanTinhTrang = (tinhTrang) => {
    const mapping = {
      new: 'Hàng mới',
      used: 'Hàng cũ',
      activated: 'Đã kích hoạt',
      refurbished: 'Tân trang'
    };

    return mapping[tinhTrang] || tinhTrang || 'Không rõ';
  };

  const domainTarget = sanPham.domain || '';
  const soSanTMDT = sanPham.soNoiBan || 0;
  const soNoiBan = sanPham.soOffer || 0;
  const noiBanChiTiet = sanPham.noiBanChiTiet || [];

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
            </h1>
            
            <div className="product-main-card__meta">
              {(() => {
                const brand = sanPham.thuongHieu || sanPham.brand || sanPham.attributes?.brand || (sanPham.items && sanPham.items[0]?.attributes?.brand);
                return brand && brand !== 'Khác' ? <span className="brand-badge" style={{ marginRight: '16px', fontWeight: '500' }}>Thương hiệu: {brand}</span> : null;
              })()}
              {sanPham.tinhTrang && (
                <span className="condition-badge" style={{ marginRight: '16px', fontWeight: '500' }}>
                  Tình trạng: {layNhanTinhTrang(sanPham.tinhTrang)}
                </span>
              )}
              <span className="rating-badge">
                {sanPham.danhGia ? `⭐ ${sanPham.danhGia.toFixed(1)}/5 (Từ ${sanPham.soLuongDanhGia} đánh giá)` : 'Chưa có đánh giá'}
              </span>
            </div>

            <div className="product-main-card__pricing">
              <div className="price-row">
                <span className="label">Mức giá:</span>
                <span className="price-value">
                  {sanPham.items && sanPham.items.length === 0 ? (
                    'Chưa có giá'
                  ) : sanPham.giaThapNhat === sanPham.giaCaoNhat ? (
                    dinhDangTien(sanPham.giaThapNhat)
                  ) : (
                    `${dinhDangTien(sanPham.giaThapNhat)} - ${dinhDangTien(sanPham.giaCaoNhat)}`
                  )}
                </span>
              </div>
              <p className="price-note">
                Tổng hợp từ {sanPham.soNoiBan} nguồn bán ({sanPham.soOffer || sanPham.soNoiBan} offer)
              </p>
            </div>

            <div className="product-main-card__actions">
              {sanPham.linkMuaTotNhat && sanPham.linkMuaTotNhat.match(/^https?:\/\//) ? (
                <a
                  href={sanPham.linkMuaTotNhat}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary-go"
                >
                  Đến nơi bán
                </a>
              ) : (
                <button disabled className="btn-primary-go" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                  Chưa có nơi bán hợp lệ
                </button>
              )}
              <button
                  type="button"
                  onClick={xuLyTheoDoiGia}
                  className="btn-secondary-track"
                >
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
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  Theo dõi giảm giá
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
          {hienSpec && (
            <div className="accordion-body spec-grid">
              {sanPham.thongSoKyThuat && Object.keys(sanPham.thongSoKyThuat).length > 0 ? (
                Object.entries(sanPham.thongSoKyThuat).map(([key, val]) => (
                  <div key={key} className="spec-row">
                    <div className="spec-label">{key}</div>
                    <div className="spec-value">{val}</div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                  Chưa có dữ liệu thông số kỹ thuật cho sản phẩm này.
                </div>
              )}
            </div>
          )}
        </section>

        {/* Accordion 2: Bảng so sánh giá bán lẻ */}
        <section className="accordion-section">
          <div className="accordion-header flex-between" onClick={() => setHienSoSanh(!hienSoSanh)}>
            <h3>So sánh giá từ các nơi bán {hienSoSanh ? '▼' : '▲'}</h3>
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
              {soNoiBan > 0 && (
                <p
                  className="compare-summary"
                  style={{
                    margin: '0 0 12px',
                    fontSize: 13,
                    color: '#64748b',
                  }}
                >
                  Hiển thị {soNoiBan} nơi bán từ {soSanTMDT} sàn TMĐT.
                </p>
              )}

              <BangSoSanhGia noiBanChiTiet={noiBanChiTiet} sapXepKieu={kieuSapXep} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
