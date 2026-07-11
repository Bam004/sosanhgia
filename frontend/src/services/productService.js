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

const SOURCE_ALIASES = {
  cellphones: ['cellphones', 'cellphone s', 'cell phone s', 'cellphones.com.vn'],
  fptshop: ['fptshop', 'fpt shop', 'fptshop.com.vn', 'fpt'],
  hoangha: ['hoangha', 'hoang ha', 'hoàng hà', 'hoanghamobile', 'hoàng hà mobile', 'hoang ha mobile'],
  lazada: ['lazada', 'lazadavn', 'lazada.vn'],
  tiki: ['tiki', 'tiki.vn', 'tikivn'],
  shopee: ['shopee', 'shopee.vn', 'shopeevn'],
  tiktok: ['tiktok', 'tiktok shop', 'tiktokshop'],
  didongviet: ['didongviet', 'di dong viet', 'di động việt'],
  thegioididong: ['thegioididong', 'thế giới di động', 'tgdd'],
  dienmayxanh: ['dienmayxanh', 'điện máy xanh', 'dmx']
};

const getSourceCode = (sanTMDT) => {
  const name = normalizeText(sanTMDT);
  if (!name) return 'unknown';
  for (const [code, aliases] of Object.entries(SOURCE_ALIASES)) {
    if (aliases.includes(name)) return code;
  }
  for (const [code, aliases] of Object.entries(SOURCE_ALIASES)) {
    if (aliases.some(alias => name.includes(alias))) return code;
  }
  return name.replace(/[^a-z0-9]/g, '_');
};

// Helper function to format platform name to class/logo
const getLogoName = (sanTMDT) => {
  const code = getSourceCode(sanTMDT);
  if (SOURCE_ALIASES[code]) return code;
  return 'lazada'; // fallback
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

  const code = getSourceCode(sanTMDT);
  const domainMapping = {
    cellphones: 'cellphones.com.vn',
    fptshop: 'fptshop.com.vn',
    hoangha: 'hoanghamobile.com',
    lazada: 'lazada.vn',
    tiki: 'tiki.vn',
    shopee: 'shopee.vn',
    tiktok: 'tiktok.com',
    didongviet: 'didongviet.vn',
    thegioididong: 'thegioididong.com',
    dienmayxanh: 'dienmayxanh.com'
  };
  return domainMapping[code] || 'lazada.vn';
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

  return mapping[normalized] || brand || 'Khác';
};

