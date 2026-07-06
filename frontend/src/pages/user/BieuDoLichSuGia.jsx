import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import BieuDoGia from '../../components/user/BieuDoGia';
import { productService } from '../../services/productService';
import { SinhIconSanPham } from '../../components/user/TheSanPham';
import { dinhDangTien } from '../../utils/dinhDangTien';

export default function BieuDoLichSuGia() {
  const { id } = useParams();
  const [sanPham, setSanPham] = useState(null);
  const [lichSuGia, setLichSuGia] = useState(null);
  const [thongKe, setThongKe] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const detailRes = await productService.layChiTietSanPham(id);
        if (detailRes.data) {
          setSanPham(detailRes.data);
        }
        
        const historyRes = await productService.layLichSuGia(id);
        if (historyRes.data && historyRes.data.lichSu.length > 0) {
          setLichSuGia(historyRes.data.lichSu);
          setThongKe(historyRes.data.thongKe);
        } else {
          setError(historyRes.errorMessage || 'Chưa có dữ liệu lịch sử giá');
        }
      } catch (e) {
        console.error(e);
        setError('Lỗi kết nối lịch sử giá');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading || !sanPham) {
    return (
      <div className="user-page">
        <div className="user-container" style={{ textAlign: 'center', padding: '100px 0' }}>
          <span className="spinner" style={{ display: 'inline-block', width: '30px', height: '30px', marginBottom: '16px' }}></span>
          <p>Đang tải dữ liệu lịch sử giá...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-page">
        <div className="user-container" style={{ textAlign: 'center', padding: '100px 0' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
             <circle cx="12" cy="12" r="10"></circle>
             <line x1="12" y1="8" x2="12" y2="12"></line>
             <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>{error}</p>
          <Link to={`/san-pham/${id}`} style={{ color: 'var(--color-primary)', textDecoration: 'underline', marginTop: '10px', display: 'inline-block' }}>Quay lại</Link>
        </div>
      </div>
    );
  }

  return (
    <main className="user-page">
      <div className="user-container price-history-layout">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/">Trang chủ</Link> &gt;{' '}
          <Link to={`/tim-kiem?danh-muc=${encodeURIComponent(sanPham.danhMuc)}`}>
            {sanPham.danhMuc}
          </Link>{' '}
          &gt; <Link to={`/san-pham/${sanPham.id}`}>{sanPham.tenSanPham}</Link> &gt;{' '}
          <span>Lịch sử giá</span>
        </div>

        {/* Khối thông tin sản phẩm thu nhỏ */}
        <section className="product-summary-bar">
          <div className="product-summary-bar__left">
            <div className="product-summary-bar__img-box">
              {sanPham.hinhAnh ? (
                <img src={sanPham.hinhAnh} alt={sanPham.tenSanPham} />
              ) : (
                <SinhIconSanPham danhMuc={sanPham.danhMuc || 'Điện thoại'} width={50} height={50} />
              )}
            </div>
            <div className="product-summary-bar__details">
              <h1>{sanPham.tenSanPham}</h1>
              <p>Thương hiệu: <strong>{sanPham.thuongHieu}</strong> | Danh mục: {sanPham.danhMuc}</p>
            </div>
          </div>
          <div className="product-summary-bar__right">
            <div className="price-info">
              <span>Giá khuyến mãi từ:</span>
              <strong>{dinhDangTien(sanPham.giaThapNhat)}</strong>
            </div>
            <Link to={`/san-pham/${sanPham.id}`} className="btn-back-detail">
              Quay lại chi tiết sản phẩm
            </Link>
          </div>
        </section>

        {/* Khối biểu đồ Recharts */}
        <section className="chart-main-card">
          <div className="chart-main-card__header">
            <h3>Lịch sử biến động giá đa sàn (Lazada, FPT Shop, Tiki, CellphoneS, HoangHa Mobile)</h3>
            <p>Biểu đồ thể hiện biến động giá bán thực tế ghi nhận qua các mốc thời gian.</p>
          </div>
          
          <div className="chart-main-card__body">
            {/* Render component biểu đồ Recharts */}
            <div style={{ position: 'relative' }}>
              <BieuDoGia dataInput={lichSuGia} thongKe={thongKe} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
