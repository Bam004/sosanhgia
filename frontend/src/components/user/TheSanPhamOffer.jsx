import { Link } from 'react-router-dom';
import { dinhDangTien } from '../../utils/dinhDangTien';
import { SinhIconSanPham } from './TheSanPham';

export default function TheSanPhamOffer({ sanPham, kieuNut = 'toinoiban', onSelect }) {
  if (!sanPham) {
    return null;
  }

  // Tỷ lệ giảm giá giả lập
  const phanTramGiam = sanPham.phanTramGiam || 17;
  const giaGoc = sanPham.giaGoc || Math.round(sanPham.giaThapNhat * 1.2);
  const domainTarget = sanPham.domain || 'fptshop.com.vn';

  return (
    <article className="offer-card">
      <Link to={`/san-pham/${sanPham.maSPCH || sanPham.id}`} state={{ sanPham }} className="offer-card__image-link">
        <div className="offer-card__image">
          {sanPham.hinhAnh ? (
            <img src={sanPham.hinhAnh} alt={sanPham.tenSanPham} />
          ) : (
            <div className="offer-card__image-placeholder">
              <SinhIconSanPham danhMuc={sanPham.danhMuc || 'Điện thoại'} width={60} height={60} />
            </div>
          )}
        </div>
      </Link>

      <div className="offer-card__body">
        <Link to={`/san-pham/${sanPham.maSPCH || sanPham.id}`} state={{ sanPham }} className="offer-card__title">
          {sanPham.tenSanPham}
        </Link>

        {(() => {
          const brand = sanPham.thuongHieu || sanPham.brand || sanPham.attributes?.brand || (sanPham.items && sanPham.items[0]?.attributes?.brand);
          if (brand) {
            return (
              <div className="offer-card__brand" style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                Thương hiệu: <strong style={{ color: '#0f172a' }}>{brand}</strong>
              </div>
            );
          }
          return null;
        })()}

        <div className="offer-card__pricing">
          <div className="offer-card__price-row">
            <span className="offer-card__current-price">
              {dinhDangTien(sanPham.giaThapNhat)}
            </span>
            <span className="offer-card__discount-tag">
              -{phanTramGiam}%
            </span>
          </div>
          <div className="offer-card__original-price">
            {dinhDangTien(giaGoc)}
          </div>
        </div>

        <div className="offer-card__actions">
          {kieuNut === 'chon' ? (
            <button
              onClick={() => onSelect && onSelect(sanPham)}
              className="offer-card__btn-select"
            >
              Chọn sản phẩm
            </button>
          ) : (
            <a
              href={sanPham.linkMuaTotNhat || 'https://fptshop.com.vn'}
              target="_blank"
              rel="noreferrer"
              className="offer-card__btn-go"
            >
              Tới nơi bán
            </a>
          )}
        </div>

        <div className="offer-card__domain">
          <a href={`https://${domainTarget}`} target="_blank" rel="noreferrer">
            https://{domainTarget}
          </a>
        </div>
      </div>
    </article>
  );
}
