from uuid import uuid4
from unittest.mock import patch


from fastapi.testclient import TestClient

from backend.app.core.database import SessionLocal
from backend.app.main import app
from backend.app.models import (
    EmailNotificationLog,
    TaiKhoan,
)
from backend.app.core.security import hash_password

client = TestClient(app)


def tao_admin_va_token():
    email = f"admin_{uuid4().hex}@example.com"

    db = SessionLocal()

    admin = TaiKhoan(
        hoTen="Admin Test",
        email=email,
        matKhauHash=hash_password("admin123"),
        vaiTro="admin",
        trangThai="active",
    )

    db.add(admin)
    db.commit()
    db.refresh(admin)

    db.close()

    return admin


def tao_nhat_ky_that_bai(
    ma_tai_khoan: int,
) -> EmailNotificationLog:
    db = SessionLocal()

    nhat_ky = EmailNotificationLog(
        maTaiKhoan=ma_tai_khoan,
        emailNhan="receiver@example.com",
        tenNguoiNhan="Người nhận",
        tieuDe="Sản phẩm đã đạt mức giá bạn mong muốn",
        loaiThongBao="price_alert",
        tenSanPham="Test Phone",
        giaMucTieu=12000000,
        giaHienTai=10000000,
        nguonGia="Shopee",
        linkSanPham="http://localhost:5173/san-pham/1",
        linkGoc="http://test",
        trangThai="failed",
        soLanThu=1,
        loiGanNhat="SMTP failure",
    )

    db.add(nhat_ky)
    db.commit()
    db.refresh(nhat_ky)

    db.expunge(nhat_ky)
    db.close()

    return nhat_ky


def xoa_du_lieu_test(
    ma_tai_khoan: int,
):
    db = SessionLocal()

    db.query(EmailNotificationLog).filter(
        EmailNotificationLog.maTaiKhoan
        == ma_tai_khoan
    ).delete(synchronize_session=False)

    db.query(TaiKhoan).filter(
        TaiKhoan.maTaiKhoan
        == ma_tai_khoan
    ).delete(synchronize_session=False)

    db.commit()
    db.close()


def test_admin_email_logs_requires_authentication():
    response = client.get(
        "/api/admin/email-logs"
    )

    assert response.status_code in {401, 403}


def test_admin_email_logs_list_and_detail(
    monkeypatch,
):
    admin = tao_admin_va_token()
    nhat_ky = tao_nhat_ky_that_bai(
        admin.maTaiKhoan
    )

    try:
        from backend.app.api import auth

        monkeypatch.setattr(
            auth,
            "ADMIN_EMAIL",
            admin.email.lower(),
        )

        response_login = client.post(
            "/api/auth/login",
            json={
                "email": admin.email,
                "matKhau": "admin123",
            },
        )

        assert response_login.status_code == 200

        token = (
            response_login.json()
            .get("data", {})
            .get("accessToken")
        )

        assert token

        headers = {
            "Authorization": f"Bearer {token}"
        }

        response_list = client.get(
            "/api/admin/email-logs",
            headers=headers,
        )

        assert response_list.status_code == 200
        assert response_list.json()["success"] is True

        response_detail = client.get(
            (
                "/api/admin/email-logs/"
                f"{nhat_ky.maNhatKyEmail}"
            ),
            headers=headers,
        )

        assert response_detail.status_code == 200

        data = response_detail.json()["data"]

        assert (
            data["maNhatKyEmail"]
            == nhat_ky.maNhatKyEmail
        )
        assert data["trangThai"] == "failed"

    finally:
        xoa_du_lieu_test(
            admin.maTaiKhoan
        )


@patch(
    "backend.app.api.admin_email_logs."
    "send_price_alert_email"
)
def test_admin_can_retry_failed_email(
    mock_send_email,
    monkeypatch,
):
    mock_send_email.return_value = {
        "success": True,
        "error": None,
    }

    admin = tao_admin_va_token()
    nhat_ky = tao_nhat_ky_that_bai(
        admin.maTaiKhoan
    )

    try:
        from backend.app.api import auth

        monkeypatch.setattr(
            auth,
            "ADMIN_EMAIL",
            admin.email.lower(),
        )

        response_login = client.post(
            "/api/auth/login",
            json={
                "email": admin.email,
                "matKhau": "admin123",
            },
        )

        assert response_login.status_code == 200

        token = (
            response_login.json()
            .get("data", {})
            .get("accessToken")
        )

        headers = {
            "Authorization": f"Bearer {token}"
        }

        response_retry = client.post(
            (
                "/api/admin/email-logs/"
                f"{nhat_ky.maNhatKyEmail}/retry"
            ),
            headers=headers,
        )

        assert response_retry.status_code == 200
        assert response_retry.json()["success"] is True
        assert (
            response_retry.json()["data"]["trangThai"]
            == "sent"
        )
        assert (
            response_retry.json()["data"]["soLanThu"]
            == 2
        )

        assert mock_send_email.call_count == 1

    finally:
        xoa_du_lieu_test(
            admin.maTaiKhoan
        )

