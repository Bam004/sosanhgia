import pytest
from sqlalchemy.orm import Session
from unittest.mock import patch

from backend.app.models.san_pham_chuan_hoa import SanPhamChuanHoa
from backend.app.models.san_pham_tho import SanPhamTho
from backend.app.models.lich_su_gia import LichSuGia
from backend.scripts.repair_legacy_data import RepairLegacyDataTool

def setup_mock_data(db: Session):
    # 1. Pure Mislabel Group (Accessory labeled as phone)
    g1 = SanPhamChuanHoa(tenChuanHoa="Ốp lưng iPhone 15", productType="phone", modelKey="iphone 15")
    db.add(g1)
    db.flush()
    r1 = SanPhamTho(maSPCH=g1.maSPCH, tenSanPham="Ốp lưng chống sốc iPhone 15", sanTMDT="Shopee", giaHienTai=50000, linkGoc="https://legacy-repair.test/1")
    db.add(r1)
    db.flush()
    db.add(LichSuGia(maSPTho=r1.maSPTho, gia=50000))
    
    # 2. Mixed Group (Phone and Accessory in Phone group)
    g2 = SanPhamChuanHoa(tenChuanHoa="iPhone 15", productType="phone", modelKey="iphone 15")
    db.add(g2)
    db.flush()
    r2_phone = SanPhamTho(maSPCH=g2.maSPCH, tenSanPham="Điện thoại iPhone 15 128GB", sanTMDT="Tiki", giaHienTai=20000000, linkGoc="https://legacy-repair.test/2")
    r2_acc = SanPhamTho(maSPCH=g2.maSPCH, tenSanPham="Kính cường lực iPhone 15", sanTMDT="Lazada", giaHienTai=100000, linkGoc="https://legacy-repair.test/3")
    db.add(r2_phone)
    db.add(r2_acc)
    db.flush()
    db.add(LichSuGia(maSPTho=r2_phone.maSPTho, gia=20000000))
    db.add(LichSuGia(maSPTho=r2_acc.maSPTho, gia=100000))
    
    return g1.maSPCH, g2.maSPCH, r1.maSPTho, r2_phone.maSPTho, r2_acc.maSPTho

@patch("backend.scripts.repair_legacy_data.bump_search_cache_version")
def test_audit_and_apply_repairs(mock_bump, db_session: Session):
    g1_id, g2_id, r1_id, r2_phone_id, r2_acc_id = setup_mock_data(db_session)
    
    tool = RepairLegacyDataTool(db_session)
    
    # 1. Dry run
    tool.audit(target_group_ids=[g1_id, g2_id])
    assert tool.report["groups_scanned"] == 2
    assert tool.report["raw_items_scanned"] == 3
    
    # We should have RECLASSIFY_GROUP for g1 and DETACH_FOR_REGROUP for g2's accessory
    actions = [a["action"] for a in tool.report["actions"]]
    assert "RECLASSIFY_GROUP" in actions
    assert "DETACH_FOR_REGROUP" in actions
    
    # 2. Apply
    tool.apply()
    
    # Assert DB State
    # G1 should now be accessory
    g1 = db_session.query(SanPhamChuanHoa).filter(SanPhamChuanHoa.maSPCH == g1_id).first()
    assert g1.productType == "accessory"
    
    # G2 phone raw item should be in a phone group (g2 or the merged target)
    r2_phone = db_session.query(SanPhamTho).filter(SanPhamTho.maSPTho == r2_phone_id).first()
    assert r2_phone.maSPCH is not None
    assert r2_phone.san_pham_chuan_hoa.productType == "phone"
    
    # The detached accessory should have maSPCH = None
    r2_acc = db_session.query(SanPhamTho).filter(SanPhamTho.tenSanPham == "Kính cường lực iPhone 15").first()
    assert r2_acc.maSPCH is None
    
    history_count = db_session.query(LichSuGia).filter(
        LichSuGia.maSPTho.in_([r1_id, r2_phone_id, r2_acc_id])
    ).count() # Just assert the ones we created are still there and not deleted
    assert history_count == 3
    
    # Cache bump should be called for affected groups
    assert mock_bump.call_count >= 1

@patch("backend.scripts.repair_legacy_data.bump_search_cache_version")
def test_idempotency(mock_bump, db_session: Session):
    g1_id, g2_id, r1_id, r2_phone_id, r2_acc_id = setup_mock_data(db_session)
    
    tool1 = RepairLegacyDataTool(db_session)
    tool1.audit(target_group_ids=[g1_id, g2_id])
    tool1.apply()
    
    # Run again
    tool2 = RepairLegacyDataTool(db_session)
    tool2.audit(target_group_ids=[g1_id, g2_id])
    tool2.apply()
    
    # Should have no actions to apply in second run
    actions = [a["action"] for a in tool2.report["actions"]]
    assert len(actions) == 0
    # Since we didn't wipe DB, history count might be large, but it shouldn't change
    assert tool2.report["history_before"] == tool2.report["history_after"]
