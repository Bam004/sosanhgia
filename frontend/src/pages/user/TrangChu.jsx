import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import TheSanPhamOffer from '../../components/user/TheSanPhamOffer';
import { productService } from '../../services/productService';

export default function TrangChu() {
  const [tuKhoa, setTuKhoa] = useState('');
  const [sanPhamNoiBat, setSanPhamNoiBat] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let daHuy = false;

    const fetchFeatured = async () => {
      try {
        const res = await productService.laySanPhamNoiBat();

        if (daHuy) return;

        const danhSach = Array.isArray(res?.data) ? res.data : [];
        setSanPhamNoiBat(danhSach);
      } catch (error) {
        if (!daHuy) {
          console.error('Lỗi khi tải sản phẩm nổi bật:', error);
        }
      } finally {
        if (!daHuy) {
          setLoading(false);
        }
      }
    };

    fetchFeatured();

    return () => {
      daHuy = true;
    };
  }, []);

  const xuLyTimKiem = (event) => {
    event.preventDefault();
    const q = tuKhoa.trim();

    if (q) {
      navigate(`/tim-kiem?q=${encodeURIComponent(q)}`);
    } else {
      toast.warning('Vui lòng nhập từ khóa tìm kiếm sản phẩm!');
    }
  };

  return (
    <main className="user-page">
      <div className="user-container">
        {/* Banner Hero */}
        <section className="home-hero">
          <div className="home-hero__content">
            <h1>Tìm giá tốt nhất từ nhiều sàn TMĐT</h1>
            <p>
              SoSanhGia giúp tổng hợp sản phẩm, gom nhóm các sản phẩm tương đồng,
              so sánh khoảng giá và theo dõi biến động giá theo thời gian.
            </p>

            <form className="home-hero__search" onSubmit={xuLyTimKiem}>
              <input
                type="text"
                placeholder="Nhập tên sản phẩm cần tìm kiếm..."
                value={tuKhoa}
                onChange={(event) => setTuKhoa(event.target.value)}
              />
              <button type="submit">Tìm kiếm</button>
            </form>
          </div>

          {/* Cột Phải: Đồ họa so sánh giá giả lập chuyển động */}
          <div className="home-hero__graphic">
            <div className="hero-floating-card hero-floating-card--1">
              <span className="platform">Lazada</span>
              <span className="price"></span>
            </div>
            <div className="hero-floating-card hero-floating-card--2">
              <span className="platform">Tiki </span>
              <span className="price text-green"></span>
            </div>
            <div className="hero-floating-card hero-floating-card--3">
              <span className="platform">CellphoneS</span>
              <span className="price"></span>
            </div>
             <div className="hero-floating-card hero-floating-card--4">
              <span className="platform">FPT Shop</span>
              <span className="price"></span>
            </div>
             <div className="hero-floating-card hero-floating-card--5">
              <span className="platform">HoangHaMobile</span>
              <span className="price"></span>
            </div>
            <div className="hero-chart-preview">
              <div className="bar bar-1"></div>
              <div className="bar bar-2"></div>
              <div className="bar bar-3"></div>
              <div className="bar bar-4"></div>
              <div className="bar bar-5"></div>
            </div>
          </div>
        </section>

        {/* Danh sách sản phẩm */}
        <section className="home-featured">
          <div className="section-heading">
            <div>
              <h2>Sản phẩm gợi ý</h2>
              <p>Khám phá giá tốt hôm nay.</p>
            </div>
          </div>

          {loading ? (
            <div className="product-offer-grid">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="skeleton-card">
                  <div className="skeleton skeleton-image"></div>
                  <div className="skeleton skeleton-title"></div>
                  <div className="skeleton skeleton-text" style={{ width: '40%' }}></div>
                  <div className="skeleton skeleton-text" style={{ width: '85%' }}></div>
                  <div className="skeleton skeleton-text" style={{ width: '60%', height: '36px', marginTop: '12px' }}></div>
                </div>
              ))}
            </div>
          ) : sanPhamNoiBat.length > 0 ? (
            <div className="product-offer-grid">
              {sanPhamNoiBat.map((sp) => (
                <TheSanPhamOffer
                  key={sp.maSPCH ?? sp.id}
                  sanPham={sp}
                />
              ))}
            </div>
          ) : (
            <div className="search-results__empty" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>
                Chưa có sản phẩm nổi bật
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

