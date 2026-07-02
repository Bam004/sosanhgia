import { Routes, Route } from 'react-router-dom';

import BoCucNguoiDung from './layouts/BoCucNguoiDung';
import BoCucQuanTri from './layouts/BoCucQuanTri';

import TrangChu from './pages/user/TrangChu';
import KetQuaTimKiem from './pages/user/KetQuaTimKiem';
import ChiTietSanPham from './pages/user/ChiTietSanPham';
import BieuDoLichSuGia from './pages/user/BieuDoLichSuGia';
import TheoDoiGia from './pages/user/TheoDoiGia';
import ThongTinTaiKhoan from './pages/user/ThongTinTaiKhoan';
import SanPhamTheoDoi from './pages/user/SanPhamTheoDoi';
import DangNhap from './pages/user/DangNhap';
import DangKy from './pages/user/DangKy';

import TongQuanQuanTri from './pages/admin/TongQuanQuanTri';
import QuanLyNguonCao from './pages/admin/QuanLyNguonCao';
import QuanLyTienTrinhScraping from './pages/admin/QuanLyTienTrinhScraping';
import NhatKyLoiScraping from './pages/admin/NhatKyLoiScraping';
import QuanLySanPhamTho from './pages/admin/QuanLySanPhamTho';
import QuanLySanPhamChuanHoa from './pages/admin/QuanLySanPhamChuanHoa';
import QuanLyGomNhomSanPham from './pages/admin/QuanLyGomNhomSanPham';

export default function App() {
  return (
    <Routes>
      <Route element={<BoCucNguoiDung />}>
        <Route path="/" element={<TrangChu />} />
        <Route path="/tim-kiem" element={<KetQuaTimKiem />} />
        <Route path="/san-pham/:id" element={<ChiTietSanPham />} />
        <Route path="/san-pham/:id/lich-su-gia" element={<BieuDoLichSuGia />} />
        <Route path="/theo-doi-gia" element={<TheoDoiGia />} />
        <Route path="/tai-khoan" element={<ThongTinTaiKhoan />} />
        <Route path="/tai-khoan/san-pham-theo-doi" element={<SanPhamTheoDoi />} />
        <Route path="/dang-nhap" element={<DangNhap />} />
        <Route path="/dang-ky" element={<DangKy />} />
      </Route>

      <Route path="/admin" element={<BoCucQuanTri />}>
        <Route index element={<TongQuanQuanTri />} />
        <Route path="nguon-cao" element={<QuanLyNguonCao />} />
        <Route path="tien-trinh-scraping" element={<QuanLyTienTrinhScraping />} />
        <Route path="nhat-ky-loi" element={<NhatKyLoiScraping />} />
        <Route path="san-pham-tho" element={<QuanLySanPhamTho />} />
        <Route path="san-pham-chuan-hoa" element={<QuanLySanPhamChuanHoa />} />
        <Route path="gom-nhom-san-pham" element={<QuanLyGomNhomSanPham />} />
      </Route>
    </Routes>
  );
}
