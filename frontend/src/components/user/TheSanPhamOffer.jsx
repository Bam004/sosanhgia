import { Link } from 'react-router-dom';
import { dinhDangTien } from '../../utils/dinhDangTien';
import { SinhIconSanPham } from './TheSanPham';
import { SinhLogoSan } from './BangSoSanhGia';

const layNhanTinhTrang = (tinhTrang) => {
  const mapping = {
    new: 'Hàng mới',
    used: 'Hàng cũ',
    activated: 'Đã kích hoạt',
    refurbished: 'Tân trang'
  };

  return mapping[tinhTrang] || tinhTrang || 'Không rõ';
};

const chuanHoaTenNguon = (value) => {
  const original = String(value || '').trim();
  const normalized = original
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');

  if (!normalized) return '';
  if (normalized.includes('cellphone')) return 'CellphoneS';
  if (normalized.includes('fpt')) return 'FPT Shop';
  if (
    normalized.includes('hoanghamobile') ||
    normalized.includes('hoangha')
  ) {
    return 'Hoàng Hà Mobile';
  }
  if (normalized.includes('lazada')) return 'Lazada';
  if (normalized.includes('tiki')) return 'Tiki';

  return original;
};

const layDanhSachNguon = (sanPham) => {
  const sources = [];

  if (Array.isArray(sanPham.sanDangBan)) {
    sources.push(...sanPham.sanDangBan);
  }

  if (Array.isArray(sanPham.nguon)) {
    sources.push(...sanPham.nguon);
  }

  if (Array.isArray(sanPham.items)) {
    sanPham.items.forEach((item) => {
      if (item.sanTMDT) sources.push(item.sanTMDT);
    });
  }

  if (Array.isArray(sanPham.offers)) {
    sanPham.offers.forEach((offer) => {
      if (offer.sanTMDT) sources.push(offer.sanTMDT);
    });
  }

  return [...new Set(sources.map(chuanHoaTenNguon).filter(Boolean))];
};

export default function TheSanPhamOffer({ sanPham, kieuNut = 'toinoiban', onSelect }) {
  if (!sanPham) {
    return null;
  }

  const productId = sanPham.maSPCH || sanPham.id;
  const danhSachNguon = layDanhSachNguon(sanPham);
  const soNoiBan = sanPham.soNoiBan || danhSachNguon.length || 0;
  const tinhTrang = sanPham.tinhTrang || 'new';
  const coKhoangGia =
    sanPham.giaCaoNhat &&
    sanPham.giaThapNhat &&
    Number(sanPham.giaCaoNhat) > Number(sanPham.giaThapNhat);

  return (
    <article className="offer-card">
      <Link to={`/san-pham/${productId}`} state={{ sanPham }} className="offer-card__image-link">
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
        <Link to={`/san-pham/${productId}`} state={{ sanPham }} className="offer-card__title">
          {sanPham.tenChuanHoa || sanPham.tenSanPham}
        </Link>

        <div
          className="offer-card__badges"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 8
          }}
        >
          {sanPham.thuongHieu && sanPham.thuongHieu !== 'Khác' && (
            <span
              className="offer-card__brand"
              style={{
                fontSize: 12,
                color: '#0f172a',
                background: '#f1f5f9',
                borderRadius: 999,
                padding: '3px 8px',
                fontWeight: 600
              }}
            >
              {sanPham.thuongHieu}
            </span>
          )}

          {tinhTrang && (
            <span
              className="offer-card__condition"
              style={{
                fontSize: 12,
                color: tinhTrang === 'new' ? '#047857' : '#b45309',
                background: tinhTrang === 'new' ? '#ecfdf5' : '#fffbeb',
                borderRadius: 999,
                padding: '3px 8px',
                fontWeight: 600
              }}
            >
              {layNhanTinhTrang(tinhTrang)}
            </span>
          )}

          {sanPham.dungLuong && (
            <span
              className="offer-card__storage"
              style={{
                fontSize: 12,
                color: '#334155',
                background: '#f8fafc',
                borderRadius: 999,
                padding: '3px 8px',
                fontWeight: 600
              }}
            >
              {sanPham.dungLuong}
            </span>
          )}
        </div>

        <div className="offer-card__pricing">
          <div className="offer-card__price-row">
            <span className="offer-card__current-price">
              Từ {dinhDangTien(sanPham.giaThapNhat)}
            </span>
          </div>

          {coKhoangGia && (
            <div
              className="offer-card__price-range"
              style={{
                fontSize: 12,
                color: '#64748b',
                marginTop: 4
              }}
            >
              Khoảng giá: {dinhDangTien(sanPham.giaThapNhat)} - {dinhDangTien(sanPham.giaCaoNhat)}
            </div>
          )}
        </div>

        <div
          className="offer-card__source-summary"
          style={{
            marginTop: 10,
            marginBottom: 8,
            fontSize: 13,
            color: '#475569',
            fontWeight: 500
          }}
        >
          {soNoiBan > 0 ? `${soNoiBan} nơi bán` : 'Chưa có nơi bán'}
        </div>

        {danhSachNguon.length > 0 && (
          <div
            className="offer-card__source-list"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginBottom: 12
            }}
          >
            {danhSachNguon.slice(0, 4).map((san) => (
              <span
                key={san}
                className="offer-card__source-badge"
                title={san}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  border: '1px solid #e2e8f0',
                  borderRadius: 999,
                  padding: '4px 8px',
                  background: '#fff',
                  fontSize: 12,
                  color: '#334155',
                  maxWidth: 130
                }}
              >
                <SinhLogoSan brand={san} width={20} height={20} />
                <span
                  style={{
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {san}
                </span>
              </span>
            ))}

            {danhSachNguon.length > 4 && (
              <span
                className="offer-card__source-more"
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 999,
                  padding: '4px 8px',
                  background: '#f8fafc',
                  fontSize: 12,
                  color: '#475569'
                }}
              >
                +{danhSachNguon.length - 4}
              </span>
            )}
          </div>
        )}

        <div
          className="offer-card__actions"
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center'
          }}
        >
          {kieuNut === 'chon' ? (
            <button
              onClick={() => onSelect && onSelect(sanPham)}
              className="offer-card__btn-select"
            >
              Chọn sản phẩm
            </button>
          ) : (
            <>
              <Link
                to={`/san-pham/${productId}`}
                state={{ sanPham }}
                className="offer-card__btn-select"
                style={{ textDecoration: 'none', textAlign: 'center' }}
              >
                Xem so sánh
              </Link>

              <a
                href={sanPham.linkMuaTotNhat || '#'}
                target="_blank"
                rel="noreferrer"
                className="offer-card__btn-go"
              >
                Tới nơi bán
              </a>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
