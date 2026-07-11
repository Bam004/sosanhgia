from uuid import uuid4

import pytest

from backend.app.core.security import create_access_token
from backend.app.main import app
from backend.app.models import TaiKhoan
from backend.app.api.auth import require_admin
from fastapi import Depends

@app.get("/api/auth/test-admin-only")
def dummy_admin_only_endpoint(current_user: TaiKhoan = Depends(require_admin)):
    return {"success": True, "role": current_user.vaiTro}



@pytest.fixture
def account_data():
    email = f"auth_test_{uuid4().hex}@example.com"

    data = {
        "hoTen": "Tài Khoản Kiểm Thử",
        "email": email,
        "matKhau": "Test123!",
        "xacNhanMatKhau": "Test123!",
    }

    return data




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
    db_session,
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

    db = db_session

    user = (
        db.query(TaiKhoan)
        .filter(TaiKhoan.email == account_data["email"])
        .first()
    )

    assert user is not None
    assert user.hoTen == "Tài Khoản Kiểm Thử"
    assert user.vaiTro == "user"
    assert user.trangThai == "active"


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
    db_session,
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

    db = db_session

    user = (
        db.query(TaiKhoan)
        .filter(TaiKhoan.email == account_data["email"])
        .first()
    )

    assert user is not None

    user.trangThai = "inactive"
    db.commit()

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

def test_require_admin_rejects_normal_user(client, account_data):
    # Test 1: Active user, role user -> 403
    register_response = register_account(client, account_data)
    assert register_response.status_code == 201

    login_response = login_account(client, account_data["email"], account_data["matKhau"])
    access_token = login_response.json()["data"]["accessToken"]

    admin_response = client.get(
        "/api/auth/test-admin-only",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert admin_response.status_code == 403
    assert admin_response.json()["detail"] == "Yêu cầu quyền quản trị viên"

def test_require_admin_accepts_admin_role(client, account_data, db_session):
    # Test 2: Active admin -> 200
    register_response = register_account(client, account_data)
    assert register_response.status_code == 201

    # Promote to admin
    db = db_session
    user = db.query(TaiKhoan).filter(TaiKhoan.email == account_data["email"]).first()
    user.vaiTro = "admin"
    db.commit()

    login_response = login_account(client, account_data["email"], account_data["matKhau"])
    access_token = login_response.json()["data"]["accessToken"]

    admin_response = client.get(
        "/api/auth/test-admin-only",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert admin_response.status_code == 200
    assert admin_response.json()["role"] == "admin"

def test_require_admin_rejects_inactive_admin(client, account_data, db_session):
    # Test 3: Inactive admin -> blocked by get_current_user -> 403
    register_response = register_account(client, account_data)
    assert register_response.status_code == 201

    # Promote to admin but inactive
    db = db_session
    user = db.query(TaiKhoan).filter(TaiKhoan.email == account_data["email"]).first()
    user.vaiTro = "admin"
    user.trangThai = "inactive"
    db.commit()

    login_response = login_account(client, account_data["email"], account_data["matKhau"])
    # Login will fail because of inactive status (403). We need a valid token to test require_admin.
    # We can generate token manually to bypass login check.
    # Actually, inactive user gets 403 on login, but if they had an old token, it gets 403 on require_admin.
    
    db = db_session
    user = db.query(TaiKhoan).filter(TaiKhoan.email == account_data["email"]).first()
    access_token = create_access_token({"sub": str(user.maTaiKhoan)})

    admin_response = client.get(
    "/api/auth/test-admin-only",
    headers={"Authorization": f"Bearer {access_token}"},
    )
    assert admin_response.status_code == 403
    assert admin_response.json()["detail"] == "Tài khoản đã bị vô hiệu hóa"

def test_require_admin_normalizes_role_string(client, account_data, db_session):
    # Test 4: Role with uppercase and whitespace -> " ADMIN "
    register_response = register_account(client, account_data)
    assert register_response.status_code == 201

    # Promote to " ADMIN "
    db = db_session
    user = db.query(TaiKhoan).filter(TaiKhoan.email == account_data["email"]).first()
    user.vaiTro = " ADMIN "
    db.commit()

    login_response = login_account(client, account_data["email"], account_data["matKhau"])
    access_token = login_response.json()["data"]["accessToken"]

    admin_response = client.get(
        "/api/auth/test-admin-only",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert admin_response.status_code == 200
    assert admin_response.json()["role"] == " ADMIN "

def test_require_admin_rejects_anonymous_user(client):
    admin_response = client.get("/api/auth/test-admin-only")
    assert admin_response.status_code == 401