const hienThiDanhMuc = (productType) => {
  const normalized = normalizeText(productType);

  const mapping = {
    phone: 'Điện thoại',
    accessory: 'Phụ kiện',
    repair_service: 'Dịch vụ sửa chữa',
    laptop: 'Laptop',
    tablet: 'Máy tính bảng',
    tv: 'Tivi',
    monitor: 'Màn hình',
    pc: 'PC',
    audio: 'Âm thanh'
  };

  return mapping[normalized] || productType || 'Điện thoại';
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
              thuongHieu: hienThiThuongHieu(group.thuongHieu || firstItem.attributes?.brand || 'Khác'),
              dungLuong: group.dungLuong,
              danhMuc: hienThiDanhMuc(group.productType || 'Điện thoại'),
              tinhTrang: group.tinhTrang || firstItem.tinhTrang || 'new',
              hinhAnh: group.sanPhamGiaThapNhat?.hinhAnh || firstItem.hinhAnh || '',
              giaThapNhat: group.giaThapNhat || 0,
              giaCaoNhat: group.giaCaoNhat || 0,
              giaGoc: (group.giaThapNhat || 0) * 1.15,
              phanTramGiam: 15,
              soNoiBan: group.soNguon || 1,
              soOffer: group.soOffer || group.items?.length || 1,
              sanDangBan: group.nguon || [],
              nguon: group.nguon || [],
              sources: group.sources || [],
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
        // Fallback sang items thô nếu không có groups
        else if (rawData.items && rawData.items.length > 0) {
          mappedProducts = rawData.items.map(item => {
            return {
              id: item.maSPCH || item.maSPTho || Math.floor(Math.random() * 10000),
              maSPCH: item.maSPCH,
              tenSanPham: item.tenSanPham || 'Sản phẩm',
              tenChuanHoa: item.tenSanPham || 'Sản phẩm',
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
              soOffer: 1,
              sanDangBan: [item.sanTMDT],
              nguon: [item.sanTMDT],
              sources: [{
                sourceCode: getSourceCode(item.sanTMDT),
                sourceName: item.sanTMDT,
                giaThapNhat: item.giaHienTai,
                offerCount: 1
              }],
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
          errorMessage: null,
          cache_hit: rawData.cache_hit || false
        };
      }
      throw new Error('Không nhận được dữ liệu hợp lệ từ máy chủ API.');
    } catch (error) {
      console.warn('API Search failed:', error.message);
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout');
      const errorMessage = isTimeout 
        ? 'Yêu cầu tìm kiếm bị quá hạn. Vui lòng thử lại.' 
        : (error.message || 'Lỗi kết nối máy chủ API.');

      if (isTimeout && autoScrape) {
        try {
          const cachedResult = await productService.timKiemSanPham(keyword, false, filters);

          if (cachedResult.data && cachedResult.data.length > 0) {
            return {
              data: cachedResult.data,
              errorMessage: 'Dữ liệu mới đang được cập nhật lâu hơn dự kiến. Tạm hiển thị kết quả đã lưu gần nhất.',
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
        const standardizedProduct = rawData.product || rawData.standardized_product || {};
        const summary = rawData.summary || {};
        const tenChuanHoa = standardizedProduct.tenChuanHoa || firstItem.tenSanPham || 'Sản phẩm';
        const tinhTrang = standardizedProduct.tinhTrang || firstItem.tinhTrang || 'new';
        const thuongHieu = hienThiThuongHieu(standardizedProduct.thuongHieu || firstItem.attributes?.brand || 'Khác');
        const danhMuc = hienThiDanhMuc(standardizedProduct.productType || 'Điện thoại');
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
            giaThapNhat: summary.lowest_price || rawData.lowest_price || firstItem.giaHienTai || 0,
            giaCaoNhat: summary.highest_price || rawData.highest_price || firstItem.giaHienTai || 0,
            giaGoc: (summary.lowest_price || rawData.lowest_price || firstItem.giaHienTai || 0) * 1.15,
            phanTramGiam: 15,
            soNoiBan: summary.source_count || rawData.total_merchants || items.length || 0,
            soOffer: summary.offer_count || items.length || 0,
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
              sourceCode: getSourceCode(item.sanTMDT),
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

      throw new Error('Không tìm thấy thông tin sản phẩm chuẩn hóa.');
    } catch (error) {
      console.warn('API Detail failed:', error.message);
      return {
        data: null,

        errorMessage: error.message || 'Không tìm thấy sản phẩm'
      };
    }
  },

  // 5. Get price comparison table
  laySoSanhGia: async (id) => {
    try {
      const response = await api.get(`/products/compare/${id}`);
      const rawData = extractData(response);

      if (rawData && rawData.items) {
        const standardizedProduct = rawData.product || rawData.standardized_product || {};
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
            sourceCode: getSourceCode(item.sanTMDT),
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

      throw new Error('Không tìm thấy thông tin so sánh.');
    } catch (error) {
      console.warn('API Compare failed:', error.message);
      return {
        data: [],

        errorMessage: error.message || 'Lỗi kết nối máy chủ API'
      };
    }
  },

  // 6. Get price history (Call real backend API)
  layLichSuGia: async (id, range = 'all') => {
    try {
      const response = await api.get(`/products/${id}/history?range=${range}`);
      const payload = response?.data?.data || response?.data || response;
      
      const series = payload.series || [];
      const sourceCount = payload.sourceCount || 0;
      const pointCount = payload.pointCount || 0;
      const rangeSummary = payload.rangeSummary || null;
      const allTimeLow = payload.allTimeLow || null;

      return {
        data: {
          series,
          sourceCount,
          pointCount,
          rangeSummary,
          allTimeLow
        },
        errorMessage: null
      };
    } catch (error) {
      console.error('API History failed:', error?.message);
      return {
        data: { series: [], sourceCount: 0, pointCount: 0, rangeSummary: null, allTimeLow: null },
        errorMessage: error?.message || 'Lỗi kết nối lịch sử giá'
      };
    }
  }
};


