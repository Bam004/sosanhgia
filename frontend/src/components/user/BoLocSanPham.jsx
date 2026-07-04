import { useState } from 'react';

export default function BoLocSanPham({ onFilterChange }) {
  const [san, setSan] = useState({
    lazada: false,
    fptshop: false,
    tiki: false,
    cellphones: false,
    hoanghamobile: false,
  });

  const [thuongHieu, setThuongHieu] = useState({
    samsung: false,
    apple: false,
    lenovo: false,
    epower: false,
  });

  const [mucGia, setMucGia] = useState({
    under2: false,
    between2_5: false,
    between5_15: false,
    over15: false,
  });

  const [giaMin, setGiaMin] = useState('');
  const [giaMax, setGiaMax] = useState('');

  const [danhGia, setDanhGia] = useState(null);

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
          <div className="product-filter__options">
            <label className="product-filter__checkbox">
              <input
                type="checkbox"
                checked={thuongHieu.samsung}
                onChange={() => handleCheckboxChange('thuongHieu', 'samsung')}
              />
              <span>Samsung</span>
            </label>
            <label className="product-filter__checkbox">
              <input
                type="checkbox"
                checked={thuongHieu.apple}
                onChange={() => handleCheckboxChange('thuongHieu', 'apple')}
              />
              <span>Apple</span>
            </label>
            <label className="product-filter__checkbox">
              <input
                type="checkbox"
                checked={thuongHieu.lenovo}
                onChange={() => handleCheckboxChange('thuongHieu', 'lenovo')}
              />
              <span>Lenovo</span>
            </label>
            <label className="product-filter__checkbox">
              <input
                type="checkbox"
                checked={thuongHieu.epower}
                onChange={() => handleCheckboxChange('thuongHieu', 'epower')}
              />
              <span>E-Power</span>
            </label>
          </div>
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

        <button type="submit" className="product-filter__btn-submit">
          Áp dụng
        </button>
      </form>
    </aside>
  );
}
