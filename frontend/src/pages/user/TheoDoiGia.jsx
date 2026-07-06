import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { productService } from '../../services/productService';
import { theoDoiGiaService } from '../../services/theoDoiGiaService';
import { dinhDangTien } from '../../utils/dinhDangTien';

export default function TheoDoiGia() {
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');

  const [tuKhoa, setTuKhoa] = useState('');
  const [giaMongMuon, setGiaMongMuon] = useState('');
  const [sanPhamDaChon, setSanPhamDaChon] = useState(null);

  const [ketQuaTimKiem, setKetQuaTimKiem] = useState([]);
  const [sanPhamGoiY, setSanPhamGoiY] = useState([]);

  const [loadingTimKiem, setLoadingTimKiem] = useState(false);
  const [loadingGoiY, setLoadingGoiY] = useState(false);
  const [dangTheoDoi, setDangTheoDoi] = useState(false);
  const [daTimKiem, setDaTimKiem] = useState(false);

  useEffect(() => {
    const laySanPhamGoiY = async () => {
      if (!token) return;

      setLoadingGoiY(true);

      try {
        const res = await productService.laySanPhamNoiBat();
        setSanPhamGoiY(res.data || []);
      } catch (err) {
        console.error('Load suggested products failed:', err);
      } finally {
        setLoadingGoiY(false);
      }
    };

    laySanPhamGoiY();
  }, [token]);

  const layMaSPCH = (sanPham) => sanPham?.maSPCH || sanPham?.id;

  const chonSanPham = (sanPham) => {
    setSanPhamDaChon(sanPham);
    setTuKhoa(sanPham.tenSanPham || sanPham.tenChuanHoa || '');
    toast.success('Đã chọn sản phẩm, bạn có thể nhập giá mong muốn');
  };

  const xuLyTimKiem = async (event) => {
    event.preventDefault();

    const keyword = tuKhoa.trim();
    if (!keyword) {
      toast.info('Vui lòng nhập tên sản phẩm cần theo dõi');
      return;
    }

    setLoadingTimKiem(true);
    setDaTimKiem(true);
    setKetQuaTimKiem([]);

    try {
      const res = await productService.timKiemSanPham(keyword, false);
      setKetQuaTimKiem(res.data || []);

      if (!res.data || res.data.length === 0) {
        toast.info('Không tìm thấy sản phẩm phù hợp');
      }
    } catch (err) {
      console.error('Search product for tracking failed:', err);
      toast.error('Lỗi kết nối máy chủ API');
    } finally {
      setLoadingTimKiem(false);
    }
  };

  const xuLyTheoDoi = async () => {
    if (!token) {
      toast.info('Vui lòng đăng nhập để sử dụng chức năng theo dõi giá');
      navigate('/dang-nhap');
      return;
    }

    if (!sanPhamDaChon) {
      toast.info('Vui lòng chọn sản phẩm cần theo dõi');
      return;
    }

    const maSPCH = layMaSPCH(sanPhamDaChon);

    if (!maSPCH) {
      toast.error('Sản phẩm không có mã chuẩn hóa để theo dõi');
      return;
    }

    const giaMongMuonNumber = giaMongMuon ? Number(giaMongMuon) : null;

    if (giaMongMuon && (Number.isNaN(giaMongMuonNumber) || giaMongMuonNumber <= 0)) {
      toast.info('Giá mong muốn phải là số lớn hơn 0');
      return;
    }

    setDangTheoDoi(true);

    try {
      const res = await theoDoiGiaService.taoTheoDoiGia({
        maSPCH: Number(maSPCH),
        giaMongMuon: giaMongMuonNumber,
      });

      if (res.success) {
        toast.success(res.message || 'Theo dõi sản phẩm thành công');
        navigate('/tai-khoan/san-pham-theo-doi');
      } else {
        toast.error(res.message || 'Không thể theo dõi sản phẩm');
      }
    } catch (err) {
      console.error('Create tracking failed:', err);

      if (err.response?.status === 409) {
        toast.info('Sản phẩm này đã có trong danh sách theo dõi');
        navigate('/tai-khoan/san-pham-theo-doi');
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        toast.info('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
        navigate('/dang-nhap');
      } else {
        toast.error(err.response?.data?.message || 'Lỗi kết nối máy chủ API');
      }
    } finally {
      setDangTheoDoi(false);
    }
  };

  const renderProductMiniCard = (sanPham, actionLabel = 'Chọn theo dõi') => {
    const maSPCH = layMaSPCH(sanPham);

    return (
      <article
        key={maSPCH}
        style={{
          display: 'grid',
          gridTemplateColumns: '82px 1fr',
          gap: '14px',
          padding: '14px',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          background: '#fff'
        }}
      >
        <div
          style={{
            width: '82px',
            height: '82px',
            borderRadius: '12px',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {sanPham.hinhAnh ? (
            <img
              src={sanPham.hinhAnh}
              alt={sanPham.tenSanPham}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>No image</span>
          )}
        </div>

        <div>
          <Link
            to={`/san-pham/${maSPCH}`}
            state={{ sanPham }}
            style={{
              display: 'inline-block',
              color: '#0f172a',
              fontWeight: '800',
              fontSize: '15px',
              textDecoration: 'none',
              lineHeight: '1.35',
              marginBottom: '6px'
            }}
          >
            {sanPham.tenSanPham || sanPham.tenChuanHoa}
          </Link>

          <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>
            {sanPham.thuongHieu && <span>{sanPham.thuongHieu}</span>}
            {sanPham.dungLuong && <span> • {sanPham.dungLuong}</span>}
          </div>

          <div style={{ color: '#16a34a', fontWeight: '800', marginBottom: '10px' }}>
            {sanPham.giaThapNhat ? `Từ ${dinhDangTien(sanPham.giaThapNhat)}` : 'Chưa có giá'}
          </div>

          <button
            type="button"
            onClick={() => chonSanPham(sanPham)}
            style={{
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '700'
            }}
          >
            {actionLabel}
          </button>
        </div>
      </article>
    );
  };

  if (!token) {
    return (
      <main className="user-page" style={{ padding: '60px 20px', textAlign: 'center', background: '#f8fafc', minHeight: '60vh' }}>
        <div className="user-container">
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#334155', marginBottom: '16px' }}>
            Vui lòng đăng nhập
          </h2>
          <p style={{ color: '#64748b', maxWidth: '600px', margin: '0 auto 32px auto', lineHeight: '1.6' }}>
            Bạn cần đăng nhập để sử dụng chức năng theo dõi giá.
          </p>
          <Link
            to="/dang-nhap"
            style={{
              display: 'inline-block',
              background: 'var(--color-primary)',
              color: '#fff',
              padding: '10px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500'
            }}
          >
            Đăng nhập
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="user-page" style={{ padding: '60px 20px', background: '#f8fafc', minHeight: '70vh' }}>
      <div className="user-container">
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginBottom: '10px' }}>
            Theo dõi giá sản phẩm
          </h1>
          <p style={{ color: '#64748b', maxWidth: '720px', margin: '0 auto', lineHeight: '1.7' }}>
            Chọn sản phẩm cần theo dõi và nhập mức giá mong muốn. Sản phẩm sau khi thêm sẽ xuất hiện trong mục Sản phẩm theo dõi.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 0.9fr) minmax(360px, 1.1fr)',
            gap: '24px',
            alignItems: 'start'
          }}
        >
          <section
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '18px',
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
              position: 'sticky',
              top: '90px'
            }}
          >
            <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>
              Thông tin theo dõi
            </h2>
            <p style={{ color: '#64748b', marginBottom: '20px', lineHeight: '1.6' }}>
              Bạn có thể tìm sản phẩm hoặc chọn nhanh từ danh sách gợi ý bên phải.
            </p>

            <form onSubmit={xuLyTimKiem} style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                Tên sản phẩm
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={tuKhoa}
                  onChange={(event) => setTuKhoa(event.target.value)}
                  placeholder="Ví dụ: iPhone 15, Samsung A55..."
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={loadingTimKiem}
                  style={{
                    background: '#0f172a',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    cursor: loadingTimKiem ? 'not-allowed' : 'pointer',
                    fontWeight: '800',
                    opacity: loadingTimKiem ? 0.75 : 1
                  }}
                >
                  {loadingTimKiem ? 'Tìm...' : 'Tìm'}
                </button>
              </div>
            </form>

            {daTimKiem && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#334155', marginBottom: '10px' }}>
                  Kết quả tìm kiếm
                </h3>

                {loadingTimKiem ? (
                  <p style={{ color: '#64748b' }}>Đang tìm sản phẩm...</p>
                ) : ketQuaTimKiem.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                    {ketQuaTimKiem.slice(0, 5).map((sanPham) => {
                      const maSPCH = layMaSPCH(sanPham);
                      const dangChon = layMaSPCH(sanPhamDaChon) === maSPCH;

                      return (
                        <button
                          key={maSPCH}
                          type="button"
                          onClick={() => chonSanPham(sanPham)}
                          style={{
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center',
                            textAlign: 'left',
                            background: dangChon ? '#eff6ff' : '#f8fafc',
                            border: dangChon ? '1px solid #2563eb' : '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          <div
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '8px',
                              background: '#fff',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {sanPham.hinhAnh ? (
                              <img src={sanPham.hinhAnh} alt={sanPham.tenSanPham} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '10px' }}>No</span>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px' }}>
                              {sanPham.tenSanPham || sanPham.tenChuanHoa}
                            </div>
                            <div style={{ color: '#16a34a', fontWeight: '700', fontSize: '13px' }}>
                              {sanPham.giaThapNhat ? dinhDangTien(sanPham.giaThapNhat) : 'Chưa có giá'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: '#64748b' }}>Không tìm thấy sản phẩm phù hợp.</p>
                )}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                Sản phẩm đã chọn
              </label>

              {sanPhamDaChon ? (
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '12px',
                    border: '1px solid #bbf7d0',
                    background: '#f0fdf4',
                    borderRadius: '12px'
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '10px',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}
                  >
                    {sanPhamDaChon.hinhAnh ? (
                      <img
                        src={sanPhamDaChon.hinhAnh}
                        alt={sanPhamDaChon.tenSanPham}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '11px' }}>No image</span>
                    )}
                  </div>

                  <div>
                    <div style={{ fontWeight: '900', color: '#0f172a', marginBottom: '4px' }}>
                      {sanPhamDaChon.tenSanPham || sanPhamDaChon.tenChuanHoa}
                    </div>
                    <div style={{ color: '#16a34a', fontWeight: '800' }}>
                      {sanPhamDaChon.giaThapNhat ? `Giá hiện tại từ ${dinhDangTien(sanPhamDaChon.giaThapNhat)}` : 'Chưa có giá'}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '16px',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '12px',
                    color: '#64748b',
                    background: '#f8fafc'
                  }}
                >
                  Chưa chọn sản phẩm nào.
                </div>
              )}
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                Giá mong muốn
              </label>
              <input
                type="number"
                value={giaMongMuon}
                onChange={(event) => setGiaMongMuon(event.target.value)}
                placeholder="Ví dụ: 22000000"
                min="0"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '8px' }}>
                Có thể bỏ trống nếu bạn chỉ muốn lưu sản phẩm vào danh sách theo dõi.
              </p>
            </div>

            <button
              type="button"
              disabled={dangTheoDoi}
              onClick={xuLyTheoDoi}
              style={{
                width: '100%',
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                padding: '13px 18px',
                borderRadius: '12px',
                cursor: dangTheoDoi ? 'not-allowed' : 'pointer',
                fontWeight: '900',
                fontSize: '16px',
                opacity: dangTheoDoi ? 0.75 : 1
              }}
            >
              {dangTheoDoi ? 'Đang thêm vào theo dõi...' : 'Theo dõi giá'}
            </button>

            <Link
              to="/tai-khoan/san-pham-theo-doi"
              style={{
                display: 'block',
                textAlign: 'center',
                marginTop: '14px',
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontWeight: '700'
              }}
            >
              Xem sản phẩm đang theo dõi
            </Link>
          </section>

          <section
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '18px',
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', marginBottom: '6px' }}>
                  Sản phẩm gợi ý
                </h2>
                <p style={{ color: '#64748b', margin: 0 }}>
                  Chọn nhanh một sản phẩm để đưa vào form theo dõi bên trái.
                </p>
              </div>
            </div>

            {loadingGoiY ? (
              <div style={{ color: '#64748b' }}>Đang tải sản phẩm gợi ý...</div>
            ) : sanPhamGoiY.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                {sanPhamGoiY.slice(0, 8).map((sanPham) => renderProductMiniCard(sanPham))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                Chưa có sản phẩm gợi ý.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
