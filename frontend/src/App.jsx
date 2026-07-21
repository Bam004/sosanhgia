import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/user/ProtectedRoute";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";

import BoCucNguoiDung from "./layouts/BoCucNguoiDung";
import BoCucQuanTri from "./layouts/BoCucQuanTri";

const TrangChu = lazy(() => import("./pages/user/TrangChu"));
const KetQuaTimKiem = lazy(() => import("./pages/user/KetQuaTimKiem"));
const ChiTietSanPham = lazy(() => import("./pages/user/ChiTietSanPham"));
const BieuDoLichSuGia = lazy(
  () => import("./pages/user/BieuDoLichSuGia")
);
const TheoDoiGia = lazy(() => import("./pages/user/TheoDoiGia"));
const ThongTinTaiKhoan = lazy(
  () => import("./pages/user/ThongTinTaiKhoan")
);
const SanPhamTheoDoi = lazy(
  () => import("./pages/user/SanPhamTheoDoi")
);
const DangNhap = lazy(() => import("./pages/user/DangNhap"));
const DangKy = lazy(() => import("./pages/user/DangKy"));

const TongQuanQuanTri = lazy(
  () => import("./pages/admin/TongQuanQuanTri")
);
const QuanLyNguonCao = lazy(
  () => import("./pages/admin/QuanLyNguonCao")
);
const QuanLyTienTrinhScraping = lazy(
  () => import("./pages/admin/QuanLyTienTrinhScraping")
);
const NhatKyLoiScraping = lazy(
  () => import("./pages/admin/NhatKyLoiScraping")
);
const QuanLySanPhamTho = lazy(
  () => import("./pages/admin/QuanLySanPhamTho")
);
const QuanLySanPhamChuanHoa = lazy(
  () => import("./pages/admin/QuanLySanPhamChuanHoa")
);
const QuanLyGomNhomSanPham = lazy(
  () => import("./pages/admin/QuanLyGomNhomSanPham")
);
const QuanLyTaiKhoan = lazy(
  () => import("./pages/admin/QuanLyTaiKhoan")
);
const QuanLyTheoDoiGia = lazy(
  () => import("./pages/admin/QuanLyTheoDoiGia")
);
const NhatKyEmail = lazy(
  () => import("./pages/admin/NhatKyEmail")
);

export default function App() {
  return (
    <Suspense fallback={<div>Đang tải trang...</div>}>
      <Routes>
        {/* Khu vực người dùng */}
        <Route element={<BoCucNguoiDung />}>
          <Route path="/" element={<TrangChu />} />
          <Route path="/tim-kiem" element={<KetQuaTimKiem />} />
          <Route path="/san-pham/:id" element={<ChiTietSanPham />} />

          <Route
            path="/san-pham/:id/lich-su-gia"
            element={<BieuDoLichSuGia />}
          />

          <Route
            path="/theo-doi-gia"
            element={
              <ProtectedRoute>
                <TheoDoiGia />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tai-khoan"
            element={
              <ProtectedRoute>
                <ThongTinTaiKhoan />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tai-khoan/thong-tin"
            element={
              <ProtectedRoute>
                <ThongTinTaiKhoan />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tai-khoan/san-pham-theo-doi"
            element={
              <ProtectedRoute>
                <SanPhamTheoDoi />
              </ProtectedRoute>
            }
          />

          <Route path="/dang-nhap" element={<DangNhap />} />
          <Route path="/dang-ky" element={<DangKy />} />
        </Route>

        {/* Toàn bộ khu vực Admin được bảo vệ tại route cha */}
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <BoCucQuanTri />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<TongQuanQuanTri />} />

          <Route
            path="tai-khoan"
            element={<QuanLyTaiKhoan />}
          />

          <Route
            path="theo-doi-gia"
            element={<QuanLyTheoDoiGia />}
          />

          <Route
            path="nhat-ky-email"
            element={<NhatKyEmail />}
          />

          <Route
            path="nguon-cao"
            element={<QuanLyNguonCao />}
          />

          <Route
            path="tien-trinh-scraping"
            element={<QuanLyTienTrinhScraping />}
          />

          <Route
            path="nhat-ky-loi"
            element={<NhatKyLoiScraping />}
          />

          <Route
            path="san-pham-tho"
            element={<QuanLySanPhamTho />}
          />

          <Route
            path="san-pham-chuan-hoa"
            element={<QuanLySanPhamChuanHoa />}
          />

          <Route
            path="gom-nhom-san-pham"
            element={<QuanLyGomNhomSanPham />}
          />
        </Route>
      </Routes>
    </Suspense>
  );
}