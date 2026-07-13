from uuid import uuid4
import pytest
from datetime import datetime
from unittest.mock import patch, MagicMock

from backend.app.core.database import SessionLocal
from backend.app.models import TaiKhoan, TheoDoiGia, SanPhamChuanHoa, SanPhamTho
from backend.app.services.price_alert_service import check_price_alerts

@pytest.fixture
def setup_data():
    db = SessionLocal()
    email1 = f"user1_{uuid4().hex}@example.com"
    email2 = f"user2_{uuid4().hex}@example.com"

    u1 = TaiKhoan(hoTen="User 1", email=email1, matKhauHash="hashed", vaiTro="user", trangThai="active")
    u2 = TaiKhoan(hoTen="User 2", email=email2, matKhauHash="hashed", vaiTro="user", trangThai="active")

    p1 = SanPhamChuanHoa(tenChuan="Test Phone", productType="phone", tinhTrang="new")

    try:
        db.add(u1)
        db.add(u2)
        db.add(p1)
        db.commit()
        db.refresh(u1)
        db.refresh(u2)
        db.refresh(p1)

        # Valid offer at 10M
        sp_tho = SanPhamTho(maSPCH=p1.maSPCH, tenSanPham="Test Phone New", giaHienTai=10000000, sanTMDT="Shopee", linkGoc="http://test")
        db.add(sp_tho)
        db.commit()

        yield {
            "u1": u1,
            "u2": u2,
            "p1": p1,
            "sp_tho": sp_tho,
            "db": db
        }
    finally:
        db.query(SanPhamTho).filter(SanPhamTho.maSPCH == p1.maSPCH).delete(synchronize_session=False)
        db.query(TheoDoiGia).filter(TheoDoiGia.maTaiKhoan.in_([u1.maTaiKhoan, u2.maTaiKhoan])).delete(synchronize_session=False)
        db.query(SanPhamChuanHoa).filter(SanPhamChuanHoa.maSPCH == p1.maSPCH).delete(synchronize_session=False)
        db.query(TaiKhoan).filter(TaiKhoan.maTaiKhoan.in_([u1.maTaiKhoan, u2.maTaiKhoan])).delete(synchronize_session=False)
        db.commit()
        db.close()

@patch('backend.app.services.price_alert_service.send_price_alert_email')
def test_price_higher_than_target(mock_send_email, setup_data):
    db = setup_data["db"]
    # Target price 9M, current price 10M
    t = TheoDoiGia(maTaiKhoan=setup_data["u1"].maTaiKhoan, maSPCH=setup_data["p1"].maSPCH, giaMongMuon=9000000, trangThai=True)
    db.add(t)
    db.commit()
    db.refresh(t)

    stats = check_price_alerts(db)

    assert stats["not_reached"] >= 1
    assert not mock_send_email.called

    db.refresh(t)
    assert t.daThongBao is False

@patch('backend.app.services.price_alert_service.send_price_alert_email')
def test_price_equal_to_target(mock_send_email, setup_data):
    mock_send_email.return_value = True
    db = setup_data["db"]
    # Target price 10M, current price 10M
    t = TheoDoiGia(maTaiKhoan=setup_data["u1"].maTaiKhoan, maSPCH=setup_data["p1"].maSPCH, giaMongMuon=10000000, trangThai=True)
    db.add(t)
    db.commit()

    stats = check_price_alerts(db)

    assert stats["notified"] >= 1
    assert mock_send_email.call_count >= 1

    db.refresh(t)
    assert t.daThongBao is True
    assert t.ngayThongBao is not None
    assert t.giaLucThongBao == 10000000

@patch('backend.app.services.price_alert_service.send_price_alert_email')
def test_price_lower_than_target(mock_send_email, setup_data):
    mock_send_email.return_value = True
    db = setup_data["db"]
    # Target price 12M, current price 10M
    t = TheoDoiGia(maTaiKhoan=setup_data["u1"].maTaiKhoan, maSPCH=setup_data["p1"].maSPCH, giaMongMuon=12000000, trangThai=True)
    db.add(t)
    db.commit()

    stats = check_price_alerts(db)

    assert stats["notified"] >= 1

    # Run again, should not send for THIS record
    initial_call_count = mock_send_email.call_count
    stats2 = check_price_alerts(db)
    assert mock_send_email.call_count == initial_call_count

@patch('backend.app.services.price_alert_service.send_price_alert_email')
def test_email_failure_does_not_mark_notified(mock_send_email, setup_data):
    mock_send_email.return_value = False # SMTP failure
    db = setup_data["db"]
    t = TheoDoiGia(maTaiKhoan=setup_data["u1"].maTaiKhoan, maSPCH=setup_data["p1"].maSPCH, giaMongMuon=12000000, trangThai=True)
    db.add(t)
    db.commit()

    stats = check_price_alerts(db)

    assert stats["email_failed"] >= 1
    assert mock_send_email.call_count >= 1

    db.refresh(t)
    assert t.daThongBao is False # Should be allowed to retry

@patch('backend.app.services.price_alert_service.send_price_alert_email')
def test_legacy_null_target(mock_send_email, setup_data):
    db = setup_data["db"]
    t = TheoDoiGia(maTaiKhoan=setup_data["u1"].maTaiKhoan, maSPCH=setup_data["p1"].maSPCH, giaMongMuon=None, trangThai=True)
    db.add(t)
    db.commit()

    stats = check_price_alerts(db)

    assert stats["skipped_missing_target"] >= 1
    assert not mock_send_email.called

@patch('backend.app.services.price_alert_service.send_price_alert_email')
def test_no_valid_offer(mock_send_email, setup_data):
    db = setup_data["db"]
    # Change offer condition to make it invalid
    setup_data["sp_tho"].tenSanPham = "Test Phone cũ" # Not 'new' anymore
    db.commit()

    t = TheoDoiGia(maTaiKhoan=setup_data["u1"].maTaiKhoan, maSPCH=setup_data["p1"].maSPCH, giaMongMuon=12000000, trangThai=True)
    db.add(t)
    db.commit()

    stats = check_price_alerts(db)

    assert stats["skipped_no_offer"] >= 1
    assert not mock_send_email.called
