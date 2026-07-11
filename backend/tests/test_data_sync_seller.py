import pytest
import math
from decimal import Decimal
from sqlalchemy.orm import Session
from backend.app.models.san_pham_chuan_hoa import SanPhamChuanHoa
from backend.app.models.san_pham_tho import SanPhamTho
from backend.app.models.lich_su_gia import LichSuGia
from backend.app.services.data_sync_service import DataSyncService


@pytest.fixture
def data_sync(db_session):
    return DataSyncService(db_session)

def _build_group(item_data: dict, ma_spch="test"):
    return [{
        "modelKey": ma_spch,
        "productType": "phone",
        "dungLuong": "128GB",
        "tinhTrang": "new",
        "tenChuanHoa": "Test SPCH",
        "items": [
            {
                "linkGoc": "http://test_seller_sync",
                "giaHienTai": 1000,
                "tenSanPham": "Test SP",
                "sanTMDT": "Test TMDT",
                **item_data
            }
        ]
    }]

def test_insert_new_with_seller(db_session: Session, data_sync: DataSyncService):
    # 1. INSERT mới có seller
    groups = _build_group({
        "sellerName": "Tiki Trading",
        "sellerRating": 4.8
    }, "spch1")
    
    res = data_sync.sync_groups(groups)
    assert res["inserted_count"] == 1
    
    sp = db_session.query(SanPhamTho).filter_by(linkGoc="http://test_seller_sync").first()
    assert sp.sellerName == "Tiki Trading"
    assert sp.sellerRating == 4.8

def test_insert_new_without_seller(db_session: Session, data_sync: DataSyncService):
    # 2. INSERT không có seller
    groups = _build_group({}, "spch2")
    
    res = data_sync.sync_groups(groups)
    assert res["inserted_count"] == 1
    
    sp = db_session.query(SanPhamTho).filter_by(linkGoc="http://test_seller_sync").first()
    assert sp.sellerName is None
    assert sp.sellerRating is None

def test_seller_name_whitespace(db_session: Session, data_sync: DataSyncService):
    # 3. sellerName khoảng trắng -> trim
    groups = _build_group({"sellerName": "  Tiki Trading  "}, "spch3")
    data_sync.sync_groups(groups)
    sp = db_session.query(SanPhamTho).filter_by(linkGoc="http://test_seller_sync").first()
    assert sp.sellerName == "Tiki Trading"

def test_seller_name_empty(db_session: Session, data_sync: DataSyncService):
    # 4. sellerName chuỗi rỗng -> None
    groups = _build_group({"sellerName": "   "}, "spch4")
    data_sync.sync_groups(groups)
    sp = db_session.query(SanPhamTho).filter_by(linkGoc="http://test_seller_sync").first()
    assert sp.sellerName is None

def test_seller_rating_string(db_session: Session, data_sync: DataSyncService):
    # 5. sellerRating chuỗi hợp lệ -> float
    groups = _build_group({"sellerRating": "4.8"}, "spch5")
    data_sync.sync_groups(groups)
    sp = db_session.query(SanPhamTho).filter_by(linkGoc="http://test_seller_sync").first()
    assert sp.sellerRating == 4.8

def test_seller_rating_invalid(db_session: Session, data_sync: DataSyncService):
    # 6. sellerRating không hợp lệ -> None (không 0, không hỏng batch)
    groups = _build_group({"sellerRating": "không xác định"}, "spch6")
    res = data_sync.sync_groups(groups)
    assert res["inserted_count"] == 1
    sp = db_session.query(SanPhamTho).filter_by(linkGoc="http://test_seller_sync").first()
    assert sp.sellerRating is None

def test_seller_rating_nan_inf(db_session: Session, data_sync: DataSyncService):
    # 7. NaN hoặc Infinity -> None
    groups = _build_group({"sellerRating": float('inf')}, "spch7")
    data_sync.sync_groups(groups)
    sp = db_session.query(SanPhamTho).filter_by(linkGoc="http://test_seller_sync").first()
    assert sp.sellerRating is None
    
    groups = _build_group({"sellerRating": float('nan')}, "spch7_2")
    data_sync.sync_groups(groups)
    sp = db_session.query(SanPhamTho).filter_by(linkGoc="http://test_seller_sync").first()
    assert sp.sellerRating is None

