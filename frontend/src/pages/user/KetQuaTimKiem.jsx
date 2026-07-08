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

  const [danhSachGoc, setDanhSachGoc] = useState([]);
  const [danhSachHienThi, setDanhSachHienThi] = useState([]);
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [boLocActive, setBoLocActive] = useState({});
  const [sortOrder, setSortOrder] = useState('asc');
  const [retryKey, setRetryKey] = useState(0);

  const sanPhamMoiTrang = 6;

  // Hàm chuẩn hóa tên chuỗi để đối sánh
  const normalizeString = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/\s+/g, '')
      .trim();
  };

  // 1. Chỉ gọi API khi keyword hoặc danh mục thay đổi
  useEffect(() => {
    const fetchResults = async () => {
      // Clear data cũ ngay lập tức
      setDanhSachGoc([]);
      setDanhSachHienThi([]);
      setBoLocActive({});
      setSortOrder('asc');
      setTrangHienTai(1);

      setLoading(true);
      setError(null);
      try {
        const res = await productService.timKiemSanPham(q || danhMucParam, true, {});

        if (res.errorMessage) {
          setError(res.errorMessage);
          toast.error(res.errorMessage);
        }

        let data = res.data || [];

        // Lọc thêm theo danh mục nếu có tham số từ URL
        if (danhMucParam) {
          data = data.filter(sp => sp.danhMuc === danhMucParam);
        }

        setDanhSachGoc(data);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Lỗi kết nối máy chủ API.');
        toast.error(err.message || 'Lỗi kết nối máy chủ API.');
        setDanhSachGoc([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [q, danhMucParam, retryKey]);

  // 2. Chạy bộ lọc cục bộ trực tiếp trên danh sách gốc khi boLocActive hoặc danhSachGoc thay đổi
  useEffect(() => {
    let ketQua = [...danhSachGoc];

    // Lọc theo Sàn TMĐT (Chuẩn hóa)
    const activeShorthands = Object.keys(boLocActive.san || {})
      .filter((key) => boLocActive.san[key])
      .map(normalizeString);

    if (activeShorthands.length > 0) {
      ketQua = ketQua.filter((sp) => {
        const platforms = [];
        if (sp.sanDangBan) {
          if (Array.isArray(sp.sanDangBan)) platforms.push(...sp.sanDangBan);
          else platforms.push(sp.sanDangBan);
        }
        if (sp.nguon) {
          if (Array.isArray(sp.nguon)) platforms.push(...sp.nguon);
          else platforms.push(sp.nguon);
        }
        if (sp.sources) {
          if (Array.isArray(sp.sources)) platforms.push(...sp.sources);
          else platforms.push(sp.sources);
        }
        if (sp.items) {
          sp.items.forEach(item => { if (item.sanTMDT) platforms.push(item.sanTMDT); });
        }
        if (sp.offers) {
          sp.offers.forEach(offer => { if (offer.sanTMDT) platforms.push(offer.sanTMDT); });
        }

        return platforms.some((p) => activeShorthands.includes(normalizeString(p)));
      });
    }

    // Lọc theo Thương hiệu (Chuẩn hóa)
    const activeBrands = Object.keys(boLocActive.thuongHieu || {})
      .filter((key) => boLocActive.thuongHieu[key])
      .map(normalizeString);

    if (activeBrands.length > 0) {
      ketQua = ketQua.filter((sp) => {
        const brand = sp.thuongHieu || sp.brand || sp.attributes?.brand || (sp.items && sp.items[0]?.attributes?.brand) || '';
        return activeBrands.includes(normalizeString(brand));
      });
    }

    // Lọc theo Khoảng giá Checkbox
    const activePrices = Object.keys(boLocActive.mucGia || {}).filter((key) => boLocActive.mucGia[key]);
    if (activePrices.length > 0) {
      ketQua = ketQua.filter((sp) => {
        const gia = sp.giaThapNhat || 0;
        return (
          (activePrices.includes('under2') && gia < 2000000) ||
          (activePrices.includes('between2_5') && gia >= 2000000 && gia <= 5000000) ||
          (activePrices.includes('between5_15') && gia >= 5000000 && gia <= 15000000) ||
          (activePrices.includes('over15') && gia > 15000000)
        );
      });
    }

    // Lọc theo Khoảng giá Nhập tay
    if (boLocActive.giaMin) {
      ketQua = ketQua.filter((sp) => (sp.giaThapNhat || 0) >= Number(boLocActive.giaMin));
    }
    if (boLocActive.giaMax) {
      ketQua = ketQua.filter((sp) => (sp.giaThapNhat || 0) <= Number(boLocActive.giaMax));
    }

    // Lọc theo Đánh giá
    if (boLocActive.danhGia) {
      ketQua = ketQua.filter((sp) => (sp.danhGia || 0) >= boLocActive.danhGia);
    }

    // Sắp xếp
    if (sortOrder === 'asc') {
      ketQua.sort((a, b) => {
        const giaA = a.giaThapNhat || Infinity;
        const giaB = b.giaThapNhat || Infinity;
        return giaA - giaB;
      });
    } else if (sortOrder === 'desc') {
      ketQua.sort((a, b) => {
        const giaA = a.giaThapNhat || -Infinity;
        const giaB = b.giaThapNhat || -Infinity;
        return giaB - giaA;
      });
    }

    setDanhSachHienThi(ketQua);
    setTrangHienTai(1);
  }, [danhSachGoc, boLocActive, sortOrder]);

  // Hàm xử lý bộ lọc từ component BoLocSanPham
  const xuLyApDungBoLoc = (filters) => {
    setBoLocActive(filters);
  };

  const handleRetry = () => {
    setRetryKey((current) => current + 1);
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
        <BoLocSanPham onFilterChange={xuLyApDungBoLoc} danhSachGoc={danhSachGoc} />

        {/* Cột Phải - Danh sách kết quả */}
        <section className="search-results">
          {/* Breadcrumb */}
          <div className="breadcrumb">
            Trang chủ &gt; Kết quả tìm kiếm {q && `> "${q}"`} {danhMucParam && `> ${danhMucParam}`}
          </div>

          <div className="search-results__header">
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h2>Kết quả tìm kiếm siêu tổng hợp</h2>
              {error && !loading && (
                <div style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</div>
              )}
            </div>
            {!loading && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                <p>
                  Tìm thấy <strong>{danhSachHienThi.length}</strong> sản phẩm{' '}
                  {q ? `cho từ khóa "${q}"` : danhMucParam ? `thuộc danh mục "${danhMucParam}"` : ''}
                </p>
                {sanPhamPhanTrang.length > 0 && (
                  <div className="sort-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label htmlFor="sortOrder" style={{ fontWeight: '500' }}>Sắp xếp:</label>
                    <select
                      id="sortOrder"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="asc">Giá tăng dần</option>
                      <option value="desc">Giá giảm dần</option>
                    </select>
                  </div>
                )}
              </div>
            )}
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
            <>
              <div className="search-loading" style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ color: '#64748b', fontSize: '15px' }}>
                  Đang tìm kiếm sản phẩm. Nếu từ khóa chưa có trong hệ thống, quá trình này có thể mất vài giây để cào dữ liệu mới...
                </p>
              </div>
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
            </>
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
              <h3>Chưa tìm thấy sản phẩm phù hợp</h3>
              <p>Vui lòng thử tìm kiếm lại với từ khóa khác hoặc điều chỉnh bộ lọc.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
