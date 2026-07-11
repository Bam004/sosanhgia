import api from './api';

export const authService = {
  dangKy: async (payload) => {
    const response = await api.post('/auth/register', payload);
    return response.data;
  },
  dangNhap: async (payload) => {
    const response = await api.post('/auth/login', payload);
    return response.data;
  },
  layThongTinTaiKhoan: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  dangXuat: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  }
};