def test_update_keeps_old_when_null(db_session: Session, data_sync: DataSyncService):
    # 8. Cập nhật khi mới là NULL thì giữ cũ
    groups1 = _build_group({"sellerName": "Tiki Trading", "sellerRating": 4.7}, "spch8")
    data_sync.sync_groups(groups1)
    
    groups2 = _build_group({"sellerName": None, "sellerRating": None}, "spch8")
    res = data_sync.sync_groups(groups2)
    assert res["updated_count"] == 1
    
    sp = db_session.query(SanPhamTho).filter_by(linkGoc="http://test_seller_sync").first()
    assert sp.sellerName == "Tiki Trading"
    assert sp.sellerRating == 4.7

def test_update_with_valid_new_seller(db_session: Session, data_sync: DataSyncService):
    # 9. Cập nhật có dữ liệu mới hợp lệ thì ghi đè
    groups1 = _build_group({"sellerName": "Old Seller", "sellerRating": 4.0}, "spch9")
    data_sync.sync_groups(groups1)
    
    groups2 = _build_group({"sellerName": "New Seller", "sellerRating": 4.9}, "spch9")
    data_sync.sync_groups(groups2)
    
    sp = db_session.query(SanPhamTho).filter_by(linkGoc="http://test_seller_sync").first()
    assert sp.sellerName == "New Seller"
    assert sp.sellerRating == 4.9

def test_update_keeps_old_when_invalid(db_session: Session, data_sync: DataSyncService):
    # 10. Cập nhật mới là rỗng và không hợp lệ -> giữ cũ
    groups1 = _build_group({"sellerName": "Old Seller", "sellerRating": 4.0}, "spch10")
    data_sync.sync_groups(groups1)
    
    groups2 = _build_group({"sellerName": "   ", "sellerRating": "lỗi"}, "spch10")
    data_sync.sync_groups(groups2)
    
    sp = db_session.query(SanPhamTho).filter_by(linkGoc="http://test_seller_sync").first()
    assert sp.sellerName == "Old Seller"
    assert sp.sellerRating == 4.0

def test_danh_gia_does_not_flow_into_seller_rating(db_session: Session, data_sync: DataSyncService):
    # 11. danhGia không sang sellerRating
    groups = _build_group({"danhGia": 4.9}, "spch11")
    data_sync.sync_groups(groups)
    
    sp = db_session.query(SanPhamTho).filter_by(linkGoc="http://test_seller_sync").first()
    assert sp.danhGia == 4.9
    assert sp.sellerRating is None

def test_price_history_works(db_session: Session, data_sync: DataSyncService):
    # 12. LichSuGia vẫn hoạt động khi giá đổi
    
    groups1 = _build_group({"giaHienTai": 1000}, "spch12")
    data_sync.sync_groups(groups1)
    sp = db_session.query(SanPhamTho).filter_by(linkGoc="http://test_seller_sync").first()
    
    count1 = db_session.query(LichSuGia).filter_by(maSPTho=sp.maSPTho).count()
    assert count1 == 1
    
    groups2 = _build_group({"giaHienTai": 2000}, "spch12")
    data_sync.sync_groups(groups2)
    
    count2 = db_session.query(LichSuGia).filter_by(maSPTho=sp.maSPTho).count()
    assert count2 == 2

def test_no_seller_normal_pipeline(db_session: Session, data_sync: DataSyncService):
    # 13. Pipeline cũ bình thường
    groups = _build_group({"giaHienTai": 500, "tenSanPham": "Normal"}, "spch13")
    res = data_sync.sync_groups(groups)
    
    assert res["inserted_count"] == 1
    sp = db_session.query(SanPhamTho).filter_by(linkGoc="http://test_seller_sync").first()
    assert sp.tenSanPham == "Normal"
    assert sp.giaHienTai == 500

def test_seller_name_non_string(db_session: Session, data_sync: DataSyncService):
    # sellerName l� bool ho?c s? -> None
    groups1 = _build_group({"sellerName": True, "sellerRating": False}, "spch14")
    data_sync.sync_groups(groups1)
    sp1 = db_session.query(SanPhamTho).filter_by(linkGoc="http://test_seller_sync").first()
    assert sp1.sellerName is None
    assert sp1.sellerRating is None

    groups2 = _build_group({"sellerName": 123}, "spch15")
    data_sync.sync_groups(groups2)
    sp2 = db_session.query(SanPhamTho).filter_by(linkGoc="http://test_seller_sync").first()
    assert sp2.sellerName is None
