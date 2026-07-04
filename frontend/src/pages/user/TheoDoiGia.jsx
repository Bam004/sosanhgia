import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { sanPhamMau } from '../../data/duLieuSanPhamMau';
import { dinhDangTien } from '../../utils/dinhDangTien';
import TheSanPhamOffer from '../../components/user/TheSanPhamOffer';

export default function TheoDoiGia() {
  const navigate = useNavigate();
  
  const [queryName, setQueryName] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [giaMongMuon, setGiaMongMuon] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lọc gợi ý tìm kiếm theo gõ phím ở ô "Tìm sản phẩm"
  useEffect(() => {
    if (queryName.trim().length > 1) {
      const q = queryName.toLowerCase();
      const matches = sanPhamMau.filter((item) =>
        item.tenSanPham.toLowerCase().includes(q)
      );
      setFilteredSuggestions(matches);
    } else {
      setFilteredSuggestions([]);
    }
  }, [queryName]);

  // Chọn sản phẩm từ thẻ card hoặc ô gợi ý
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setQueryName('');
    setFilteredSuggestions([]);
    // Mặc định điền giá mong muốn thấp hơn 10% giá hiện tại
    setGiaMongMuon(Math.round(product.giaThapNhat * 0.9));
  };

  const handleTheoDoiSubmit = (e) => {
    e.preventDefault();

    if (!selectedProduct) {
      toast.warning('Vui lòng chọn một sản phẩm để theo dõi!');
      return;
    }

    if (!giaMongMuon || Number(giaMongMuon) <= 0) {
      toast.warning('Vui lòng nhập giá mong muốn hợp lệ!');
      return;
    }

    // Kiểm tra đăng nhập giả lập
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      toast.info('Bạn cần đăng nhập để lưu sản phẩm vào tài khoản theo dõi giá!');
      navigate('/dang-nhap');
      return;
    }

    // Đọc danh sách theo dõi cũ
    let dsTheoDoi = [];
    const savedDs = localStorage.getItem('dsTheoDoi');
    if (savedDs) {
      dsTheoDoi = JSON.parse(savedDs);
    }

    // Kiểm tra xem đã theo dõi chưa
    const daTonTai = dsTheoDoi.some((item) => item.id === selectedProduct.id);
    if (daTonTai) {
      toast.warning('Bạn đã theo dõi sản phẩm này trong danh sách rồi!');
      navigate('/tai-khoan/san-pham-theo-doi');
      return;
    }

    setIsSubmitting(true);

    // Giả lập độ trễ mạng API 800ms
    setTimeout(() => {
      // Tạo sản phẩm theo dõi mới
      const itemTheoDoiMoi = {
        id: selectedProduct.id,
        tenSanPham: selectedProduct.tenSanPham,
        thuongHieu: selectedProduct.thuongHieu,
        giaThapNhat: selectedProduct.giaThapNhat,
        giaMucTieu: Number(giaMongMuon),
        nguon: selectedProduct.domain || 'FPT Shop',
        ngayTheoDoi: new Date().toLocaleDateString('vi-VN'),
        datMucTieu: false,
      };

      dsTheoDoi.push(itemTheoDoiMoi);
      localStorage.setItem('dsTheoDoi', JSON.stringify(dsTheoDoi));
      
      toast.success(`Đã đăng ký theo dõi giá sản phẩm: ${selectedProduct.tenSanPham}`);
      setIsSubmitting(false);
      navigate('/tai-khoan/san-pham-theo-doi');
    }, 800);
  };

  return (
    <main className="user-page">
      <div className="user-container track-price-layout">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/">Trang chủ</Link> &gt; <span>Theo dõi giá</span>
        </div>

        <div className="track-price-grid">
          {/* Cột trái: Form thiết lập theo dõi */}
          <section className="track-price-form-card">
            <h3>Đăng ký nhận cảnh báo giá</h3>
            <p>Hệ thống tự động gửi email hoặc thông báo khi sản phẩm giảm tới mức giá bạn mong muốn.</p>

            <form onSubmit={handleTheoDoiSubmit}>
              {/* Nhập tìm sản phẩm */}
              <div className="form-group-relative">
                <label htmlFor="search-input">Nhập tên sản phẩm cần theo dõi:</label>
                <input
                  id="search-input"
                  type="text"
                  placeholder="Gõ từ khóa tìm sản phẩm (vd: Samsung)..."
                  value={queryName}
                  onChange={(e) => setQueryName(e.target.value)}
                  className="form-control"
                />

                {/* Dropdown Gợi ý kết quả tìm nhanh */}
                {filteredSuggestions.length > 0 && (
                  <ul className="quick-suggestions-dropdown">
                    {filteredSuggestions.map((item) => (
                      <li
                        key={item.id}
                        onClick={() => handleSelectProduct(item)}
                        className="suggestion-item"
                      >
                        <span className="suggestion-name">{item.tenSanPham}</span>
                        <span className="suggestion-price">{dinhDangTien(item.giaThapNhat)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Tên sản phẩm đã chọn */}
              <div className="form-group">
                <label>Sản phẩm đã chọn:</label>
                <input
                  type="text"
                  value={selectedProduct ? selectedProduct.tenSanPham : 'Chưa chọn sản phẩm (Chọn ở danh sách bên phải hoặc tìm kiếm ở trên)'}
                  disabled
                  className="form-control form-control--disabled"
                />
              </div>

              {/* Giá hiện tại */}
              <div className="form-group">
                <label>Giá hiện tại thấp nhất:</label>
                <input
                  type="text"
                  value={selectedProduct ? dinhDangTien(selectedProduct.giaThapNhat) : ''}
                  disabled
                  placeholder="Giá tự động điền"
                  className="form-control form-control--disabled"
                />
              </div>

              {/* Nhập giá mong muốn */}
              <div className="form-group">
                <label htmlFor="target-price">Nhập giá mong muốn nhận cảnh báo:</label>
                <div className="price-input-wrapper">
                  <input
                    id="target-price"
                    type="number"
                    placeholder="Ví dụ: 27000000"
                    min="0"
                    max="200000000"
                    value={giaMongMuon}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val <= 200000000) setGiaMongMuon(e.target.value);
                    }}
                    disabled={!selectedProduct}
                    className="form-control"
                    style={{ width: '100%', paddingRight: '30px' }}
                  />
                  <span className="price-input-unit">đ</span>
                </div>
                {selectedProduct && (
                  <span className="form-helper-text">
                    * Đề xuất giá mục tiêu (-10%):{' '}
                    <strong>{dinhDangTien(Math.round(selectedProduct.giaThapNhat * 0.9))}</strong>
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={!selectedProduct || isSubmitting}
                className="btn-track-submit"
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner"></span>
                    Đang kích hoạt...
                  </>
                ) : (
                  'Kích hoạt theo dõi giá'
                )}
              </button>
            </form>
          </section>

          {/* Cột phải: Danh sách sản phẩm gợi ý */}
          <section className="track-price-suggestions">
            <h3>Danh sách sản phẩm gợi ý</h3>
            <p>Nhấp nút <strong>"Chọn sản phẩm"</strong> trên thẻ để tải nhanh thông tin lên biểu mẫu.</p>

            <div className="product-offer-grid product-offer-grid--small">
              {sanPhamMau.slice(0, 6).map((item) => (
                <TheSanPhamOffer
                  key={item.id}
                  sanPham={item}
                  kieuNut="chon"
                  onSelect={handleSelectProduct}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
