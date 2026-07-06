import { Link } from 'react-router-dom';
import { dinhDangTien } from '../../utils/dinhDangTien';

export function SinhIconSanPham({ danhMuc, width = 64, height = 64 }) {
  if (danhMuc === 'Điện thoại') {
    return (
      <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
        <line x1="12" y1="18" x2="12.01" y2="18"></line>
      </svg>
    );
  }
  if (danhMuc === 'Laptop') {
    return (
      <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="2" y1="20" x2="22" y2="20"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    );
  }
  if (danhMuc === 'Tivi') {
    return (
      <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="13" rx="2"></rect>
        <polyline points="12 16 12 20 8 20 16 20"></polyline>
      </svg>
    );
  }
  if (danhMuc === 'PC') {
    return (
      <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="12" rx="2"></rect>
        <rect x="9" y="20" width="6" height="2"></rect>
        <line x1="12" y1="16" x2="12" y2="20"></line>
      </svg>
    );
  }
  // Mặc định
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.89 2.24a2 2 0 0 0-1.78 0L3.78 6.24a2 2 0 0 0-1.09 1.77v8a2 2 0 0 0 1.09 1.77l7.33 4a2 2 0 0 0 1.78 0l7.33-4a2 2 0 0 0 1.09-1.77v-8a2 2 0 0 0-1.09-1.77z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
  );
}

export default function TheSanPham({ sanPham }) {
  if (!sanPham) {
    return null;
  }

  return (
    <article className="product-card">
      <Link to={`/san-pham/${sanPham.maNhomTam || sanPham.id}`} state={{ sanPham }} className="product-card__image-link">
        <div className="product-card__image">
          {sanPham.hinhAnh ? (
            <img src={sanPham.hinhAnh} alt={sanPham.tenSanPham} />
          ) : (
            <div className="product-card__image-placeholder">
              <SinhIconSanPham danhMuc={sanPham.danhMuc || 'Điện thoại'} width={70} height={70} />
            </div>
          )}
          {sanPham.phanTramGiam > 0 && (
            <div className="product-card__badge-discount">
              -{sanPham.phanTramGiam}%
            </div>
          )}
        </div>
      </Link>

      <div className="product-card__body">
        <Link to={`/san-pham/${sanPham.maNhomTam || sanPham.id}`} state={{ sanPham }} className="product-card__title">
          {sanPham.tenSanPham}
        </Link>

        {(() => {
          const brand = sanPham.thuongHieu || sanPham.brand || sanPham.attributes?.brand || (sanPham.items && sanPham.items[0]?.attributes?.brand);
          if (brand) {
            return (
              <div className="product-card__brand" style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                Thương hiệu: <strong style={{ color: '#0f172a' }}>{brand}</strong>
              </div>
            );
          }
          return null;
        })()}

        <div className="product-card__price-section">
          <div className="product-card__price">
            Giá từ: {dinhDangTien(sanPham.giaThapNhat)}
          </div>
          {sanPham.giaCaoNhat > sanPham.giaThapNhat ? (
            <div className="product-card__range">
              Khoảng giá: {dinhDangTien(sanPham.giaThapNhat)} - {dinhDangTien(sanPham.giaCaoNhat)}
            </div>
          ) : (
            <div className="product-card__original">
              Giá gốc: {dinhDangTien(sanPham.giaGoc)}
            </div>
          )}
        </div>

        <div className="product-card__meta">
          <span className="product-card__sellers-count">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            {sanPham.soNoiBan} nơi bán
          </span>
          <span className="product-card__rating">
            ⭐ {sanPham.danhGia?.toFixed(1)}
          </span>
        </div>

        <div className="product-card__shops">
          {sanPham.sanDangBan?.map((san) => (
            <span key={san} className={`product-card__shop-tag product-card__shop-tag--${san.toLowerCase().replace(/\s/g, '')}`}>
              {san}
            </span>
          ))}
        </div>

        <div className="product-card__actions">
          <Link to={`/san-pham/${sanPham.id}`} className="product-card__secondary">
            Xem so sánh
          </Link>
          <a
            href={sanPham.linkMuaTotNhat}
            className="product-card__primary"
            target="_blank"
            rel="noreferrer"
          >
            Tới nơi bán
          </a>
        </div>
      </div>
    </article>
  );
}
