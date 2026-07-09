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

// Helper function to normalize text for source/platform matching
const normalizeText = (value) => {
  if (!value) return '';
  return value
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Ä‘/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
};

// Helper function to format platform name to class/logo
const getLogoName = (sanTMDT) => {
  const name = normalizeText(sanTMDT);
  if (!name) return 'lazada';
  if (name.includes('lazada')) return 'lazada';
  if (name.includes('tiki')) return 'tiki';
  if (name.includes('fpt')) return 'fptshop';
  if (name.includes('cellphone')) return 'cellphones';
  if (name.includes('hoangha') || name.includes('hoang ha')) return 'hoanghamobile';
  return 'lazada';
};

// Helper function to get domain name
const getDomainName = (sanTMDT, linkGoc) => {
  if (linkGoc) {
    try {
      const url = new URL(linkGoc);
      return url.hostname.replace('www.', '');
    } catch (e) {
      // fallback to platform name
    }
  }

  const name = normalizeText(sanTMDT);
  if (!name) return 'lazada.vn';
  if (name.includes('lazada')) return 'lazada.vn';
  if (name.includes('tiki')) return 'tiki.vn';
  if (name.includes('fpt')) return 'fptshop.com.vn';
  if (name.includes('cellphone')) return 'cellphones.com.vn';
  if (name.includes('hoangha') || name.includes('hoang ha')) return 'hoanghamobile.com';
  return 'lazada.vn';
};

const hienThiThuongHieu = (brand) => {
  const normalized = normalizeText(brand);

  const mapping = {
    apple: 'Apple',
    samsung: 'Samsung',
    xiaomi: 'Xiaomi',
    redmi: 'Redmi',
    poco: 'POCO',
    oppo: 'OPPO',
    vivo: 'Vivo',
    realme: 'Realme',
    honor: 'Honor',
    nokia: 'Nokia'
  };

  return mapping[normalized] || brand || 'KhÃ¡c';
};

const hienThiDanhMuc = (productType) => {
  const normalized = normalizeText(productType);

  const mapping = {
    phone: 'Äiá»‡n thoáº¡i',
    accessory: 'Phá»¥ kiá»‡n',
    repair_service: 'Dá»‹ch vá»¥ sá»­a chá»¯a',
    laptop: 'Laptop',
    tablet: 'MÃ¡y tÃ­nh báº£ng',
    tv: 'Tivi',
    monitor: 'MÃ n hÃ¬nh',
    pc: 'PC',
    audio: 'Ã‚m thanh'
  };

  return mapping[normalized] || productType || 'Äiá»‡n thoáº¡i';
};


