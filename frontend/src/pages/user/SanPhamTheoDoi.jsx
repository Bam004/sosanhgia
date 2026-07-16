import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { theoDoiGiaService } from '../../services/theoDoiGiaService';
import { dinhDangTien } from '../../utils/dinhDangTien';

export default function SanPhamTheoDoi() {
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');
  const userStr = localStorage.getItem('user');

  let user = null;

  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch {
    user = null;
  }

  const xuLyDangXuat = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');

    toast.success('Đăng xuất thành công');

    navigate('/dang-nhap');
  };

  const [danhSach, setDanhSach] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState(null);
  const [dangXuLyId, setDangXuLyId] = useState(null);
  const [chinhSuaId, setChinhSuaId] = useState(null);
  const [giaMoi, setGiaMoi] = useState('');
  const [trangHienTai, setTrangHienTai] = useState(1);
  const soSanPhamMoiTrang = 5;

  const layDanhSachTheoDoi = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const res = await theoDoiGiaService.layDanhSachTheoDoi();

      if (res.success) {
        setDanhSach(res.data || []);
      } else {
        setError(res.message || 'Không thể tải danh sách sản phẩm theo dõi');
      }
    } catch (err) {
      console.error('Load watched products failed:', err);
      setError('Lỗi kết nối máy chủ API');
      toast.error('Lỗi kết nối máy chủ API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    layDanhSachTheoDoi();
  }, []);

  const tongSoTrang = Math.max(
    1,
    Math.ceil(danhSach.length / soSanPhamMoiTrang)
  );

  const viTriBatDau = (trangHienTai - 1) * soSanPhamMoiTrang;

  const danhSachTheoTrang = danhSach.slice(
    viTriBatDau,
    viTriBatDau + soSanPhamMoiTrang
  );

  useEffect(() => {
    if (trangHienTai > tongSoTrang) {
      setTrangHienTai(tongSoTrang);
    }
  }, [trangHienTai, tongSoTrang]);

  const xuLyChuyenTrang = (trangMoi) => {
    if (trangMoi < 1 || trangMoi > tongSoTrang) return;

    setTrangHienTai(trangMoi);
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const xuLyHuyTheoDoi = async (maTheoDoi) => {
    const dongY = window.confirm('Bạn có chắc muốn hủy theo dõi sản phẩm này không?');
    if (!dongY) return;

    setDangXuLyId(maTheoDoi);

    try {
      const res = await theoDoiGiaService.huyTheoDoi(maTheoDoi);

      if (res.success) {
        setDanhSach((prev) => prev.filter((item) => item.maTheoDoi !== maTheoDoi));
        toast.success(res.message || 'Đã hủy theo dõi sản phẩm');
      } else {
        toast.error(res.message || 'Không thể hủy theo dõi sản phẩm');
      }
    } catch (err) {
      console.error('Delete watched product failed:', err);
      toast.error('Lỗi kết nối máy chủ API');
    } finally {
      setDangXuLyId(null);
    }
  };

  const xuLyBatDauChinhGia = (item) => {
  setChinhSuaId(item.maTheoDoi);
  setGiaMoi(item.giaMongMuon ? String(Number(item.giaMongMuon)) : '');
};

const xuLyHuyChinhGia = () => {
  setChinhSuaId(null);
  setGiaMoi('');
};

  const xuLyLuuGiaMongMuon = async (item) => {
    const giaMoiNumber = giaMoi ? Number(giaMoi) : null;

    if (giaMoi && (Number.isNaN(giaMoiNumber) || giaMoiNumber <= 0)) {
      toast.info('Giá mong muốn phải là số lớn hơn 0');
      return;
    }

    setDangXuLyId(item.maTheoDoi);

    try {
      const res = await theoDoiGiaService.capNhatTheoDoi(item.maTheoDoi, {
        giaMongMuon: giaMoiNumber,
      });

      if (res.success) {
        setDanhSach((prev) =>
          prev.map((sanPham) =>
            sanPham.maTheoDoi === item.maTheoDoi
              ? { ...sanPham, giaMongMuon: giaMoiNumber }
              : sanPham
          )
        );

        toast.success(res.message || 'Cập nhật giá mong muốn thành công');
        setChinhSuaId(null);
        setGiaMoi('');
      } else {
        toast.error(res.message || 'Không thể cập nhật giá mong muốn');
      }
    } catch (err) {
      console.error('Update target price failed:', err);
      toast.error(err.response?.data?.message || 'Lỗi kết nối máy chủ API');
    } finally {
      setDangXuLyId(null);
    }
  };

  const renderNoLogin = () => (
    <div style={{ textAlign: 'center' }}>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: '24px' }}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <path d="M12 8v4"></path>
        <path d="M12 16h.01"></path>
      </svg>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#334155', marginBottom: '16px' }}>
        Vui lòng đăng nhập
      </h2>
      <p style={{ color: '#64748b', maxWidth: '600px', margin: '0 auto 32px auto', lineHeight: '1.6' }}>
        Bạn cần đăng nhập để xem danh sách sản phẩm đang theo dõi.
      </p>
      <Link
        to={`/san-pham/${item.maSPCH}`}
        title={item.tenChuanHoa}
        style={{
          color: '#0f172a',
          fontSize: '18px',
          fontWeight: '700',
          textDecoration: 'none',
          marginBottom: '8px',
          lineHeight: '1.35',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 2,
          overflow: 'hidden'
        }}
      >
        Đăng nhập
      </Link>
    </div>
  );

  const renderLoading = () => (
    <div style={{ width: '100%' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#334155', marginBottom: '24px' }}>
        Sản phẩm theo dõi
      </h2>
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          style={{
            display: 'flex',
            gap: '16px',
            padding: '16px',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            marginBottom: '16px'
          }}
        >
          <div className="skeleton" style={{ width: '96px', height: '96px', borderRadius: '10px' }}></div>
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: '20px', width: '60%', marginBottom: '12px' }}></div>
            <div className="skeleton" style={{ height: '16px', width: '40%', marginBottom: '12px' }}></div>
            <div className="skeleton" style={{ height: '16px', width: '30%' }}></div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmpty = () => (
    <div style={{ textAlign: 'center' }}>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: '24px' }}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#334155', marginBottom: '16px' }}>
        Chưa có sản phẩm theo dõi
      </h2>
      <p style={{ color: '#64748b', maxWidth: '600px', margin: '0 auto 32px auto', lineHeight: '1.6' }}>
        Khi bạn bấm “Theo dõi giảm giá” ở trang chi tiết sản phẩm, sản phẩm sẽ xuất hiện tại đây.
      </p>
      <Link
        to="/"
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
        Tìm sản phẩm
      </Link>
    </div>
  );

  const renderError = () => (
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#334155', marginBottom: '16px' }}>
        Không thể tải dữ liệu
      </h2>
      <p style={{ color: '#64748b', maxWidth: '600px', margin: '0 auto 24px auto', lineHeight: '1.6' }}>
        {error}
      </p>
      <button
        type="button"
        onClick={layDanhSachTheoDoi}
        style={{
          background: 'var(--color-primary)',
          color: '#fff',
          padding: '10px 24px',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '500'
        }}
      >
        Thử lại
      </button>
    </div>
  );

  const renderList = () => (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#334155',
              marginBottom: '8px'
            }}
          >
            Sản phẩm theo dõi
          </h2>

          <p style={{ color: '#64748b', margin: 0 }}>
            Bạn đang theo dõi {danhSach.length} sản phẩm.
          </p>
        </div>

        <Link
          to="/"
          style={{
            background: '#f1f5f9',
            color: '#334155',
            padding: '10px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '500',
            whiteSpace: 'nowrap'
          }}
        >
          Tìm thêm sản phẩm
        </Link>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {danhSachTheoTrang.map((item) => (
          <article
            key={item.maTheoDoi}
            style={{
              display: 'grid',
              gridTemplateColumns: '96px minmax(0, 1fr) 190px',
              gap: '18px',
              alignItems: 'center',
              padding: '18px',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              background: '#fff'
            }}
          >
            <div
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '10px',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                border: '1px solid #e2e8f0'
              }}
            >
              {item.anhDaiDien ? (
                <img
                  src={item.anhDaiDien}
                  alt={item.tenChuanHoa}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <span
                  style={{
                    color: '#94a3b8',
                    fontSize: '13px'
                  }}
                >
                  Không có ảnh
                </span>
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <Link
                to={`/san-pham/${item.maSPCH}`}
                title={item.tenChuanHoa}
                style={{
                  color: '#0f172a',
                  fontSize: '18px',
                  fontWeight: '700',
                  textDecoration: 'none',
                  marginBottom: '8px',
                  lineHeight: '1.35',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2,
                  overflow: 'hidden'
                }}
              >
                {item.tenChuanHoa}
              </Link>

              <div style={{ marginBottom: '10px' }}>
                {item.trangThaiHienThi === 'chua_dat_gia_mong_muon' && (
                  <span
                    style={{
                      background: '#fef2f2',
                      color: '#991b1b',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  >
                    Chưa đặt giá mong muốn
                  </span>
                )}

                {item.trangThaiHienThi === 'dang_theo_doi' && (
                  <span
                    style={{
                      background: '#eff6ff',
                      color: '#1e40af',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  >
                    Đang theo dõi
                  </span>
                )}

                {item.trangThaiHienThi === 'da_dat_gia' && (
                  <span
                    style={{
                      background: '#fef3c7',
                      color: '#92400e',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  >
                    Đã đạt giá mong muốn
                  </span>
                )}

                {item.trangThaiHienThi === 'da_thong_bao' && (
                  <span
                    style={{
                      background: '#dcfce7',
                      color: '#166534',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  >
                    Đã gửi thông báo
                    {item.ngayThongBao
                      ? ` (${new Date(item.ngayThongBao).toLocaleDateString(
                          'vi-VN'
                        )})`
                      : ''}
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  color: '#64748b',
                  fontSize: '14px',
                  marginBottom: '8px'
                }}
              >
                {item.thuongHieu && (
                  <span>Thương hiệu: {item.thuongHieu}</span>
                )}

                {item.dungLuong && (
                  <span>Dung lượng: {item.dungLuong}</span>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '14px',
                  alignItems: 'center'
                }}
              >
                <span
                  style={{
                    color: '#16a34a',
                    fontWeight: '700'
                  }}
                >
                  Giá thấp nhất:{' '}
                  {item.giaThapNhat
                    ? dinhDangTien(item.giaThapNhat)
                    : 'Chưa có giá'}
                </span>

                {item.giaCaoNhat && (
                  <span style={{ color: '#64748b' }}>
                    Giá cao nhất: {dinhDangTien(item.giaCaoNhat)}
                  </span>
                )}

                {item.giaMongMuon && (
                  <span
                    style={{
                      color: '#2563eb',
                      fontWeight: '700'
                    }}
                  >
                    Giá mong muốn: {dinhDangTien(item.giaMongMuon)}
                  </span>
                )}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                minWidth: '190px'
              }}
            >
              {chinhSuaId === item.maTheoDoi ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '10px',
                    border: '1px solid #bfdbfe',
                    borderRadius: '10px',
                    background: '#eff6ff'
                  }}
                >
                  <label
                    style={{
                      color: '#1e3a8a',
                      fontSize: '13px',
                      fontWeight: '700'
                    }}
                  >
                    Giá mong muốn mới
                  </label>

                  <input
                    type="number"
                    value={giaMoi}
                    onChange={(event) => setGiaMoi(event.target.value)}
                    placeholder="VD: 22000000"
                    min="0"
                    style={{
                      padding: '9px 10px',
                      border: '1px solid #93c5fd',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                  />

                  <button
                    type="button"
                    disabled={dangXuLyId === item.maTheoDoi}
                    onClick={() => xuLyLuuGiaMongMuon(item)}
                    style={{
                      background: 'var(--color-primary)',
                      color: '#fff',
                      border: 'none',
                      padding: '9px 14px',
                      borderRadius: '8px',
                      cursor:
                        dangXuLyId === item.maTheoDoi
                          ? 'not-allowed'
                          : 'pointer',
                      fontWeight: '700',
                      whiteSpace: 'nowrap',
                      opacity:
                        dangXuLyId === item.maTheoDoi ? 0.7 : 1
                    }}
                  >
                    {dangXuLyId === item.maTheoDoi
                      ? 'Đang lưu...'
                      : 'Lưu giá'}
                  </button>

                  <button
                    type="button"
                    onClick={xuLyHuyChinhGia}
                    style={{
                      background: '#fff',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Hủy sửa
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => xuLyBatDauChinhGia(item)}
                  style={{
                    background: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    padding: '9px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '700',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Chỉnh giá mong muốn
                </button>
              )}

              <button
                type="button"
                disabled={dangXuLyId === item.maTheoDoi}
                onClick={() => xuLyHuyTheoDoi(item.maTheoDoi)}
                style={{
                  background: '#fff',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  cursor:
                    dangXuLyId === item.maTheoDoi
                      ? 'not-allowed'
                      : 'pointer',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  opacity:
                    dangXuLyId === item.maTheoDoi ? 0.7 : 1
                }}
              >
                {dangXuLyId === item.maTheoDoi
                  ? 'Đang hủy...'
                  : 'Hủy theo dõi'}
              </button>
            </div>
          </article>
        ))}
      </div>

      {tongSoTrang > 1 && (
        <div
          className="phan-trang-admin"
          style={{ marginTop: '24px' }}
        >
          <button
            type="button"
            disabled={trangHienTai === 1}
            onClick={() => xuLyChuyenTrang(trangHienTai - 1)}
          >
            Trước
          </button>

          {Array.from(
            { length: tongSoTrang },
            (_, index) => index + 1
          ).map((soTrang) => (
            <button
              key={soTrang}
              type="button"
              className={
                trangHienTai === soTrang
                  ? 'trang-dang-chon'
                  : ''
              }
              onClick={() => xuLyChuyenTrang(soTrang)}
            >
              {soTrang}
            </button>
          ))}

          <button
            type="button"
            disabled={trangHienTai === tongSoTrang}
            onClick={() => xuLyChuyenTrang(trangHienTai + 1)}
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );

  let content = null;

  if (!token) {
    content = renderNoLogin();
  } else if (loading) {
    content = renderLoading();
  } else if (error) {
    content = renderError();
  } else if (danhSach.length === 0) {
    content = renderEmpty();
  } else {
    content = renderList();
  }

  return (
    <main className="user-page account-page">
      <div className="user-container">
        <div className="account-shell">
          <aside className="account-sidebar">
            <div className="account-sidebar__card">
              <div className="account-sidebar__user">
                <div className="account-sidebar__avatar">
                  {(user?.hoTen || user?.email || "U").charAt(0).toUpperCase()}
                </div>

                <div className="account-sidebar__user-info">
                  <h2>{user?.hoTen || "Người dùng"}</h2>
                  <p>{user?.email || "Chưa có email"}</p>
                  <span className="account-role-badge">
                    {user?.vaiTro === "admin" ? "Quản trị viên" : "Người dùng"}
                  </span>
                </div>
              </div>

              <div className="account-sidebar__menu">
                <Link to="/tai-khoan" className="account-menu__item">
                  <span>👤</span>
                  <span>Thông tin tài khoản</span>
                </Link>

                <Link
                  to="/tai-khoan/san-pham-theo-doi"
                  className="account-menu__item is-active"
                >
                  <span>🔔</span>
                  <span>Sản phẩm đang theo dõi</span>
                </Link>

                <button
                  type="button"
                  className="account-menu__item account-menu__item--danger"
                  onClick={xuLyDangXuat}
                >
                  <span>↪</span>
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          </aside>

          <section className="account-content">
            <div
              className="account-content__card"
              style={{
                minHeight: "400px",
                display: "flex",
                flexDirection: "column",
                alignItems: danhSach.length > 0 ? "stretch" : "center",
                justifyContent: danhSach.length > 0 ? "flex-start" : "center"
              }}
            >
              {content}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
