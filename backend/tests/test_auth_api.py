from uuid import uuid4

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient

import backend.app.api.auth as auth_module
from backend.app.api.auth import require_admin
from backend.app.core.database import SessionLocal
from backend.app.core.security import create_access_token
from backend.app.main import app
from backend.app.models import TaiKhoan


@app.get("/api/auth/test-admin-only")
def dummy_admin_only_endpoint(
    current_user: TaiKhoan = Depends(require_admin),
):
    return {
        "success": True,
        "role": current_user.vaiTro,
    }


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def account_data():
    email = f"auth_test_{uuid4().hex}@example.com"

    data = {
        "hoTen": "Tài Khoản Kiểm Thử",
        "email": email,
        "matKhau": "Test123!",
        "xacNhanMatKhau": "Test123!",
    }

    yield data

    db = SessionLocal()

    try:
        (
            db.query(TaiKhoan)
            .filter(TaiKhoan.email == email)
            .delete(synchronize_session=False)
        )
        db.commit()
    finally:
        db.close()


def register_account(client, account_data, **overrides):
    payload = {
        **account_data,
        **overrides,
    }

    return client.post(
        "/api/auth/register",
        json=payload,
    )


def login_account(client, email, password):
    return client.post(
        "/api/auth/login",
        json={
            "email": email,
            "matKhau": password,
        },
    )


def test_register_normalizes_data_and_forces_user_role(
    client,
    account_data,
):
    response = register_account(
        client,
        account_data,
        hoTen="  Tài Khoản Kiểm Thử  ",
        email=account_data["email"].upper(),
        vaiTro="admin",
        trangThai="inactive",
    )

    assert response.status_code == 201

    body = response.json()
    user_data = body["data"]

    assert body["success"] is True
    assert user_data["hoTen"] == "Tài Khoản Kiểm Thử"
    assert user_data["email"] == account_data["email"]
    assert user_data["vaiTro"] == "user"
    assert "matKhauHash" not in user_data

    db = SessionLocal()

    try:
        user = (
            db.query(TaiKhoan)
            .filter(TaiKhoan.email == account_data["email"])
            .first()
        )

        assert user is not None
        assert user.hoTen == "Tài Khoản Kiểm Thử"
        assert user.vaiTro == "user"
        assert user.trangThai == "active"
    finally:
        db.close()


def test_register_duplicate_email_returns_conflict(
    client,
    account_data,
):
    first_response = register_account(
        client,
        account_data,
    )

    assert first_response.status_code == 201

    duplicate_response = register_account(
        client,
        account_data,
        email=account_data["email"].upper(),
    )

    assert duplicate_response.status_code == 409

    body = duplicate_response.json()

    assert body["success"] is False
    assert body["message"] == "Email đã tồn tại trong hệ thống"


def test_login_and_me_flow(
    client,
    account_data,
):
    register_response = register_account(
        client,
        account_data,
    )

    assert register_response.status_code == 201

    wrong_password_response = login_account(
        client,
        account_data["email"],
        "SaiMatKhau",
    )

    assert wrong_password_response.status_code == 401

    login_response = login_account(
        client,
        account_data["email"].upper(),
        account_data["matKhau"],
    )

    assert login_response.status_code == 200

    login_body = login_response.json()
    access_token = login_body["data"]["accessToken"]
    user_data = login_body["data"]["user"]

    assert login_body["success"] is True
    assert user_data["email"] == account_data["email"]
    assert user_data["vaiTro"] == "user"
    assert "matKhauHash" not in user_data

    missing_token_response = client.get(
        "/api/auth/me",
    )

    assert missing_token_response.status_code == 401

    me_response = client.get(
        "/api/auth/me",
        headers={
            "Authorization": f"Bearer {access_token}",
        },
    )

    assert me_response.status_code == 200

    me_data = me_response.json()["data"]

    assert me_data["email"] == account_data["email"]
    assert me_data["vaiTro"] == "user"
    assert "matKhauHash" not in me_data


def test_me_rejects_invalid_token_payloads(
    client,
):
    invalid_token_response = client.get(
        "/api/auth/me",
        headers={
            "Authorization": "Bearer invalid-token",
        },
    )

    assert invalid_token_response.status_code == 401

    invalid_sub_token = create_access_token(
        {"sub": "abc"}
    )

    invalid_sub_response = client.get(
        "/api/auth/me",
        headers={
            "Authorization": f"Bearer {invalid_sub_token}",
        },
    )

    assert invalid_sub_response.status_code == 401

    missing_user_token = create_access_token(
        {"sub": "999999999"}
    )

    missing_user_response = client.get(
        "/api/auth/me",
        headers={
            "Authorization": f"Bearer {missing_user_token}",
        },
    )

    assert missing_user_response.status_code == 401


