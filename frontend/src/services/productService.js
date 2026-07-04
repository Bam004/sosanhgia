import api from './api';
import { sanPhamMau, lichSuGiaMau, thongKeLichSuGiaMau } from '../data/duLieuSanPhamMau';

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
  // 1. Search products
  timKiemSanPham: async (keyword, filters = {}) => {
    try {
      const response = await api.get('/search', { params: { keyword } });
      const rawData = extractData(response);

      if (rawData && rawData.groups) {
        // Map backend groups to frontend product schema
        const mappedProducts = rawData.groups.map(group => {
          const firstItem = group.items && group.items[0] ? group.items[0] : {};
          return {
            id: group.maNhomTam || firstItem.maSPCH || Math.floor(Math.random() * 10000),
            tenSanPham: group.tenChuanHoa || firstItem.tenSanPham || 'Sản phẩm',
            thuongHieu: group.thuongHieu || firstItem.attributes?.brand || 'Khác',
            danhMuc: group.productType || 'Điện thoại',
            hinhAnh: firstItem.hinhAnh || '',
            giaThapNhat: group.giaThapNhat || firstItem.giaHienTai || 0,
            giaCaoNhat: group.giaCaoNhat || firstItem.giaHienTai || 0,
            giaGoc: firstItem.giaHienTai * 1.15 || 0, // mock origin price
            phanTramGiam: 15,
            soNoiBan: group.soSanPham || group.soNguon || 1,
            danhGia: firstItem.danhGia || 5.0,
            soLuongDanhGia: firstItem.soLuongDanhGia || 10,
            sanDangBan: group.nguon || [firstItem.sanTMDT],
            linkMuaTotNhat: firstItem.linkGoc || '',
            domain: getDomainName(firstItem.sanTMDT, firstItem.linkGoc),
            thongSoKyThuat: firstItem.attributes || {}
          };
        });

        // Apply filters locally on backend results if any filters are passed
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
          filtered = filtered.filter(p => p.danhGia >= Number(filters.danhGia));
        }

        return {
          data: filtered,
          isOffline: false,
          errorMessage: null
        };
      }
      throw new Error('Định dạng dữ liệu không hợp lệ từ máy chủ.');
    } catch (error) {
      console.warn('API Search failed, falling back to mock data:', error.message);
      // Fallback local mock search
      let localData = [...sanPhamMau];

      if (keyword) {
        const keywordLower = keyword.toLowerCase();
        localData = localData.filter(p => 
          p.tenSanPham.toLowerCase().includes(keywordLower) ||
          p.thuongHieu.toLowerCase().includes(keywordLower)
        );
      }

      // Apply filters on local data
      if (filters.website && filters.website.length > 0) {
        localData = localData.filter(p => p.sanDangBan.some(s => filters.website.includes(s)));
      }
      if (filters.brand && filters.brand.length > 0) {
        localData = localData.filter(p => filters.brand.includes(p.thuongHieu));
      }
      if (filters.giaMin) {
        localData = localData.filter(p => p.giaThapNhat >= Number(filters.giaMin));
      }
      if (filters.giaMax) {
        localData = localData.filter(p => p.giaThapNhat <= Number(filters.giaMax));
      }
      if (filters.mucGia && filters.mucGia.length > 0) {
        localData = localData.filter(p => {
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
        localData = localData.filter(p => p.danhGia >= Number(filters.danhGia));
      }

      return {
        data: localData,
        isOffline: true,
        errorMessage: error.message || 'Lỗi kết nối máy chủ API'
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
        
        // Find in mock data to borrow specifications (thongSoKyThuat) if available
        const localMatch = sanPhamMau.find(p => p.id === Number(id)) || {};

        return {
          data: {
            id: Number(id),
            tenSanPham: firstItem.tenSanPham || 'Sản phẩm',
            thuongHieu: firstItem.attributes?.brand || localMatch.thuongHieu || 'Khác',
            danhMuc: localMatch.danhMuc || 'Điện thoại',
            hinhAnh: firstItem.hinhAnh || '',
            giaThapNhat: rawData.lowest_price || firstItem.giaHienTai || 0,
            giaCaoNhat: rawData.highest_price || firstItem.giaHienTai || 0,
            giaGoc: (rawData.lowest_price || firstItem.giaHienTai) * 1.15,
            phanTramGiam: 15,
            soNoiBan: rawData.total_merchants || items.length || 1,
            danhGia: firstItem.danhGia || 5.0,
            soLuongDanhGia: firstItem.soLuongDanhGia || 10,
            sanDangBan: items.map(item => item.sanTMDT),
            linkMuaTotNhat: firstItem.linkGoc || '',
            domain: getDomainName(firstItem.sanTMDT, firstItem.linkGoc),
            thongSoKyThuat: {
              ...(firstItem.attributes || {}),
              ...(localMatch.thongSoKyThuat || {})
            },
            noiBanChiTiet: items.map((item, idx) => ({
              logo: getLogoName(item.sanTMDT),
              san: item.sanTMDT,
              domain: getDomainName(item.sanTMDT, item.linkGoc),
              tenNoiBan: item.tenSanPham,
              gia: Number(item.giaHienTai),
              danhGia: item.danhGia || 4.5,
              capNhat: 'Vừa cập nhật',
              link: item.linkGoc
            }))
          },
          isOffline: false,
          errorMessage: null
        };
      }
      throw new Error('Không tìm thấy thông tin sản phẩm chuẩn hóa.');
    } catch (error) {
      console.warn('API Detail failed, falling back to mock data:', error.message);
      const localMatch = sanPhamMau.find(p => p.id === Number(id));
      if (localMatch) {
        return {
          data: localMatch,
          isOffline: true,
          errorMessage: error.message || 'Lỗi kết nối máy chủ API'
        };
      }
      return {
        data: null,
        isOffline: true,
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
          danhGia: item.danhGia || 4.5,
          capNhat: 'Vừa cập nhật',
          link: item.linkGoc
        }));

        return {
          data: mappedOffers,
          isOffline: false,
          errorMessage: null
        };
      }
      throw new Error('Không tìm thấy thông tin so sánh.');
    } catch (error) {
      console.warn('API Compare failed, falling back to mock data:', error.message);
      const localMatch = sanPhamMau.find(p => p.id === Number(id));
      return {
        data: localMatch ? localMatch.noiBanChiTiet : [],
        isOffline: true,
        errorMessage: error.message || 'Lỗi kết nối máy chủ API'
      };
    }
  },

  // 4. Get price history (local mock fallback since backend has no history table)
  layLichSuGia: async (id, range = '1_month') => {
    // Return mock data for historical chart
    const historyData = lichSuGiaMau[range] || lichSuGiaMau['1_month'] || [];
    return {
      data: {
        lichSu: historyData,
        thongKe: thongKeLichSuGiaMau
      },
      isOffline: true,
      errorMessage: 'Dữ liệu lịch sử giá mẫu'
    };
  }
};
