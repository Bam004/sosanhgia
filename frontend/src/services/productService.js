import api from './api';

// Helper function to safely extract data from various response shapes
const extractData = (res) => {
  if (!res) return null;
  const data = res.data;
  if (!data) return null;
  if (data.data !== undefined) return data.data;
  if (data.items !== undefined) return data.items;
  if (data.results !== undefined) return data.results;
  return data;
};

// Helper function to format platform name to class/logo
const getLogoName = (sanTMDT) => {
  if (!sanTMDT) return 'lazada';
  const name = sanTMDT.toLowerCase();
  if (name.includes('lazada')) return 'lazada';
  if (name.includes('tiki')) return 'tiki';
  if (name.includes('fpt')) return 'fptshop';
  if (name.includes('cellphone')) return 'cellphones';
  if (name.includes('hoangha')) return 'hoanghamobile';
  return 'lazada';
};

// Helper function to get domain name
const getDomainName = (sanTMDT, linkGoc) => {
  if (linkGoc) {
    try {
      const url = new URL(linkGoc);
      return url.hostname.replace('www.', '');
    } catch (e) {
      // fallback
    }
  }
  if (!sanTMDT) return 'lazada.vn';
  const name = sanTMDT.toLowerCase();
  if (name.includes('lazada')) return 'lazada.vn';
  if (name.includes('tiki')) return 'tiki.vn';
  if (name.includes('fpt')) return 'fptshop.com.vn';
  if (name.includes('cellphone')) return 'cellphones.com.vn';
  if (name.includes('hoangha')) return 'hoanghamobile.com';
  return 'lazada.vn';
};

