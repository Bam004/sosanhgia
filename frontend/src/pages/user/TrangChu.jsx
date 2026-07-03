import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import TheSanPham from '../../components/user/TheSanPham';
import { sanPhamMau } from '../../data/duLieuSanPhamMau';

export default function TrangChu() {
  const [tuKhoa, setTuKhoa] = useState('');
  const navigate = useNavigate();

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
                placeholder="Nhập tên sản phẩm cần so sánh..."
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
              <span className="price">31.775.000đ</span>
            </div>
            <div className="hero-floating-card hero-floating-card--2">
              <span className="platform best">Tiki (Rẻ nhất)</span>
              <span className="price text-green">29.890.000đ</span>
            </div>
            <div className="hero-floating-card hero-floating-card--3">
              <span className="platform">CellphoneS</span>
              <span className="price">30.290.000đ</span>
            </div>
            <div className="hero-chart-mockup">
              <div className="bar bar-1"></div>
              <div className="bar bar-2"></div>
              <div className="bar bar-3"></div>
            </div>
          </div>
        </section>

        {/* Danh sách sản phẩm nổi bật */}
        <section className="home-featured">
          <div className="section-heading">
            <div>
              <h2>Sản phẩm nổi bật</h2>
              <p>Các sản phẩm được quan tâm nhiều nhất trên thị trường.</p>
            </div>
          </div>

          <div className="product-grid">
            {sanPhamMau.map((sanPham) => (
              <TheSanPham key={sanPham.id} sanPham={sanPham} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
