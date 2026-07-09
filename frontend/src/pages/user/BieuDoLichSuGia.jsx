import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import BieuDoGia from '../../components/user/BieuDoGia';
import { productService } from '../../services/productService';
import { SinhIconSanPham } from '../../components/user/TheSanPham';
import { dinhDangTien } from '../../utils/dinhDangTien';

export default function BieuDoLichSuGia() {
  const { id } = useParams();
  const [sanPham, setSanPham] = useState(null);
  const [lichSuGia, setLichSuGia] = useState([]);
  const [chartData, setChartData] = useState({});
  const [chartSources, setChartSources] = useState([]);
  const [chartDomain, setChartDomain] = useState({ min: 0, max: 0 });
  const [thongKe, setThongKe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const detailRes = await productService.layChiTietSanPham(id);
        if (detailRes.data) {
          setSanPham(detailRes.data);
        }
        
        const historyRes = await productService.layLichSuGia(id);
        const data = historyRes.data;
        const historyData = Array.isArray(data) ? data : [];

        if (historyData.length > 0) {
          setLichSuGia(historyData);
          
          // Format data cho Recharts
          const groupedByDate = {};
          let minP = Infinity;
          let maxP = -Infinity;
          const sourceSet = new Set();

          historyData.forEach(item => {
             sourceSet.add(item.sanTMDT);
             if (item.gia < minP) minP = item.gia;
             if (item.gia > maxP) maxP = item.gia;

             const dateObj = new Date(item.ngayGhiNhan);
             const dateStr = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
             
             if (!groupedByDate[dateStr]) {
               groupedByDate[dateStr] = { name: dateStr, _timestamp: dateObj.getTime() };
             }
             
             // Lấy giá thấp nhất nếu có nhiều giá cùng 1 ngày của cùng 1 sàn
             if (groupedByDate[dateStr][item.sanTMDT]) {
                groupedByDate[dateStr][item.sanTMDT] = Math.min(groupedByDate[dateStr][item.sanTMDT], item.gia);
             } else {
                groupedByDate[dateStr][item.sanTMDT] = item.gia;
             }
          });
          
          setChartSources([...sourceSet]);
          setChartDomain({ min: minP, max: maxP });

          const chartArray = Object.values(groupedByDate).sort((a, b) => a._timestamp - b._timestamp);
          setChartData({
            '1_month': chartArray,
            '3_months': chartArray,
            '6_months': chartArray
          });
        } else {
          setError("Chưa có dữ liệu lịch sử giá");
        }
      } catch (e) {
        console.error(e);
        setError("Lỗi kết nối lịch sử giá");
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

  const soNgayGhiNhan = new Set(
    lichSuGia.map((item) => new Date(item.ngayGhiNhan).toLocaleDateString('vi-VN'))
  ).size;

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
            <h3>Lịch sử biến động giá đa sàn </h3>
            <p>Biểu đồ thể hiện biến động giá bán thực tế ghi nhận qua các mốc thời gian.</p>
          </div>
          
          <div className="chart-main-card__body">
            {/* Render component biểu đồ Recharts */}
            <div style={{ position: 'relative' }}>
              <BieuDoGia dataInput={chartData} thongKe={thongKe} sources={chartSources} priceRange={chartDomain} />
            </div>
            
            {/* Render data table for raw history */}
            <div className="history-table-container" style={{ marginTop: '30px' }}>
              <h4 style={{ marginBottom: '15px' }}>Dữ liệu lịch sử chi tiết theo sản phẩm thô ({lichSuGia.length} điểm)</h4>
              {(lichSuGia.length <= 5 || soNgayGhiNhan <= 1) && (
                <p style={{ color: '#009688', fontSize: '14px', marginBottom: '15px' }}>
                  Hiện mới có {lichSuGia.length} điểm giá trong {soNgayGhiNhan} ngày ghi nhận. Biểu đồ sẽ thể hiện xu hướng rõ hơn khi hệ thống thu thập thêm dữ liệu theo thời gian.
                </p>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                      <th style={{ padding: '12px 10px', color: '#475569' }}>Sàn TMĐT</th>
                      <th style={{ padding: '12px 10px', color: '#475569' }}>Mã SP Thô</th>
                      <th style={{ padding: '12px 10px', color: '#475569' }}>Giá ghi nhận</th>
                      <th style={{ padding: '12px 10px', color: '#475569' }}>Ngày ghi nhận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lichSuGia.map((item, idx) => {
                      const dateObj = new Date(item.ngayGhiNhan);
                      const formattedDate = dateObj.toLocaleString('vi-VN');
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>{item.sanTMDT}</td>
                          <td style={{ padding: '12px 10px' }}>{item.maSPTho}</td>
                          <td style={{ padding: '12px 10px', color: '#e11d48', fontWeight: 'bold' }}>{dinhDangTien(item.gia)}</td>
                          <td style={{ padding: '12px 10px' }}>{formattedDate}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
