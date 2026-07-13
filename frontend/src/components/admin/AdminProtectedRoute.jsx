import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authService } from "../../services/authService";
import { buildLoginUrl } from "../../utils/returnUrl";

const ADMIN_EMAIL = "sosanhgia@gmail.com";

export default function AdminProtectedRoute({ children }) {
  const location = useLocation();

  const [authState, setAuthState] = useState({
    loading: true,
    authorized: false,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function kiemTraQuyenAdmin() {
      const token = localStorage.getItem("accessToken");

      if (!token) {
        if (isMounted) {
          setAuthState({
            loading: false,
            authorized: false,
            error: null,
          });
        }

        return;
      }

      try {
        const response = await authService.layThongTinTaiKhoan();
        const taiKhoan = response?.data;

        const email = String(taiKhoan?.email || "")
          .trim()
          .toLowerCase();

        const vaiTro = String(taiKhoan?.vaiTro || "")
          .trim()
          .toLowerCase();

        const laAdmin =
          email === ADMIN_EMAIL &&
          vaiTro === "admin";

        if (!laAdmin) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
        } else {
          localStorage.setItem(
            "user",
            JSON.stringify(taiKhoan)
          );
        }

        if (isMounted) {
          setAuthState({
            loading: false,
            authorized: laAdmin,
            error: null,
          });
        }
      } catch (error) {
        if (!isMounted) return;

        if (
          error.response?.status === 401 ||
          error.response?.status === 403
        ) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");

          setAuthState({
            loading: false,
            authorized: false,
            error: null,
          });
        } else {
          setAuthState({
            loading: false,
            authorized: false,
            error:
              "Không thể kết nối máy chủ để kiểm tra quyền quản trị.",
          });
        }
      }
    }

    kiemTraQuyenAdmin();

    return () => {
      isMounted = false;
    };
  }, []);

  if (authState.loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Đang kiểm tra quyền quản trị...
      </div>
    );
  }

  if (authState.error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "40px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#ef4444" }}>
          {authState.error}
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!authState.authorized) {
    const duongDanHienTai =
      location.pathname +
      location.search +
      location.hash;

    return (
      <Navigate
        to={buildLoginUrl(duongDanHienTai)}
        replace
      />
    );
  }

  return children;
}