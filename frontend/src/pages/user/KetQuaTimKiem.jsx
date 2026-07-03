import { useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import BoLocSanPham from '../../components/user/BoLocSanPham';
import TheSanPhamOffer from '../../components/user/TheSanPhamOffer';
import { sanPhamMau } from '../../data/duLieuSanPhamMau';

export default function KetQuaTimKiem() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const danhMucParam = searchParams.get('danh-muc') || '';

  const [danhSachHienThi, setDanhSachHienThi] = useState([]);
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [loading, setLoading] = useState(false);
  const sanPhamMoiTrang = 6;

  // Lọc sản phẩm theo từ khóa 'q' hoặc danh mục từ URL ban đầu
  useEffect(() => {
    setLoading(true);
    let ketQua = [...sanPhamMau];

    // Lọc theo từ khóa
    if (q) {
      const queryLower = q.toLowerCase();
      ketQua = ketQua.filter(
        (sp) =>
          sp.tenSanPham.toLowerCase().includes(queryLower) ||
          sp.thuongHieu.toLowerCase().includes(queryLower)
      );
    }

    // Lọc theo danh mục
    if (danhMucParam) {
      ketQua = ketQua.filter(
        (sp) => sp.danhMuc === danhMucParam
      );
    }

    const timer = setTimeout(() => {
      setDanhSachHienThi(ketQua);
      setTrangHienTai(1);
      setLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [q, danhMucParam]);

  // Hàm xử lý bộ lọc từ component BoLocSanPham
  const xuLyApDungBoLoc = (filters) => {
    setLoading(true);
    let ketQua = [...sanPhamMau];

    // Lọc theo từ khóa ban đầu
    if (q) {
      const queryLower = q.toLowerCase();
      ketQua = ketQua.filter(
        (sp) =>
          sp.tenSanPham.toLowerCase().includes(queryLower) ||
          sp.thuongHieu.toLowerCase().includes(queryLower)
      );
    }

    // Lọc theo danh mục
    if (danhMucParam) {
      ketQua = ketQua.filter(
        (sp) => sp.danhMuc === danhMucParam
      );
    }

    // 1. Lọc theo Sàn TMĐT
    const activeShorthands = Object.keys(filters.san).filter((key) => filters.san[key]);
    if (activeShorthands.length > 0) {
      ketQua = ketQua.filter((sp) => {
        return sp.sanDangBan.some((s) => {
          const sLower = s.toLowerCase().replace(/\s/g, '');
          return activeShorthands.includes(sLower);
        });
      });
    }

    // 1.5 Lọc theo Thương hiệu
    const activeBrands = Object.keys(filters.thuongHieu).filter((key) => filters.thuongHieu[key]);
    if (activeBrands.length > 0) {
      ketQua = ketQua.filter((sp) => {
        const brandLower = sp.thuongHieu.toLowerCase().replace(/\s/g, '');
        return activeBrands.includes(brandLower);
      });
    }

    // 2. Lọc theo Khoảng giá Checkbox
    const activePrices = Object.keys(filters.mucGia).filter((key) => filters.mucGia[key]);
    if (activePrices.length > 0) {
      ketQua = ketQua.filter((sp) => {
        const gia = sp.giaThapNhat;
        return (
          (activePrices.includes('under2') && gia < 2000000) ||
          (activePrices.includes('between2_5') && gia >= 2000000 && gia <= 5000000) ||
          (activePrices.includes('between5_15') && gia >= 5000000 && gia <= 15000000) ||
          (activePrices.includes('over15') && gia > 15000000)
        );
      });
    }

    // 3. Lọc theo Khoảng giá Nhập tay
    if (filters.giaMin) {
      ketQua = ketQua.filter((sp) => sp.giaThapNhat >= Number(filters.giaMin));
    }
    if (filters.giaMax) {
      ketQua = ketQua.filter((sp) => sp.giaThapNhat <= Number(filters.giaMax));
    }

    // 4. Lọc theo Đánh giá
    if (filters.danhGia) {
      ketQua = ketQua.filter((sp) => sp.danhGia >= filters.danhGia);
    }

    setTimeout(() => {
      setDanhSachHienThi(ketQua);
      setTrangHienTai(1);
      setLoading(false);
    }, 500);
  };

  // Phân trang
  const handlePageChange = (newPage) => {
    setTrangHienTai(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tongSoTrang = Math.ceil(danhSachHienThi.length / sanPhamMoiTrang);
  const chiSoBatDau = (trangHienTai - 1) * sanPhamMoiTrang;
  const sanPhamPhanTrang = danhSachHienThi.slice(chiSoBatDau, chiSoBatDau + sanPhamMoiTrang);

  return (
    <main className="user-page">
      <div className="user-container search-layout">
        {/* Cột Trái - Bộ lọc */}
        <BoLocSanPham onFilterChange={xuLyApDungBoLoc} />

        {/* Cột Phải - Danh sách kết quả */}
        <section className="search-results">
          {/* Breadcrumb */}
          <div className="breadcrumb">
            Trang chủ &gt; Kết quả tìm kiếm {q && `> "${q}"`} {danhMucParam && `> ${danhMucParam}`}
          </div>

          <div className="search-results__header">
            <h2>Kết quả tìm kiếm siêu tổng hợp</h2>
            <p>
              Tìm thấy <strong>{danhSachHienThi.length}</strong> sản phẩm{' '}
              {q ? `cho từ khóa "${q}"` : danhMucParam ? `thuộc danh mục "${danhMucParam}"` : ''}
            </p>
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
          ) : sanPhamPhanTrang.length > 0 ? (
            <>
              {/* Lưới sản phẩm */}
              <div className="product-offer-grid">
                {sanPhamPhanTrang.map((sanPham) => (
                  <TheSanPhamOffer key={sanPham.id} sanPham={sanPham} />
                ))}
              </div>

              {/* Phân trang tĩnh */}
              {tongSoTrang > 1 && (
                <div className="pagination">
                  <button
                    disabled={trangHienTai === 1}
                    onClick={() => handlePageChange(trangHienTai - 1)}
                    className="pagination__btn"
                  >
                    Trước
                  </button>
                  {Array.from({ length: tongSoTrang }).map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => handlePageChange(i + 1)}
                      className={`pagination__btn ${trangHienTai === i + 1 ? 'active' : ''}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={trangHienTai === tongSoTrang}
                    onClick={() => handlePageChange(trangHienTai + 1)}
                    className="pagination__btn"
                  >
                    Sau
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="search-results__empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <h3>Không tìm thấy sản phẩm nào khớp</h3>
              <p>Vui lòng thử tìm kiếm lại với từ khóa khác hoặc điều chỉnh bộ lọc.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
