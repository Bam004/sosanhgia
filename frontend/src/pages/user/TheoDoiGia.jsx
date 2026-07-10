import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { productService } from '../../services/productService';
import { theoDoiGiaService } from '../../services/theoDoiGiaService';
import { dinhDangTien } from '../../utils/dinhDangTien';
import { SinhIconSanPham } from '../../components/user/TheSanPham';
import { buildLoginUrl } from '../../utils/returnUrl';

export default function TheoDoiGia() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const maSPCH = searchParams.get('maSPCH');
  const token = localStorage.getItem('accessToken');

  const [sanPham, setSanPham] = useState(null);
  const [giaMongMuon, setGiaMongMuon] = useState('');
  const [displayGia, setDisplayGia] = useState('');
  const [giaCu, setGiaCu] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dangTheoDoi, setDangTheoDoi] = useState(false);
  const [error, setError] = useState('');

  // mode: null (loading), 'create', 'edit', 'error'
  const [mode, setMode] = useState(null);
  const [maTheoDoi, setMaTheoDoi] = useState(null);

  useEffect(() => {
    if (!token) {
      toast.info('Vui lòng đăng nhập để sử dụng chức năng theo dõi giá');
      navigate(buildLoginUrl(maSPCH ? `/theo-doi-gia?maSPCH=${maSPCH}` : '/theo-doi-gia'));
      return;
    }

    if (!maSPCH || isNaN(Number(maSPCH)) || Number(maSPCH) <= 0) {
      setError('Mã sản phẩm không hợp lệ.');
      return;
    }

    let isCancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError('');
      setMode(null);
      setMaTheoDoi(null);
      setGiaCu(null);
      setGiaMongMuon('');
      setDisplayGia('');

      try {
        // Load product info
        const productRes = await productService.layChiTietSanPham(maSPCH);
        if (isCancelled) return;

        if (!productRes.data) {
          setError('Không tìm thấy sản phẩm.');
          setLoading(false);
          return;
        }
        setSanPham(productRes.data);

        // Check tracking state from backend
        try {
          const checkRes = await theoDoiGiaService.kiemTraTheoDoi(Number(maSPCH));
          if (isCancelled) return;

          if (checkRes.data?.isFollowing && checkRes.data?.maTheoDoi) {
            // Edit mode
            setMode('edit');
            setMaTheoDoi(checkRes.data.maTheoDoi);
            const savedPrice = checkRes.data.giaMongMuon;
            if (savedPrice && savedPrice > 0) {
              const rawStr = String(Math.round(savedPrice));
              setGiaMongMuon(rawStr);
              setDisplayGia(Number(rawStr).toLocaleString('vi-VN'));
              setGiaCu(Number(rawStr));
            }
          } else {
            // Create mode
            setMode('create');
          }
        } catch (checkErr) {
          if (isCancelled) return;
          // If check fails (e.g. 401), don't default to create - show error
          if (checkErr.response?.status === 401 || checkErr.response?.status === 403) {
            toast.info('Phiên đăng nhập đã hết hạn');
            navigate(buildLoginUrl(maSPCH ? `/theo-doi-gia?maSPCH=${maSPCH}` : '/theo-doi-gia'));
            return;
          }
          console.error('Check tracking failed:', checkErr);
          setError('Lỗi kiểm tra trạng thái theo dõi. Vui lòng thử lại.');
          setMode('error');
        }
      } catch (err) {
        if (isCancelled) return;
        console.error('Load product failed:', err);
        setError('Lỗi kết nối máy chủ API.');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadData();

    return () => { isCancelled = true; };
  }, [maSPCH, token, navigate]);

  const handleGiaChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setGiaMongMuon(rawValue);
    if (rawValue) {
      setDisplayGia(Number(rawValue).toLocaleString('vi-VN'));
    } else {
      setDisplayGia('');
    }
  };

  const xuLySubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.info('Vui lòng đăng nhập để sử dụng chức năng theo dõi giá');
      navigate(buildLoginUrl(maSPCH ? `/theo-doi-gia?maSPCH=${maSPCH}` : '/theo-doi-gia'));
      return;
    }

    if (!sanPham) {
      toast.error('Chưa có thông tin sản phẩm.');
      return;
    }

    const giaNumber = Number(giaMongMuon);
    if (!giaMongMuon || Number.isNaN(giaNumber) || giaNumber <= 0) {
      toast.info('Giá mong muốn bắt buộc phải là số lớn hơn 0');
      return;
    }

    // No-op check for edit mode: if price hasn't changed, don't send request
    if (mode === 'edit' && giaCu !== null && giaNumber === giaCu) {
      toast.info('Giá mong muốn không thay đổi');
      navigate('/tai-khoan/san-pham-theo-doi');
      return;
    }

    if (sanPham.giaThapNhat && giaNumber >= sanPham.giaThapNhat) {
      toast.warning('Mức giá mong muốn đã đạt hoặc cao hơn giá hiện tại!');
    }

    setDangTheoDoi(true);

    try {
      if (mode === 'edit' && maTheoDoi) {
        // PUT
        const res = await theoDoiGiaService.capNhatTheoDoi(maTheoDoi, {
          giaMongMuon: giaNumber,
        });

        if (res.success) {
          toast.success(res.message || 'Cập nhật giá mong muốn thành công');
          navigate('/tai-khoan/san-pham-theo-doi');
        } else {
          toast.error(res.message || 'Không thể cập nhật');
        }
      } else {
        // POST
        const res = await theoDoiGiaService.taoTheoDoiGia({
          maSPCH: Number(maSPCH),
          giaMongMuon: giaNumber,
        });

        if (res.success) {
          toast.success(res.message || 'Theo dõi sản phẩm thành công');
          navigate('/tai-khoan/san-pham-theo-doi');
        } else {
          toast.error(res.message || 'Không thể theo dõi sản phẩm');
        }
      }
    } catch (err) {
      console.error('Submit tracking failed:', err);

      if (err.response?.status === 409) {
        // Conflict: record was created between our check and POST
        // Refetch tracking state and switch to edit mode
        toast.info('Sản phẩm đã được theo dõi. Bạn có thể cập nhật giá mong muốn.');
        try {
          const recheckRes = await theoDoiGiaService.kiemTraTheoDoi(Number(maSPCH));
          if (recheckRes.data?.isFollowing && recheckRes.data?.maTheoDoi) {
            setMode('edit');
            setMaTheoDoi(recheckRes.data.maTheoDoi);
            const savedPrice = recheckRes.data.giaMongMuon;
            if (savedPrice && savedPrice > 0) {
              const rawStr = String(Math.round(savedPrice));
              setGiaCu(Number(rawStr));
            }
          }
        } catch (recheckErr) {
          console.error('Recheck failed:', recheckErr);
        }
      } else if (err.response?.status === 404 && mode === 'edit') {
        // Record was deleted during edit -> refetch -> create mode
        toast.info('Bản ghi theo dõi đã bị xóa. Bạn có thể tạo lại.');
        setMode('create');
        setMaTheoDoi(null);
        setGiaCu(null);
      } else if (err.response?.status === 422 || err.response?.status === 400) {
        toast.error(err.response?.data?.message || 'Dữ liệu không hợp lệ');
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        toast.info('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
        navigate(buildLoginUrl(maSPCH ? `/theo-doi-gia?maSPCH=${maSPCH}` : '/theo-doi-gia'));
      } else {
        toast.error(err.response?.data?.message || 'Lỗi kết nối máy chủ API');
      }
    } finally {
      setDangTheoDoi(false);
    }
  };

  const isEdit = mode === 'edit';
  const tieuDe = isEdit ? 'Cập nhật giá mong muốn' : 'Thiết lập Theo dõi giá';
  const nutSubmitLabel = isEdit ? 'Lưu thay đổi' : 'Bắt đầu theo dõi';
  const nutSubmitLoadingLabel = isEdit ? 'Đang lưu...' : 'Đang xử lý...';
  const moTaGia = isEdit
    ? 'Cập nhật mức giá mục tiêu cho sản phẩm đang theo dõi.'
    : 'Hệ thống sẽ thêm sản phẩm vào danh sách theo dõi của bạn với mức giá mục tiêu này.';

  return (
    <main className="user-page" style={{ padding: '40px 0', backgroundColor: '#f8fafc' }}>
      <div className="user-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginBottom: '24px', textAlign: 'center' }}>
            {loading ? 'Đang tải...' : tieuDe}
          </h1>

          {!maSPCH ? (
            <div style={{ textAlign: 'center', color: '#64748b' }}>
              <p>Vui lòng chọn một sản phẩm từ trang tìm kiếm để theo dõi giá.</p>
              <Link to="/tim-kiem" style={{ display: 'inline-block', marginTop: '16px', color: '#0ea5e9', fontWeight: '500' }}>
                Quay lại tìm kiếm
              </Link>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', color: '#ef4444' }}>
              <p>{error}</p>
              <button
                onClick={() => navigate(-1)}
                style={{ marginTop: '16px', padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer' }}
              >
                Quay lại
              </button>
            </div>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <span className="spinner" style={{ display: 'inline-block', width: '30px', height: '30px' }}></span>
              <p style={{ marginTop: '12px', color: '#64748b' }}>Đang tải thông tin sản phẩm...</p>
            </div>
          ) : sanPham && mode ? (
            <form onSubmit={xuLySubmit}>
              {/* Edit mode badge */}
              {isEdit && (
                <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <span style={{ color: '#0369a1', fontSize: '14px' }}>
                    {giaCu === null 
                      ? 'Sản phẩm này đã được theo dõi từ trước nhưng chưa có giá mong muốn (dữ liệu cũ). Vui lòng cập nhật giá.' 
                      : 'Bạn đã theo dõi sản phẩm này. Cập nhật giá mong muốn bên dưới.'}
                  </span>
                </div>
              )}

              {/* Product Info Readonly */}
              <div style={{ display: 'flex', gap: '16px', padding: '16px', background: '#f1f5f9', borderRadius: '8px', marginBottom: '24px' }}>
                <div style={{ width: '80px', height: '80px', flexShrink: 0, backgroundColor: '#fff', borderRadius: '8px', padding: '4px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {sanPham.hinhAnh ? (
                    <img src={sanPham.hinhAnh} alt={sanPham.tenSanPham} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <SinhIconSanPham danhMuc={sanPham.danhMuc} width={40} height={40} />
                  )}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#334155', lineHeight: '1.4' }}>
                    {sanPham.tenSanPham || sanPham.tenChuanHoa}
                  </h3>
                  {sanPham.giaThapNhat && sanPham.giaThapNhat > 0 ? (
                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                      Giá thấp nhất hiện tại:{' '}
                      <strong style={{ color: '#e11d48', fontSize: '16px' }}>{dinhDangTien(sanPham.giaThapNhat)}</strong>
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: '14px', color: '#f59e0b', fontWeight: '500' }}>
                      Chưa có dữ liệu giá hiện tại
                    </p>
                  )}
                </div>
              </div>

              {/* Target Price Input */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
                  Mức giá mong muốn (VNĐ) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={displayGia}
                    onChange={handleGiaChange}
                    placeholder="VD: 18.000.000"
                    disabled={dangTheoDoi}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '16px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#0ea5e9'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                  />
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: '500' }}>
                    đ
                  </span>
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  {moTaGia}
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => navigate(`/san-pham/${maSPCH}`)}
                  disabled={dangTheoDoi}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#475569',
                    backgroundColor: '#f1f5f9',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: dangTheoDoi ? 'not-allowed' : 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={dangTheoDoi || !giaMongMuon}
                  style={{
                    flex: 2,
                    padding: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#fff',
                    backgroundColor: (dangTheoDoi || !giaMongMuon) ? '#94a3b8' : isEdit ? '#059669' : '#0ea5e9',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: (dangTheoDoi || !giaMongMuon) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {dangTheoDoi && <span className="spinner" style={{ width: '20px', height: '20px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}></span>}
                  {dangTheoDoi ? nutSubmitLoadingLabel : nutSubmitLabel}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </main>
  );
}
