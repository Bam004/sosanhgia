import api from './api';

export const theoDoiGiaService = {
  taoTheoDoiGia: async (payload) => {
    const response = await api.post('/theo-doi-gia', payload);
    return response.data;
  },

  layDanhSachTheoDoi: async () => {
    const response = await api.get('/theo-doi-gia');
    return response.data;
  },

  kiemTraTheoDoi: async (maSPCH) => {
    const response = await api.get(`/theo-doi-gia/check/${maSPCH}`);
    return response.data;
  },

  capNhatTheoDoi: async (maTheoDoi, payload) => {
    const response = await api.put(`/theo-doi-gia/${maTheoDoi}`, payload);
    return response.data;
  },

  huyTheoDoi: async (maTheoDoi) => {
    const response = await api.delete(`/theo-doi-gia/${maTheoDoi}`);
    return response.data;
  }
};
