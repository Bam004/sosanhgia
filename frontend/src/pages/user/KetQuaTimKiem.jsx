import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import BoLocSanPham from '../../components/user/BoLocSanPham';
import TheSanPhamOffer from '../../components/user/TheSanPhamOffer';
import { productService } from '../../services/productService';

const SEARCH_JOB_DEDUP_MS = 30000;
const searchJobPromiseCache = new Map();

function taoSearchJobMotLan(keyword) {
  const jobKey = keyword.trim().toLowerCase();
  const cached = searchJobPromiseCache.get(jobKey);

  if (cached && Date.now() - cached.createdAt < SEARCH_JOB_DEDUP_MS) {
    return cached.promise;
  }

  const promise = productService.taoSearchJob(keyword).catch((error) => {
    searchJobPromiseCache.delete(jobKey);
    throw error;
  });

  searchJobPromiseCache.set(jobKey, {
    createdAt: Date.now(),
    promise,
  });

  return promise;
}

export default function KetQuaTimKiem() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const danhMucParam = searchParams.get('danh-muc') || '';

  const [danhSachGoc, setDanhSachGoc] = useState([]);
  const [danhSachHienThi, setDanhSachHienThi] = useState([]);
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [loading, setLoading] = useState(false);
  const [dangCapNhat, setDangCapNhat] = useState(false);
  const [error, setError] = useState(null);
  const [jobError, setJobError] = useState(null);
  const [boLocActive, setBoLocActive] = useState({});
  const [sortOrder, setSortOrder] = useState('asc');
  const [retryKey, setRetryKey] = useState(0);

  const sanPhamMoiTrang = 6;
  const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;

  // Hàm chuẩn hóa chuỗi để so sánh (loại bỏ dấu, khoảng trắng, chữ hoa/thường)
  const normalizeString = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/Ä‘/g, 'd')
      .replace(/\s+/g, '')
      .trim();
  };

  // 1. Gọi API khi keyword hoặc danh mục thay đổi
  // Quy trình UX:
  // - Ưu tiên lấy cache DB trước để người dùng có kết quả nhanh.
  // - Sau đó mới chạy realtime scrape để cập nhật dữ liệu mới.
  // 1. ọi API khi keyword hoặc danh mục thay đổi
  // Quy trình mới:
  // - Lay cache DB truoc de nguoi dung co ket qua nhanh.
  // - Tao Search Job de backend scrape nen.
  // - Polling trang thai job.
  // - Khi job completed thi goi lai cache DB de lay du lieu moi nhat.
  useEffect(() => {
    let isCancelled = false;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const locTheoDanhMuc = (data) => {
      if (!danhMucParam) return data;
      return data.filter(sp => sp.danhMuc === danhMucParam);
    };

    const luuSessionCache = (cacheKey, data) => {
      try {
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            timestamp: Date.now(),
            data
          })
        );
      } catch (cacheError) {
        console.warn('Search cache write failed:', cacheError);
      }
    };

    const docSessionCache = (cacheKey) => {
      try {
        const cached = sessionStorage.getItem(cacheKey);

        if (!cached) return null;

        const parsed = JSON.parse(cached);
        const isFresh = Date.now() - parsed.timestamp < SEARCH_CACHE_TTL_MS;

        if (isFresh && Array.isArray(parsed.data) && parsed.data.length > 0) {
          return parsed.data;
        }
      } catch (cacheError) {
        console.warn('Search session cache read failed:', cacheError);
      }

      return null;
    };

    const layCacheTuDb = async (keyword, cacheKey) => {
      const cacheRes = await productService.timKiemSanPham(keyword, false, {});
      
      if (cacheRes.errorMessage) {
        throw new Error(cacheRes.errorMessage);
      }

      const cacheData = locTheoDanhMuc(cacheRes.data || []);

      if (cacheData.length > 0) {
        luuSessionCache(cacheKey, cacheData);
      }

      return {
        data: cacheData,
        cache_hit: cacheRes.cache_hit
      };
    };

    const pollSearchJob = async (jobId) => {
      for (let attempt = 0; attempt < 60; attempt += 1) {
        if (isCancelled) return null;

        const statusRes = await productService.layTrangThaiSearchJob(jobId);

        if (statusRes.errorMessage) {
          throw new Error(statusRes.errorMessage);
        }

        const jobData = statusRes.data;

        if (!jobData) {
          throw new Error('Không nhận được trạng thái tác vụ tìm kiếm.');
        }

        if (jobData.status === 'completed' || jobData.status === 'failed') {
          return jobData;
        }

        await sleep(2000);
      }

      throw new Error('Tác vụ cập nhật dữ liệu mất quá nhiều thời gian.');
    };

    const fetchResults = async () => {
      const keyword = q || danhMucParam;
      const cacheKey = `user-search:${keyword}`;

      if (!keyword) {
        setDanhSachGoc([]);
        setDanhSachHienThi([]);
        setLoading(false);
        setDangCapNhat(false);
        return;
      }

      setDanhSachGoc([]);
      setDanhSachHienThi([]);
      setBoLocActive({});
      setSortOrder('asc');
      setTrangHienTai(1);
      setError(null);
      setJobError(null);

      if (retryKey === 0) {
        const sessionData = docSessionCache(cacheKey);

        if (sessionData && !isCancelled) {
          setDanhSachGoc(sessionData);
          setDanhSachHienThi(sessionData);
          setLoading(false);
        }
      }

      setLoading(true);

      let hasVisibleCache = false;

      try {
        const cacheResult = await layCacheTuDb(keyword, cacheKey);
        if (isCancelled) return;

        const cacheData = cacheResult.data;
        const isCacheHit = cacheResult.cache_hit;

        if (cacheData.length > 0) {
          hasVisibleCache = true;
          setDanhSachGoc(cacheData);
          setLoading(false);
        }

        if (isCacheHit && cacheData.length > 0) {
          setDangCapNhat(false);
          return;
        }

        if (cacheData.length === 0) {
          setLoading(true);
        }

        setDangCapNhat(true);

        const jobRes = await taoSearchJobMotLan(keyword);
        if (isCancelled) return;

        if (jobRes.errorMessage || !jobRes.data?.job_id) {
          throw new Error(jobRes.errorMessage || 'Không tạo được tác vụ cập nhật dữ liệu.');
        }

        const completedJob = await pollSearchJob(jobRes.data.job_id);
        if (isCancelled || !completedJob) return;

        if (completedJob.status === 'failed') {
          throw new Error(completedJob.error || 'Tác vụ cập nhật dữ liệu thất bại.');
        }

        const latestResult = await layCacheTuDb(keyword, cacheKey);
        if (isCancelled) return;
        
        const latestData = latestResult.data;

        if (!isCancelled) {
          if (latestData.length > 0) {
            setDanhSachGoc(latestData);
            setError(null);
            setJobError(null);
          } else if (cacheData.length === 0) {
            setDanhSachGoc([]);
            setError(null);
            setJobError(null);
          }
        }
      } catch (err) {
        console.error(err);

        if (!isCancelled) {
          const message = err.message || 'Lỗi kết nối máy chủ API.';

          // Phân biệt lỗi Job (Cập nhật nền) và lỗi Network API
          const isJobError = message.includes('Tác vụ cập nhật') || message.includes('Không tạo được') || message.includes('trạng thái tác vụ');

          if (isJobError) {
            setJobError(message);
            // Nếu là lỗi job (cập nhật nền), giữ dữ liệu cũ, chỉ báo vàng nếu đã có dữ liệu
            if (hasVisibleCache) {
              toast.warn('Quá trình cập nhật dữ liệu mới gặp sự cố. Bạn đang xem kết quả đã lưu.');
            } else {
              // Nếu chưa có kết quả (lần đầu rỗng) mà scrape lỗi, thì nó là error state
              setError(message);
            }
          } else {
            // Lỗi Network hoặc Backend thật sự
            if (hasVisibleCache) {
              toast.error(message);
            } else {
              setError(message);
              setDanhSachGoc([]);
            }
          }
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setDangCapNhat(false);
        }
      }
    };

    fetchResults();

    return () => {
      isCancelled = true;
    };
  }, [q, danhMucParam, retryKey]);

  useEffect(() => {
    let ketQua = [...danhSachGoc];

    // Lọc theo Sản TMĐT (Chuẩn hóa)
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

    // Lọc theo khoảng giá Checkbox
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

    // Lọc theo khoảng giá nhập tay
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
        {/* Cột trái - Bộ lọc */}
        <BoLocSanPham onFilterChange={xuLyApDungBoLoc} danhSachGoc={danhSachGoc} />

        {/* Cột phải - Danh sách kết quả */}
        <section className="search-results">
          {/* Breadcrumb */}
          <div className="breadcrumb">
            Trang chủ &gt; Kết quả tìm kiếm {q && `> "${q}"`} {danhMucParam && `> ${danhMucParam}`}
          </div>

          <div className="search-results__header">
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h2>Kết quả tìm kiếm siêu thị</h2>
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

          {dangCapNhat && danhSachHienThi.length > 0 && (
            <div
              style={{
                margin: '0 0 16px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '14px'
              }}
            >
              Đang kiểm tra và cập nhật thêm dữ liệu mới từ các nguồn.
            </div>
          )}

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
                  Đang thu thập và tổng hợp dữ liệu mới từ các nguồn bán. Quá trình này có thể mất vài giây ...
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
              {/* Liệt kê sản phẩm */}
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

