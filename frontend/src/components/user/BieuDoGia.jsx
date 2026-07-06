import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { dinhDangTien } from '../../utils/dinhDangTien';

export default function BieuDoGia({ dataInput, thongKe, sources = [], priceRange = { min: 0, max: 0 } }) {
  const [timeline, setTimeline] = useState('1_month');

  // Lấy dữ liệu cho mốc thời gian được chọn
  const data = dataInput[timeline] || [];

  const dinhDangTienYAxis = (val) => {
    return (val / 1000000).toFixed(1) + 'tr';
  };

  const dinhDangTooltip = (value) => {
    return [dinhDangTien(value), 'Giá bán'];
  };

  const yDomain = priceRange.max > 0 
    ? [Math.max(0, priceRange.min - 500000), priceRange.max + 500000]
    : ['auto', 'auto'];

  const colors = {
    'Lazada': '#a21caf',
    'Tiki': '#0ea5e9',
    'FPT Shop': '#2563eb',
    'CellPhoneS': '#e11d48',
    'HoangHa Mobile': '#009688',
    'Khác': '#64748b'
  };

  return (
    <div className="price-chart-component">
      {/* Thời gian Tabs */}
      <div className="price-chart-component__tabs-row">
        <div className="price-chart-component__tabs">
          <button
            className={`chart-tab ${timeline === '1_month' ? 'active' : ''}`}
            onClick={() => setTimeline('1_month')}
          >
            1 Tháng
          </button>
          <button
            className={`chart-tab ${timeline === '3_months' ? 'active' : ''}`}
            onClick={() => setTimeline('3_months')}
          >
            3 Tháng
          </button>
          <button
            className={`chart-tab ${timeline === '6_months' ? 'active' : ''}`}
            onClick={() => setTimeline('6_months')}
          >
            6 Tháng
          </button>
        </div>

        {/* Thống kê nhanh */}
        {thongKe && (
          <div className="price-chart-component__stats">
            <div className="stat-item low">
              <span className="stat-title">Thấp nhất lịch sử (All-time low):</span>
              <strong className="stat-value">{dinhDangTien(thongKe.allTimeLow.gia)}</strong>
              <span className="stat-meta">({thongKe.allTimeLow.san} - {thongKe.allTimeLow.ngay})</span>
            </div>
            <div className="stat-item high">
              <span className="stat-title">Cao nhất lịch sử (All-time high):</span>
              <strong className="stat-value">{dinhDangTien(thongKe.allTimeHigh.gia)}</strong>
              <span className="stat-meta">({thongKe.allTimeHigh.san} - {thongKe.allTimeHigh.ngay})</span>
            </div>
          </div>
        )}
      </div>

      {/* Biểu đồ Recharts */}
      <div className="price-chart-component__canvas" style={{ width: '100%', height: 350 }}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 12 }}
                tickFormatter={dinhDangTienYAxis}
                tickLine={false}
                domain={yDomain}
              />
              <Tooltip
                formatter={dinhDangTooltip}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: 13, fontWeight: '600' }}
              />
              {sources.map(source => (
                <Line
                  key={source}
                  name={source}
                  type="monotone"
                  dataKey={source}
                  stroke={colors[source] || colors['Khác']}
                  strokeWidth={2.5}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="no-chart-data">Không có dữ liệu lịch sử giá.</div>
        )}
      </div>
    </div>
  );
}
