import { dinhDangTien } from '../../utils/dinhDangTien';

const normalizeBrand = (value) => {
  if (!value) return '';
  return value
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
};

const layNhanTinhTrang = (tinhTrang) => {
  const mapping = {
    new: 'Hàng mới',
    used: 'Hàng cũ',
    activated: 'Đã kích hoạt',
    refurbished: 'Tân trang'
  };

  return mapping[tinhTrang] || tinhTrang || '';
};

export function SinhLogoSan({ brand, width = 36, height = 36 }) {
  const brandLower = normalizeBrand(brand);
  if (brandLower.includes('tiki')) {
    return (
      <div className="brand-logo-container brand-logo-container--tiki" style={{ width, height }}>
        <div style={{ color: '#0ea5e9', fontWeight: '900', fontSize: width * 0.45 }}>Tiki</div>
      </div>
    );
  }
  if (brandLower.includes('hoangha') || brandLower.includes('hoang ha')) {
    return (
      <div className="brand-logo-container brand-logo-container--hoangha" style={{ width, height }}>
        <div style={{ color: '#009688', fontWeight: '900', fontSize: width * 0.38 }}>HH</div>
      </div>
    );
  }
  if (brandLower.includes('lazada')) {
    return (
      <div className="brand-logo-container brand-logo-container--lazada" style={{ width, height }}>
        <svg width={width * 0.7} height={height * 0.7} viewBox="0 0 24 24" fill="none" stroke="#a21caf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon>
          <polyline points="12 22 12 12 22 8.5"></polyline>
          <polyline points="2 8.5 12 12"></polyline>
        </svg>
      </div>
    );
  }
  if (brandLower.includes('cellphones')) {
    return (
      <div className="brand-logo-container brand-logo-container--cellphones" style={{ width, height }}>
        <div style={{ color: '#e11d48', fontWeight: '900', fontSize: width * 0.6 }}>S</div>
      </div>
    );
  }
  if (brandLower.includes('fpt shop') || brandLower.includes('fpt')) {
    return (
      <div className="brand-logo-container brand-logo-container--fpt" style={{ width, height }}>
        <div style={{ color: '#dc2626', fontWeight: '900', fontSize: width * 0.45 }}>FPT</div>
      </div>
    );
  }
  // Mặc định
  return (
    <div className="brand-logo-container" style={{ width, height, backgroundColor: '#cbd5e1' }}>
      <span style={{ fontSize: width * 0.35, fontWeight: '700' }}>{brand.slice(0, 3).toUpperCase()}</span>
    </div>
  );
}

export default function BangSoSanhGia({ noiBanChiTiet, sapXepKieu = 'asc' }) {
  if (!noiBanChiTiet || noiBanChiTiet.length === 0) {
    return <div className="no-offers">Không có dữ liệu nơi bán.</div>;
  }

  if (!noiBanChiTiet || noiBanChiTiet.length === 0) {
    return (
      <div className="price-compare-table" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <p>Chưa có nơi bán phù hợp cho sản phẩm này.</p>
      </div>
    );
  }

  // Calculate lowest price for highlighting
  const lowestPrice = Math.min(...noiBanChiTiet.map(s => s.gia).filter(p => !isNaN(p) && p > 0));

  // Sắp xếp các nơi bán theo giá
  const noiBanDaSapXep = [...noiBanChiTiet].sort((a, b) => {
    if (sapXepKieu === 'asc') {
      return a.gia - b.gia;
    } else {
      return b.gia - a.gia;
    }
  });

  return (
    <div className="price-compare-table">
      <div className="price-compare-table__header">
        <div className="col-shop">Nơi bán</div>
        <div className="col-title">Tên sản phẩm</div>
        <div className="col-price">Giá bán</div>
        <div className="col-action">Tới nơi bán</div>
      </div>

      <div className="price-compare-table__rows">
        {noiBanDaSapXep.map((seller, index) => {
          const laGiaTotNhat = seller.gia === lowestPrice;

          return (
            <div key={`${seller.maSPTho || seller.san}-${index}`} className={`price-compare-table__row ${laGiaTotNhat ? 'price-compare-table__row--best' : ''}`}>
              {/* Nơi bán + Logo */}
              <div className="col-shop">
                <SinhLogoSan brand={seller.sourceCode || seller.san} width={40} height={40} />
                <div className="shop-details">
                  <span className="shop-name">{seller.tenSan || seller.san}</span>
                  <span className="shop-domain">{seller.domain}</span>
                </div>
              </div>

              {/* Tên sản phẩm trên sàn */}
              <div className="col-title">
                <span className="offer-title">{seller.tenNoiBan}</span>
                <div className="offer-meta">
                  {seller.tinhTrang && <span className="offer-condition">{layNhanTinhTrang(seller.tinhTrang)}</span>}
                  {seller.danhGia && <span className="offer-rating">⭐ {seller.danhGia}</span>}
                  {seller.capNhat && <span className="offer-updated">Cập nhật: {seller.capNhat}</span>}
                </div>
              </div>

              {/* Giá bán */}
              <div className="col-price">
                <span className="offer-price">{dinhDangTien(seller.gia)}</span>
                {laGiaTotNhat && <span className="best-price-badge">Giá tốt nhất</span>}
              </div>

              {/* Nút tới nơi bán */}
              <div className="col-action">
                {seller.link && seller.link.match(/^https?:\/\//) ? (
                  <a
                    href={seller.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-go-to-seller"
                  >
                    Đến nơi bán
                  </a>
                ) : (
                  <button disabled className="btn-go-to-seller" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    Nơi bán bị lỗi
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
