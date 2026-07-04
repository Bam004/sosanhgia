import { useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import BoLocSanPham from '../../components/user/BoLocSanPham';
import TheSanPhamOffer from '../../components/user/TheSanPhamOffer';
import { productService } from '../../services/productService';

export default function KetQuaTimKiem() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const danhMucParam = searchParams.get('danh-muc') || '';

  const [danhSachHienThi, setDanhSachHienThi] = useState([]);
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState(null);
  const [boLocActive, setBoLocActive] = useState({});

  const sanPhamMoiTrang = 6;

  // Lọc sản phẩm từ API hoặc mock data
  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const parsedFilters = {
          website: boLocActive.san ? Object.keys(boLocActive.san)
            .filter(key => boLocActive.san[key])
            .map(key => {
              if (key === 'fptshop') return 'FPT Shop';
              if (key === 'cellphones') return 'CellphoneS';
              if (key === 'hoanghamobile') return 'HoangHa Mobile';
              return key.charAt(0).toUpperCase() + key.slice(1);
            }) : [],
          brand: boLocActive.thuongHieu ? Object.keys(boLocActive.thuongHieu)
            .filter(key => boLocActive.thuongHieu[key])
            .map(key => {
              if (key === 'apple') return 'Apple';
              if (key === 'samsung') return 'Samsung';
              if (key === 'lenovo') return 'Lenovo';
              if (key === 'epower') return 'E-Power';
              return key;
            }) : [],
          giaMin: boLocActive.giaMin || null,
          giaMax: boLocActive.giaMax || null,
          mucGia: boLocActive.mucGia ? Object.keys(boLocActive.mucGia).filter(key => boLocActive.mucGia[key]) : [],
          danhGia: boLocActive.danhGia || null
        };

        const res = await productService.timKiemSanPham(q || danhMucParam, parsedFilters);
        let data = res.data || [];

        // Lọc thêm theo danh mục nếu có tham số từ URL
        if (danhMucParam) {
          data = data.filter(sp => sp.danhMuc === danhMucParam);
        }

        setDanhSachHienThi(data);
        setIsOffline(res.isOffline);

        // Hiển thị toast cảnh báo nếu đang ở chế độ offline
        if (res.isOffline) {
          toast.warning('Đang hiển thị dữ liệu offline do không kết nối được máy chủ API!');
        }
      } catch (err) {
        console.error(err);
        setError('Lỗi kết nối máy chủ API và không có dữ liệu dự phòng.');
        toast.error('Lỗi kết nối máy chủ API.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [q, danhMucParam, boLocActive]);

  // Hàm xử lý bộ lọc từ component BoLocSanPham
  const xuLyApDungBoLoc = (filters) => {
    setBoLocActive(filters);
    setTrangHienTai(1);
  };

  const handleRetry = () => {
    setBoLocActive({ ...boLocActive });
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
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h2>Kết quả tìm kiếm siêu tổng hợp</h2>
              {isOffline && (
                <span className="badge-offline" style={{ background: '#fef3c7', color: '#d97706', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                  Chế độ Offline
                </span>
              )}
            </div>
            <p>
              Tìm thấy <strong>{danhSachHienThi.length}</strong> sản phẩm{' '}
              {q ? `cho từ khóa "${q}"` : danhMucParam ? `thuộc danh mục "${danhMucParam}"` : ''}
            </p>
          </div>

          {error && danhSachHienThi.length === 0 ? (
            <div className="search-results__error" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <h3>Đã xảy ra lỗi kết nối</h3>
              <p style={{ color: '#64748b', marginBottom: '16px' }}>{error}</p>
              <button className="btn-retry" onClick={handleRetry} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>Thử lại</button>
            </div>
          ) : loading ? (
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