export const productService = {
  // Láº¥y sáº£n pháº©m ná»•i báº­t cho trang chá»§
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
        
        // Æ¯u tiÃªn render data.groups náº¿u cÃ³
        if (rawData.groups && rawData.groups.length > 0) {
          mappedProducts = rawData.groups.map(group => {
            const firstItem = group.items && group.items[0] ? group.items[0] : {};
            const lowestPriceItem = group.sanPhamGiaThapNhat || firstItem;
            return {
              id: group.maSPCH || group.maNhomTam,
              maSPCH: group.maSPCH || group.maNhomTam,
              tenSanPham: group.tenChuanHoa || 'Sáº£n pháº©m',
              tenChuanHoa: group.tenChuanHoa || 'Sáº£n pháº©m',
              thuongHieu: hienThiThuongHieu(group.thuongHieu || firstItem.attributes?.brand || 'Khác'),
              dungLuong: group.dungLuong,
              danhMuc: hienThiDanhMuc(group.productType || 'Äiá»‡n thoáº¡i'),
              tinhTrang: group.tinhTrang || firstItem.tinhTrang || 'new',
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
                ngayCapNhat: item.ngayCapNhat,
                tinhTrang: item.tinhTrang || group.tinhTrang || 'new'
              })),
              items: group.items || []
            };
          });
        } 
        // Fallback sang items thÃ´ náº¿u khÃ´ng cÃ³ groups
        else if (rawData.items && rawData.items.length > 0) {
          mappedProducts = rawData.items.map(item => {
            return {
              id: item.maSPCH || item.maSPTho || Math.floor(Math.random() * 10000),
              maSPCH: item.maSPCH,
              tenSanPham: item.tenSanPham || 'Sáº£n pháº©m',
              tenChuanHoa: item.tenSanPham || 'Sáº£n pháº©m',
              thuongHieu: hienThiThuongHieu(item.attributes?.brand || 'Khác'),
              dungLuong: null,
              danhMuc: hienThiDanhMuc('phone'),
              tinhTrang: item.tinhTrang || 'new',
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
                ngayCapNhat: item.ngayCapNhat,
                tinhTrang: item.tinhTrang || 'new'
              }],
              items: [item]
            };
          });
        }

        // Ãp dá»¥ng bá»™ lá»c cá»¥c bá»™ trÃªn danh sÃ¡ch sáº£n pháº©m láº¥y tá»« API
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
      throw new Error('KhÃ´ng nháº­n Ä‘Æ°á»£c dá»¯ liá»‡u há»£p lá»‡ tá»« mÃ¡y chá»§ API.');
    } catch (error) {
      console.warn('API Search failed:', error.message);
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout');
      const errorMessage = isTimeout 
        ? 'Yêu cầu tìm kiếm bị quá hạn. Vui lòng thử lại.' 
        : (error.message || 'Lá»—i káº¿t ná»‘i mÃ¡y chá»§ API.');

      if (isTimeout && autoScrape) {
        try {
          const cachedResult = await productService.timKiemSanPham(keyword, false, filters);

          if (cachedResult.data && cachedResult.data.length > 0) {
            return {
              data: cachedResult.data,
              errorMessage: 'Dá»¯ liá»‡u má»›i Ä‘ang Ä‘Æ°á»£c cáº­p nháº­t lÃ¢u hÆ¡n dá»± kiáº¿n. Táº¡m hiá»ƒn thá»‹ káº¿t quáº£ Ä‘Ã£ lÆ°u gáº§n nháº¥t.',
              fromCache: true
            };
          }
        } catch (fallbackError) {
          console.warn('Cache fallback search failed:', fallbackError.message);
        }
      }

      return {
        data: [],

        errorMessage: errorMessage
      };
    }
  },

  // 2. Create search job for background scraping
  taoSearchJob: async (keyword) => {
    try {
      const response = await api.post('/search/jobs', null, {
        params: { keyword }
      });

      return {
        data: extractData(response),
        errorMessage: null
      };
    } catch (error) {
      console.warn('Create search job failed:', error.message);
      return {
        data: null,
        errorMessage: error.message || 'Không thể tạo tác vụ tìm kiếm.'
      };
    }
  },

  // 3. Get search job status for polling
  layTrangThaiSearchJob: async (jobId) => {
    try {
      const response = await api.get(`/search/jobs/${jobId}`);

      return {
        data: extractData(response),
        errorMessage: null
      };
    } catch (error) {
      console.warn('Get search job status failed:', error.message);
      return {
        data: null,
        errorMessage: error.message || 'Không thể lấy trạng thái tác vụ tìm kiếm.'
      };
    }
  },

  // 4. Get product detail
  layChiTietSanPham: async (id) => {
    try {
      const response = await api.get(`/products/compare/${id}`);
      const rawData = extractData(response);

      if (rawData && rawData.items) {
        const items = [...rawData.items].sort((a, b) => {
          const giaA = Number(a.giaHienTai) || Infinity;
          const giaB = Number(b.giaHienTai) || Infinity;
          return giaA - giaB;
        });

        const firstItem = items[0] || {};
        const standardizedProduct = rawData.standardized_product || {};
        const tenChuanHoa = standardizedProduct.tenChuanHoa || firstItem.tenSanPham || 'Sáº£n pháº©m';
        const tinhTrang = standardizedProduct.tinhTrang || firstItem.tinhTrang || 'new';
        const thuongHieu = hienThiThuongHieu(standardizedProduct.thuongHieu || firstItem.attributes?.brand || 'Khác');
        const danhMuc = hienThiDanhMuc(standardizedProduct.productType || 'Äiá»‡n thoáº¡i');
        const hinhAnh = standardizedProduct.anhDaiDien || firstItem.hinhAnh || '';

        const sanDangBan = [
          ...new Set(items.map(item => item.sanTMDT).filter(Boolean))
        ];

        return {
          data: {
            id: Number(id),
            maSPCH: Number(id),
            tenSanPham: tenChuanHoa,
            tenChuanHoa,
            thuongHieu,
            dungLuong: standardizedProduct.dungLuong || null,
            modelKey: standardizedProduct.modelKey || null,
            tinhTrang,
            danhMuc,
            hinhAnh,
            giaThapNhat: rawData.lowest_price || firstItem.giaHienTai || 0,
            giaCaoNhat: rawData.highest_price || firstItem.giaHienTai || 0,
            giaGoc: (rawData.lowest_price || firstItem.giaHienTai || 0) * 1.15,
            phanTramGiam: 15,
            soNoiBan: rawData.total_merchants || items.length || 0,
            danhGia: firstItem.danhGia,
            soLuongDanhGia: firstItem.soLuongDanhGia || 0,
            sanDangBan,
            linkMuaTotNhat: firstItem.linkGoc || '',
            domain: getDomainName(firstItem.sanTMDT, firstItem.linkGoc),
            thongSoKyThuat: firstItem.attributes || {},
            standardizedProduct,
            items,
            noiBanChiTiet: items.map((item) => ({
              maSPTho: item.maSPTho,
              logo: getLogoName(item.sanTMDT),
              san: item.sanTMDT,
              domain: getDomainName(item.sanTMDT, item.linkGoc),
              tenNoiBan: item.tenSanPham,
              gia: Number(item.giaHienTai),
              danhGia: item.danhGia,
              soLuongDanhGia: item.soLuongDanhGia || 0,
              capNhat: item.ngayCapNhat ? new Date(item.ngayCapNhat).toLocaleString('vi-VN') : 'Vừa cập nhật',
              link: item.linkGoc,
              tinhTrang: item.tinhTrang || tinhTrang
            }))
          },

          errorMessage: null
        };
      }

      throw new Error('KhÃ´ng tÃ¬m tháº¥y thÃ´ng tin sáº£n pháº©m chuáº©n hÃ³a.');
    } catch (error) {
      console.warn('API Detail failed:', error.message);
      return {
        data: null,

        errorMessage: error.message || 'KhÃ´ng tÃ¬m tháº¥y sáº£n pháº©m'
      };
    }
  },

  // 5. Get price comparison table
  laySoSanhGia: async (id) => {
    try {
      const response = await api.get(`/products/compare/${id}`);
      const rawData = extractData(response);

      if (rawData && rawData.items) {
        const standardizedProduct = rawData.standardized_product || {};
        const tinhTrang = standardizedProduct.tinhTrang || 'new';

        const mappedOffers = [...rawData.items]
          .sort((a, b) => {
            const giaA = Number(a.giaHienTai) || Infinity;
            const giaB = Number(b.giaHienTai) || Infinity;
            return giaA - giaB;
          })
          .map((item) => ({
            maSPTho: item.maSPTho,
            logo: getLogoName(item.sanTMDT),
            san: item.sanTMDT,
            domain: getDomainName(item.sanTMDT, item.linkGoc),
            tenNoiBan: item.tenSanPham,
            gia: Number(item.giaHienTai),
            danhGia: item.danhGia,
            soLuongDanhGia: item.soLuongDanhGia || 0,
            capNhat: item.ngayCapNhat ? new Date(item.ngayCapNhat).toLocaleString('vi-VN') : 'Vừa cập nhật',
            link: item.linkGoc,
            tinhTrang: item.tinhTrang || tinhTrang
          }));

        return {
          data: mappedOffers,

          errorMessage: null
        };
      }

      throw new Error('KhÃ´ng tÃ¬m tháº¥y thÃ´ng tin so sÃ¡nh.');
    } catch (error) {
      console.warn('API Compare failed:', error.message);
      return {
        data: [],

        errorMessage: error.message || 'Lá»—i káº¿t ná»‘i mÃ¡y chá»§ API'
      };
    }
  },

  // 6. Get price history (Call real backend API)
  layLichSuGia: async (id, range = '1_month') => {
    try {
      const response = await api.get(`/products/${id}/history`);
      const payload = response?.data?.data || response?.data || response;
      const rawGroups = Array.isArray(payload) ? payload : [];
      
      const historyData = [];

      rawGroups.forEach((group) => {
        const histories = Array.isArray(group.history) ? group.history : [];
        histories.forEach((point) => {
          historyData.push({
            maSPTho: group.maSPTho,
            sanTMDT: group.sanTMDT,
            gia: Number(point.gia),
            ngayGhiNhan: point.ngayGhiNhan
          });
        });
      });

      return {
        data: historyData,
        errorMessage: null
      };
    } catch (error) {
      console.error('API History failed:', error?.message);
      return {
        data: [],
        errorMessage: error?.message || 'Lỗi kết nối lịch sử giá'
      };
    }
  }
};


