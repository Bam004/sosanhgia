import pytest
from unittest.mock import patch
from backend.app.models import SanPhamChuanHoa, SanPhamTho
from decimal import Decimal

@pytest.fixture(autouse=True)
def mock_cache():
    with patch("backend.app.api.search.get_cached_search_result", return_value=None), \
         patch("backend.app.api.search.set_cached_search_result"), \
         patch("backend.app.api.search.get_search_cache_version", return_value=0):
        yield

def setup_search_data(db_session):
    spch = SanPhamChuanHoa(
        tenChuanHoa="iphone 15 128gb new",
        productType="phone",
        modelKey="iphone 15",
        thuongHieu="apple",
        tinhTrang="new"
    )
    db_session.add(spch)
    db_session.commit()
    db_session.refresh(spch)

    sp_tiki = SanPhamTho(
        maSPCH=spch.maSPCH,
        tenSanPham="iphone 15 128gb tiki new",
        sanTMDT="Tiki",
        giaHienTai=Decimal("9000000"),
        linkGoc="https://seller-search.test/tiki",
        sellerName="Tiki Trading",
        sellerRating=4.8,
        danhGia=4.6,
        soLuongDanhGia=120
    )
    db_session.add(sp_tiki)

    sp_lazada = SanPhamTho(
        maSPCH=spch.maSPCH,
        tenSanPham="iphone 15 128gb lazada new",
        sanTMDT="Lazada",
        giaHienTai=Decimal("8500000"),
        linkGoc="https://seller-search.test/lazada",
        sellerName=None,
        sellerRating=None,
        danhGia=4.2,
        soLuongDanhGia=50
    )
    db_session.add(sp_lazada)
    db_session.commit()

def test_search_seller_info(client, db_session):
    setup_search_data(db_session)

    response = client.get("/api/search", params={"keyword": "iphone 15 128gb new", "auto_scrape": "false"})
    assert response.status_code == 200
    data = response.json()
    assert data.get("success") is True
    
    # Assert top-level items
    top_items = data.get("data", {}).get("items", [])
    assert len(top_items) == 2

    lazada_item = next(i for i in top_items if i["sanTMDT"] == "Lazada")
    assert lazada_item["sellerName"] is None
    assert lazada_item["sellerRating"] is None
    assert lazada_item["danhGia"] == 4.2

    tiki_item = next(i for i in top_items if i["sanTMDT"] == "Tiki")
    assert tiki_item["sellerName"] == "Tiki Trading"
    assert tiki_item["sellerRating"] == 4.8
    assert tiki_item["danhGia"] == 4.6

    # Assert group items
    groups = data.get("data", {}).get("groups", [])
    assert len(groups) == 1
    group = groups[0]
    
    # Check that sellerName is NOT at group level
    assert "sellerName" not in group
    assert "sellerRating" not in group

    group_items = group.get("items", [])
    assert len(group_items) == 2

    lazada_gitem = next(i for i in group_items if i["sanTMDT"] == "Lazada")
    assert lazada_gitem["sellerName"] is None
    assert lazada_gitem["sellerRating"] is None
    assert lazada_gitem["danhGia"] == 4.2

    tiki_gitem = next(i for i in group_items if i["sanTMDT"] == "Tiki")
    assert tiki_gitem["sellerName"] == "Tiki Trading"
    assert tiki_gitem["sellerRating"] == 4.8
    assert tiki_gitem["danhGia"] == 4.6

def test_search_accessory_only(client, db_session):
    spch = SanPhamChuanHoa(
        tenChuanHoa="TEST SELLER SEARCH ACCESSORY",
        productType="accessory",
        modelKey="vi da iphone"
    )
    db_session.add(spch)
    db_session.commit()
    db_session.refresh(spch)
    sp_acc = SanPhamTho(
        maSPCH=spch.maSPCH,
        tenSanPham="Vi Da iPhone 15",
        sanTMDT="Shopee",
        giaHienTai=Decimal("500000"),
        linkGoc="https://seller-search.test/acc"
    )
    db_session.add(sp_acc)
    db_session.commit()

    response = client.get("/api/search", params={"keyword": "vi da iphone", "auto_scrape": "false"})
    assert response.status_code == 200
    data = response.json()
    assert data.get("success") is True
    groups = data.get("data", {}).get("groups", [])
    assert len(groups) >= 1
    
    found_acc = False
    for group in groups:
        if group.get("tenChuanHoa") == "TEST SELLER SEARCH ACCESSORY":
            assert group.get("productType") == "accessory"
            found_acc = True
    assert found_acc