def test_inactive_account_cannot_login_or_use_existing_token(
    client,
    account_data,
):
    register_response = register_account(
        client,
        account_data,
    )

    assert register_response.status_code == 201

    login_response = login_account(
        client,
        account_data["email"],
        account_data["matKhau"],
    )

    assert login_response.status_code == 200

    access_token = login_response.json()["data"]["accessToken"]

    db = SessionLocal()

    try:
        user = (
            db.query(TaiKhoan)
            .filter(TaiKhoan.email == account_data["email"])
            .first()
        )

        assert user is not None

        user.trangThai = "inactive"
        db.commit()
    finally:
        db.close()

    inactive_login_response = login_account(
        client,
        account_data["email"],
        account_data["matKhau"],
    )

    assert inactive_login_response.status_code == 403

    inactive_me_response = client.get(
        "/api/auth/me",
        headers={
            "Authorization": f"Bearer {access_token}",
        },
    )

    assert inactive_me_response.status_code == 403


def test_require_admin_rejects_normal_user(
    client,
    account_data,
):
    register_response = register_account(
        client,
        account_data,
    )

    assert register_response.status_code == 201

    login_response = login_account(
        client,
        account_data["email"],
        account_data["matKhau"],
    )

    assert login_response.status_code == 200

    access_token = login_response.json()["data"]["accessToken"]

    admin_response = client.get(
        "/api/auth/test-admin-only",
        headers={
            "Authorization": f"Bearer {access_token}",
        },
    )

    assert admin_response.status_code == 403
    assert (
        admin_response.json()["detail"]
        == "Yêu cầu quyền quản trị viên"
    )


def test_require_admin_accepts_admin_role(
    client,
    account_data,
    monkeypatch,
):
    monkeypatch.setattr(
        auth_module,
        "ADMIN_EMAIL",
        account_data["email"],
    )

    register_response = register_account(
        client,
        account_data,
    )

    assert register_response.status_code == 201

    db = SessionLocal()

    try:
        user = (
            db.query(TaiKhoan)
            .filter(TaiKhoan.email == account_data["email"])
            .first()
        )

        assert user is not None

        user.vaiTro = "admin"
        db.commit()
    finally:
        db.close()

    login_response = login_account(
        client,
        account_data["email"],
        account_data["matKhau"],
    )

    assert login_response.status_code == 200

    access_token = login_response.json()["data"]["accessToken"]

    admin_response = client.get(
        "/api/auth/test-admin-only",
        headers={
            "Authorization": f"Bearer {access_token}",
        },
    )

    assert admin_response.status_code == 200
    assert admin_response.json()["role"] == "admin"


def test_require_admin_rejects_admin_with_wrong_email(
    client,
    account_data,
):
    register_response = register_account(
        client,
        account_data,
    )

    assert register_response.status_code == 201

    db = SessionLocal()

    try:
        user = (
            db.query(TaiKhoan)
            .filter(TaiKhoan.email == account_data["email"])
            .first()
        )

        assert user is not None

        user.vaiTro = "admin"
        db.commit()
    finally:
        db.close()

    login_response = login_account(
        client,
        account_data["email"],
        account_data["matKhau"],
    )

    assert login_response.status_code == 200

    access_token = login_response.json()["data"]["accessToken"]

    admin_response = client.get(
        "/api/auth/test-admin-only",
        headers={
            "Authorization": f"Bearer {access_token}",
        },
    )

    assert admin_response.status_code == 403
    assert (
        admin_response.json()["detail"]
        == "Yêu cầu quyền quản trị viên"
    )


def test_require_admin_rejects_inactive_admin(
    client,
    account_data,
    monkeypatch,
):
    monkeypatch.setattr(
        auth_module,
        "ADMIN_EMAIL",
        account_data["email"],
    )

    register_response = register_account(
        client,
        account_data,
    )

    assert register_response.status_code == 201

    db = SessionLocal()

    try:
        user = (
            db.query(TaiKhoan)
            .filter(TaiKhoan.email == account_data["email"])
            .first()
        )

        assert user is not None

        user.vaiTro = "admin"
        user.trangThai = "inactive"
        db.commit()

        access_token = create_access_token(
            {
                "sub": str(user.maTaiKhoan),
            }
        )
    finally:
        db.close()

    admin_response = client.get(
        "/api/auth/test-admin-only",
        headers={
            "Authorization": f"Bearer {access_token}",
        },
    )

    assert admin_response.status_code == 403
    assert (
        admin_response.json()["detail"]
        == "Tài khoản đã bị vô hiệu hóa"
    )


def test_require_admin_normalizes_role_string(
    client,
    account_data,
    monkeypatch,
):
    monkeypatch.setattr(
        auth_module,
        "ADMIN_EMAIL",
        account_data["email"],
    )

    register_response = register_account(
        client,
        account_data,
    )

    assert register_response.status_code == 201

    db = SessionLocal()

    try:
        user = (
            db.query(TaiKhoan)
            .filter(TaiKhoan.email == account_data["email"])
            .first()
        )

        assert user is not None

        user.vaiTro = " ADMIN "
        db.commit()
    finally:
        db.close()

    login_response = login_account(
        client,
        account_data["email"],
        account_data["matKhau"],
    )

    assert login_response.status_code == 200

    access_token = login_response.json()["data"]["accessToken"]

    admin_response = client.get(
        "/api/auth/test-admin-only",
        headers={
            "Authorization": f"Bearer {access_token}",
        },
    )

    assert admin_response.status_code == 200
    assert admin_response.json()["role"] == " ADMIN "