export const productService = {
  // Lấy sản phẩm nổi bật cho trang chủ
  laySanPhamNoiBat: async () => {
    return await productService.timKiemSanPham('iphone 15', false);
  },

  // 1. Search products
  timKiemSanPham: async (keyword, autoScrape = true, filters = {}) => {
    try {
      const response = await api.get('/search', { params: { keyword, auto_scrape: autoScrape } });
      const rawData = extractData(response);

      if (rawData) {
        let mappedProducts = [];
        
        // Ưu tiên render data.groups nếu có
        if (rawData.groups && rawData.groups.length > 0) {
          mappedProducts = rawData.groups.map(group => {
            const firstItem = group.items && group.items[0] ? group.items[0] : {};
            const lowestPriceItem = group.sanPhamGiaThapNhat || firstItem;
            return {
              id: group.maSPCH || group.maNhomTam,
              maSPCH: group.maSPCH || group.maNhomTam,
              tenSanPham: group.tenChuanHoa || 'Sản phẩm',
              tenChuanHoa: group.tenChuanHoa || 'Sản phẩm',
              thuongHieu: group.thuongHieu || firstItem.attributes?.brand || 'Khác',
              dungLuong: group.dungLuong,
              danhMuc: group.productType || 'Điện thoại',
              hinhAnh: group.sanPhamGiaThapNhat?.hinhAnh || firstItem.hinhAnh || '',
              giaThapNhat: group.giaThapNhat || 0,
              giaCaoNhat: group.giaCaoNhat || 0,
              giaGoc: (group.giaThapNhat || 0) * 1.15,
              phanTramGiam: 15,
              soNoiBan: group.soNguon || 1,
              sanDangBan: group.nguon || [],
              nguon: group.nguon || [],
              danhGia: lowestPriceItem.danhGia,
              soLuongDanhGia: lowestPriceItem.soLuongDanhGia || 0,
              linkMuaTotNhat: lowestPriceItem.linkGoc || '',
              domain: getDomainName(lowestPriceItem.sanTMDT, lowestPriceItem.linkGoc),
              thongSoKyThuat: firstItem.attributes || {},
              offers: (group.items || []).map(item => ({
                tenSanPham: item.tenSanPham,
                sanTMDT: item.sanTMDT,
                giaHienTai: Number(item.giaHienTai),
                giaGoc: Number(item.giaHienTai) * 1.15,
                linkGoc: item.linkGoc,
                hinhAnh: item.hinhAnh,
                danhGia: item.danhGia,
                soLuongDanhGia: item.soLuongDanhGia,
                ngayCapNhat: item.ngayCapNhat
              })),
              items: group.items || []
            };
          });
        } 
        // Fallback sang items thô nếu không có groups
        else if (rawData.items && rawData.items.length > 0) {
          mappedProducts = rawData.items.map(item => {
            return {
              id: item.maSPCH || item.maSPTho || Math.floor(Math.random() * 10000),
              maSPCH: item.maSPCH,
              tenSanPham: item.tenSanPham || 'Sản phẩm',
              tenChuanHoa: item.tenSanPham || 'Sản phẩm',
              thuongHieu: item.attributes?.brand || 'Khác',
              dungLuong: null,
              danhMuc: 'Điện thoại',
              hinhAnh: item.hinhAnh || '',
              giaThapNhat: item.giaHienTai || 0,
              giaCaoNhat: item.giaHienTai || 0,
              giaGoc: item.giaHienTai * 1.15 || 0,
              phanTramGiam: 15,
              soNoiBan: 1,
              sanDangBan: [item.sanTMDT],
              nguon: [item.sanTMDT],
              danhGia: item.danhGia,
              soLuongDanhGia: item.soLuongDanhGia || 0,
              linkMuaTotNhat: item.linkGoc || '',
              domain: getDomainName(item.sanTMDT, item.linkGoc),
              thongSoKyThuat: item.attributes || {},
              offers: [{
                tenSanPham: item.tenSanPham,
                sanTMDT: item.sanTMDT,
                giaHienTai: Number(item.giaHienTai),
                giaGoc: Number(item.giaHienTai) * 1.15,
                linkGoc: item.linkGoc,
                hinhAnh: item.hinhAnh,
                danhGia: item.danhGia,
                soLuongDanhGia: item.soLuongDanhGia,
                ngayCapNhat: item.ngayCapNhat
              }],
              items: [item]
            };
          });
        }

        // Áp dụng bộ lọc cục bộ trên danh sách sản phẩm lấy từ API
        let filtered = mappedProducts;
        if (filters.website && filters.website.length > 0) {
          filtered = filtered.filter(p => p.sanDangBan.some(s => filters.website.includes(s)));
        }
        if (filters.brand && filters.brand.length > 0) {
          filtered = filtered.filter(p => filters.brand.includes(p.thuongHieu));
        }
        if (filters.giaMin) {
          filtered = filtered.filter(p => p.giaThapNhat >= Number(filters.giaMin));
        }
        if (filters.giaMax) {
          filtered = filtered.filter(p => p.giaThapNhat <= Number(filters.giaMax));
        }
        if (filters.mucGia && filters.mucGia.length > 0) {
          filtered = filtered.filter(p => {
            const gia = p.giaThapNhat;
            return (
              (filters.mucGia.includes('under2') && gia < 2000000) ||
              (filters.mucGia.includes('between2_5') && gia >= 2000000 && gia <= 5000000) ||
              (filters.mucGia.includes('between5_15') && gia >= 5000000 && gia <= 15000000) ||
              (filters.mucGia.includes('over15') && gia > 15000000)
            );
          });
        }
        if (filters.danhGia) {
          filtered = filtered.filter(p => (p.danhGia || 0) >= Number(filters.danhGia));
        }

        return {
          data: filtered,

          errorMessage: null
        };
      }
      throw new Error('Không nhận được dữ liệu hợp lệ từ máy chủ API.');
    } catch (error) {
      console.warn('API Search failed:', error.message);
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout');
      const errorMessage = isTimeout 
        ? 'Yêu cầu tìm kiếm bị quá hạn. Vui lòng thử lại.' 
        : (error.message || 'Lỗi kết nối máy chủ API.');

      return {
        data: [],

        errorMessage: errorMessage
      };
    }
  },

  // 2. Get product detail
  layChiTietSanPham: async (id) => {
    try {
      const response = await api.get(`/products/compare/${id}`);
      const rawData = extractData(response);

      if (rawData && rawData.items) {
        const items = rawData.items;
        const firstItem = items[0] || {};

        return {
          data: {
            id: Number(id),
            maSPCH: Number(id),
            tenSanPham: firstItem.tenSanPham || 'Sản phẩm',
            thuongHieu: firstItem.attributes?.brand || 'Khác',
            danhMuc: 'Điện thoại',
            hinhAnh: firstItem.hinhAnh || '',
            giaThapNhat: rawData.lowest_price || firstItem.giaHienTai || 0,
            giaCaoNhat: rawData.highest_price || firstItem.giaHienTai || 0,
            giaGoc: (rawData.lowest_price || firstItem.giaHienTai) * 1.15,
            phanTramGiam: 15,
            soNoiBan: rawData.total_merchants || items.length || 1,
            danhGia: firstItem.danhGia,
            soLuongDanhGia: firstItem.soLuongDanhGia || 0,
            sanDangBan: items.map(item => item.sanTMDT),
            linkMuaTotNhat: firstItem.linkGoc || '',
            domain: getDomainName(firstItem.sanTMDT, firstItem.linkGoc),
            thongSoKyThuat: firstItem.attributes || {},
            noiBanChiTiet: items.map((item, idx) => ({
              logo: getLogoName(item.sanTMDT),
              san: item.sanTMDT,
              domain: getDomainName(item.sanTMDT, item.linkGoc),
              tenNoiBan: item.tenSanPham,
              gia: Number(item.giaHienTai),
              danhGia: item.danhGia,
              capNhat: 'Vừa cập nhật',
              link: item.linkGoc
            }))
          },

          errorMessage: null
        };
      }
      throw new Error('Không tìm thấy thông tin sản phẩm chuẩn hóa.');
    } catch (error) {
      console.warn('API Detail failed:', error.message);
      return {
        data: null,

        errorMessage: error.message || 'Không tìm thấy sản phẩm'
      };
    }
  },

  // 3. Get price comparison table
  laySoSanhGia: async (id) => {
    try {
      const response = await api.get(`/products/compare/${id}`);
      const rawData = extractData(response);

      if (rawData && rawData.items) {
        const mappedOffers = rawData.items.map((item) => ({
          logo: getLogoName(item.sanTMDT),
          san: item.sanTMDT,
          domain: getDomainName(item.sanTMDT, item.linkGoc),
          tenNoiBan: item.tenSanPham,
          gia: Number(item.giaHienTai),
          danhGia: item.danhGia,
          capNhat: 'Vừa cập nhật',
          link: item.linkGoc
        }));

        return {
          data: mappedOffers,

          errorMessage: null
        };
      }
      throw new Error('Không tìm thấy thông tin so sánh.');
    } catch (error) {
      console.warn('API Compare failed:', error.message);
      return {
        data: [],

        errorMessage: error.message || 'Lỗi kết nối máy chủ API'
      };
    }
  },

  // 4. Get price history (Call real backend API)
  layLichSuGia: async (id, range = '1_month') => {
    try {
      const response = await api.get(`/products/${id}/history`);
      const rawData = extractData(response);
      
      if (!rawData || rawData.length === 0) {
        return {
          data: { lichSu: [], thongKe: null },

          errorMessage: 'Chưa có dữ liệu lịch sử giá'
        };
      }

      // Map rawData array into a single flattened array of days
      const groupedByDate = {};
      
      rawData.forEach(platformGroup => {
        const platformName = platformGroup.sanTMDT || 'Khác';
        if (platformGroup.history && Array.isArray(platformGroup.history)) {
          platformGroup.history.forEach(record => {
             // Create "DD/MM" format for the chart X-axis
             const dateObj = new Date(record.ngayGhiNhan);
             const dateStr = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
             
             if (!groupedByDate[dateStr]) {
               groupedByDate[dateStr] = { ngay: dateStr, _timestamp: dateObj.getTime() };
             }
             // Override to keep the latest price of the day if there are multiple
             groupedByDate[dateStr][platformName] = record.gia;
          });
        }
      });
      
      const lichSu = Object.values(groupedByDate).sort((a, b) => a._timestamp - b._timestamp);

      return {
        data: {
          lichSu: lichSu,
          thongKe: null // Backend currently doesn't return statistics, can calculate if needed later
        },

        errorMessage: null
      };
    } catch (error) {
      console.error('API History failed:', error.message);
      return {
        data: { lichSu: [], thongKe: null },

        errorMessage: error.message || 'Lỗi kết nối lịch sử giá'
      };
    }
  }
};
