from uuid import uuid4
import pytest
from fastapi.testclient import TestClient

from backend.app.core.database import SessionLocal
from backend.app.core.security import create_access_token
from backend.app.main import app
from backend.app.models import TaiKhoan, TheoDoiGia, SanPhamChuanHoa

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def setup_data():
    db = SessionLocal()
    # Create two users
    email1 = f"user1_{uuid4().hex}@example.com"
    email2 = f"user2_{uuid4().hex}@example.com"

    u1 = TaiKhoan(hoTen="User 1", email=email1, matKhauHash="hashed", vaiTro="user", trangThai="active")
    u2 = TaiKhoan(hoTen="User 2", email=email2, matKhauHash="hashed", vaiTro="user", trangThai="active")

    # Create a product
    p1 = SanPhamChuanHoa(tenChuan="Test Product", thuongHieu="Test", productType="smartphone")

    try:
        db.add(u1)
        db.add(u2)
        db.add(p1)
        db.commit()
        db.refresh(u1)
        db.refresh(u2)
        db.refresh(p1)

        token1 = create_access_token({"sub": str(u1.maTaiKhoan)})
        token2 = create_access_token({"sub": str(u2.maTaiKhoan)})

        yield {
            "u1": u1,
            "u2": u2,
            "token1": token1,
            "token2": token2,
            "p1": p1
        }
    finally:
        db.query(TheoDoiGia).filter(TheoDoiGia.maTaiKhoan.in_([u1.maTaiKhoan, u2.maTaiKhoan])).delete(synchronize_session=False)
        db.query(SanPhamChuanHoa).filter(SanPhamChuanHoa.maSPCH == p1.maSPCH).delete(synchronize_session=False)
        db.query(TaiKhoan).filter(TaiKhoan.maTaiKhoan.in_([u1.maTaiKhoan, u2.maTaiKhoan])).delete(synchronize_session=False)
        db.commit()
        db.close()

def test_check_no_token_returns_401(client, setup_data):
    response = client.get(f"/api/theo-doi-gia/check/{setup_data['p1'].maSPCH}")
    assert response.status_code == 401

def test_check_not_following(client, setup_data):
    p_id = setup_data['p1'].maSPCH
    response = client.get(
        f"/api/theo-doi-gia/check/{p_id}",
        headers={"Authorization": f"Bearer {setup_data['token1']}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["isFollowing"] is False
    assert data["data"]["maTheoDoi"] is None
    assert data["data"]["giaMongMuon"] is None

def test_create_and_check_following(client, setup_data):
    p_id = setup_data['p1'].maSPCH

    # Create
    create_res = client.post(
        "/api/theo-doi-gia",
        json={"maSPCH": p_id, "giaMongMuon": 12000000},
        headers={"Authorization": f"Bearer {setup_data['token1']}"}
    )
    assert create_res.status_code == 201
    created_id = create_res.json()["data"]["maTheoDoi"]

    # Check
    check_res = client.get(
        f"/api/theo-doi-gia/check/{p_id}",
        headers={"Authorization": f"Bearer {setup_data['token1']}"}
    )
    assert check_res.status_code == 200
    data = check_res.json()
    assert data["success"] is True
    assert data["data"]["isFollowing"] is True
    assert data["data"]["maTheoDoi"] == created_id
    assert data["data"]["giaMongMuon"] == 12000000.0

def test_user_separation(client, setup_data):
    p_id = setup_data['p1'].maSPCH

    # User 1 creates tracking
    client.post(
        "/api/theo-doi-gia",
        json={"maSPCH": p_id, "giaMongMuon": 12000000},
        headers={"Authorization": f"Bearer {setup_data['token1']}"}
    )

    # User 2 checks tracking
    check_res2 = client.get(
        f"/api/theo-doi-gia/check/{p_id}",
        headers={"Authorization": f"Bearer {setup_data['token2']}"}
    )
    data = check_res2.json()
    assert data["data"]["isFollowing"] is False

def test_check_does_not_modify_records(client, setup_data):
    p_id = setup_data['p1'].maSPCH
    db = SessionLocal()
    initial_count = db.query(TheoDoiGia).count()

    # Check
    client.get(
        f"/api/theo-doi-gia/check/{p_id}",
        headers={"Authorization": f"Bearer {setup_data['token1']}"}
    )

    final_count = db.query(TheoDoiGia).count()
    db.close()
    assert initial_count == final_count

def test_update_tracking(client, setup_data):
    p_id = setup_data['p1'].maSPCH

    # Create
    create_res = client.post(
        "/api/theo-doi-gia",
        json={"maSPCH": p_id, "giaMongMuon": 12000000},
        headers={"Authorization": f"Bearer {setup_data['token1']}"}
    )
    ma_theo_doi = create_res.json()["data"]["maTheoDoi"]

    # Update
    update_res = client.put(
        f"/api/theo-doi-gia/{ma_theo_doi}",
        json={"giaMongMuon": 9000000},
        headers={"Authorization": f"Bearer {setup_data['token1']}"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["data"]["giaMongMuon"] == 9000000.0

    # Ensure no second record was created
    db = SessionLocal()
    count = db.query(TheoDoiGia).filter(TheoDoiGia.maTaiKhoan == setup_data['u1'].maTaiKhoan).count()
    db.close()
    assert count == 1
