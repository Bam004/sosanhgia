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
  const [selectedRange, setSelectedRange] = useState('3m');
  const [thongKe, setThongKe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdatingRange, setIsUpdatingRange] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      if (!sanPham) {
        setLoading(true);
      } else {
        setIsUpdatingRange(true);
      }
      setError("");
      try {
        if (!sanPham) {
          const detailRes = await productService.layChiTietSanPham(id);
          if (detailRes.data && !isCancelled) {
            setSanPham(detailRes.data);
          }
        }

        const historyRes = await productService.layLichSuGia(id, selectedRange);
        if (isCancelled) return;

        const data = historyRes.data || {};
        const series = Array.isArray(data.series) ? data.series : [];
        setThongKe({
          rangeSummary: data.rangeSummary,
          allTimeLow: data.allTimeLow
        });

        if (series.length > 0) {
          // Format data cho Recharts
          const groupedByDate = {};
          let minP = Infinity;
          let maxP = -Infinity;
          const sourceSet = new Set();

          series.forEach(s => {
             sourceSet.add(s.sourceName);
             s.points.forEach(p => {
                if (p.price < minP) minP = p.price;
                if (p.price > maxP) maxP = p.price;

              const dateObj = new Date(p.date);

              const dateLabel = dateObj.toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });

              const timestamp = dateObj.getTime();
              const pointKey = String(timestamp);

              if (!groupedByDate[pointKey]) {
                groupedByDate[pointKey] = {
                  name: dateLabel,
                  _timestamp: timestamp,
                };
              }

              groupedByDate[pointKey][s.sourceName] = p.price;
             });
          });

          setChartSources([...sourceSet]);
          setChartDomain({ min: minP, max: maxP });

          const chartArray = Object.values(groupedByDate).sort((a, b) => a._timestamp - b._timestamp);
          setChartData(chartArray);
        } else {
          setChartData([]);
          setError("Chưa có dữ liệu trong khoảng này.");
        }
      } catch (e) {
        if (isCancelled) return;
        console.error(e);
        setError("Lỗi kết nối lịch sử giá");
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setIsUpdatingRange(false);
        }
      }
    };
    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [id, selectedRange]);

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
              {isUpdatingRange && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.6)', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <span className="spinner" style={{ width: '30px', height: '30px' }}></span>
                </div>
              )}
              <BieuDoGia
                dataInput={chartData}
                thongKe={thongKe}
                sources={chartSources}
                priceRange={chartDomain}
                timeline={selectedRange}
                onChangeTimeline={setSelectedRange}
              />
            </div>
            {/* Render data table for raw history - Removed as requested by task to keep minimal or it crashes on missing data, wait, I can just hide it since series replaces raw lichSuGia */}
          </div>
        </section>
      </div>
    </main>
  );
}
