import { useState, useEffect } from 'react';

export default function BoLocSanPham({ onFilterChange, danhSachGoc = [] }) {
  const [san, setSan] = useState({
    lazada: false,
    fptshop: false,
    tiki: false,
    cellphones: false,
    hoanghamobile: false,
  });

  const [thuongHieu, setThuongHieu] = useState({});

  const [mucGia, setMucGia] = useState({
    under2: false,
    between2_5: false,
    between5_15: false,
    over15: false,
  });

  const [giaMin, setGiaMin] = useState('');
  const [giaMax, setGiaMax] = useState('');

  const [danhGia, setDanhGia] = useState(null);

  // Normalize text for brand keys
  const normalizeText = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();
  };

  // Get available brands from data
  const getAvailableBrands = () => {
    const brandsMap = new Map();
    danhSachGoc.forEach(sp => {
      const b = sp.thuongHieu || sp.brand || sp.attributes?.brand || (sp.items && sp.items[0]?.attributes?.brand) || '';
      if (b && typeof b === 'string') {
        const norm = normalizeText(b);
        if (!brandsMap.has(norm)) {
          // Standardize some known brands for better display if needed, but original is fine
          let displayBrand = b.trim();
          if (norm === 'apple') displayBrand = 'Apple';
          brandsMap.set(norm, displayBrand);
        }
      }
    });
    return Array.from(brandsMap.entries()).map(([key, label]) => ({ key, label }));
  };

  const availableBrands = getAvailableBrands();

  // Reset thuongHieu if options change completely (optional, but good for UX)
  useEffect(() => {
    const newThuongHieu = {};
    availableBrands.forEach(b => {
      newThuongHieu[b.key] = thuongHieu[b.key] || false;
    });
    setThuongHieu(newThuongHieu);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [danhSachGoc]);

  const hasRatings = danhSachGoc.some(sp => sp.danhGia !== undefined && sp.danhGia !== null);

  const handleCheckboxChange = (group, name) => {
    if (group === 'san') {
      setSan((prev) => ({ ...prev, [name]: !prev[name] }));
    } else if (group === 'thuongHieu') {
      setThuongHieu((prev) => ({ ...prev, [name]: !prev[name] }));
    } else if (group === 'mucGia') {
      setMucGia((prev) => ({ ...prev, [name]: !prev[name] }));
    }
  };

  const handleApply = (e) => {
    e.preventDefault();
    if (onFilterChange) {
      onFilterChange({
        san,
        thuongHieu,
        mucGia,
        giaMin,
        giaMax,
        danhGia,
      });
    }
  };

  return (
    <aside className="product-filter">
      <div className="product-filter__title">Bộ lọc tìm kiếm</div>

      <form onSubmit={handleApply}>
        {/* Sàn TMĐT */}
        <div className="product-filter__section">
          <h4>Sàn TMĐT</h4>
          <div className="product-filter__options">
            <label className="product-filter__checkbox">
              <input
                type="checkbox"
                checked={san.lazada}
                onChange={() => handleCheckboxChange('san', 'lazada')}
              />
              <span>Lazada</span>
            </label>
            <label className="product-filter__checkbox">
              <input
                type="checkbox"
                checked={san.fptshop}
                onChange={() => handleCheckboxChange('san', 'fptshop')}
              />
              <span>FPT Shop</span>
            </label>
            <label className="product-filter__checkbox">
              <input
                type="checkbox"
                checked={san.tiki}
                onChange={() => handleCheckboxChange('san', 'tiki')}
              />
              <span>Tiki</span>
            </label>
            <label className="product-filter__checkbox">
              <input
                type="checkbox"
                checked={san.cellphones}
                onChange={() => handleCheckboxChange('san', 'cellphones')}
              />
              <span>CellphoneS</span>
            </label>
            <label className="product-filter__checkbox">
              <input
                type="checkbox"
                checked={san.hoanghamobile}
                onChange={() => handleCheckboxChange('san', 'hoanghamobile')}
              />
              <span>HoangHa Mobile</span>
            </label>
          </div>
        </div>

        {/* Thương hiệu */}
        <div className="product-filter__section">
          <h4>Thương hiệu</h4>
          {availableBrands.length > 0 ? (
            <div className="product-filter__options">
              {availableBrands.map(brand => (
                <label key={brand.key} className="product-filter__checkbox">
                  <input
                    type="checkbox"
                    checked={thuongHieu[brand.key] || false}
                    onChange={() => handleCheckboxChange('thuongHieu', brand.key)}
                  />
                  <span>{brand.label}</span>
                </label>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>Chưa có dữ liệu thương hiệu</div>
          )}
        </div>

        {/* Khoảng giá */}
        <div className="product-filter__section">
          <h4>Khoảng giá</h4>
          <div className="product-filter__options">
            <label className="product-filter__checkbox">
              <input
                type="checkbox"
                checked={mucGia.under2}
                onChange={() => handleCheckboxChange('mucGia', 'under2')}
              />
              <span>Dưới 2.000.000đ</span>
            </label>
            <label className="product-filter__checkbox">
              <input
                type="checkbox"
                checked={mucGia.between2_5}
                onChange={() => handleCheckboxChange('mucGia', 'between2_5')}
              />
              <span>2.000.000đ - 5.000.000đ</span>
            </label>
            <label className="product-filter__checkbox">
              <input
                type="checkbox"
                checked={mucGia.between5_15}
                onChange={() => handleCheckboxChange('mucGia', 'between5_15')}
              />
              <span>5.000.000đ - 15.000.000đ</span>
            </label>
            <label className="product-filter__checkbox">
              <input
                type="checkbox"
                checked={mucGia.over15}
                onChange={() => handleCheckboxChange('mucGia', 'over15')}
              />
              <span>Trên 15.000.000đ</span>
            </label>
          </div>

          <div className="product-filter__price-range">
            <h5>Nhập khoảng giá</h5>
            <div className="product-filter__price-inputs">
              <div className="price-input-wrapper">
                <input
                  type="number"
                  placeholder="Tối thiểu"
                  min="0"
                  max="200000000"
                  value={giaMin}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val <= 200000000) setGiaMin(e.target.value);
                  }}
                />
                <span className="price-input-unit">đ</span>
              </div>
              <span className="product-filter__range-separator">-</span>
              <div className="price-input-wrapper">
                <input
                  type="number"
                  placeholder="Tối đa"
                  min="0"
                  max="200000000"
                  value={giaMax}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val <= 200000000) setGiaMax(e.target.value);
                  }}
                />
                <span className="price-input-unit">đ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Đánh giá */}
        {hasRatings && (
          <div className="product-filter__section">
            <h4>Đánh giá</h4>
            <div className="product-filter__stars-options">
              {[5, 4, 3].map((star) => (
                <label key={star} className="product-filter__star-radio">
                  <input
                    type="radio"
                    name="rating"
                    checked={danhGia === star}
                    onChange={() => setDanhGia(star)}
                  />
                  <span>
                    {Array.from({ length: star }).map((_, i) => '⭐')}
                    {star < 5 && ' trở lên'}
                  </span>
                </label>
              ))}
              {danhGia !== null && (
                <button
                  type="button"
                  onClick={() => setDanhGia(null)}
                  className="product-filter__clear-stars"
                >
                  Xóa chọn
                </button>
              )}
            </div>
          </div>
        )}

        <button type="submit" className="product-filter__btn-submit">
          Áp dụng
        </button>
      </form>
    </aside>
  );
}

