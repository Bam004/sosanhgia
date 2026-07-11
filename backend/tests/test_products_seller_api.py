import pytest
from backend.app.models import SanPhamChuanHoa, SanPhamTho
from decimal import Decimal

def setup_compare_data(db_session):
    spch = SanPhamChuanHoa(
        tenChuanHoa="iphone 15 128gb",
        productType="phone",
        modelKey="apple iphone 15",
        thuongHieu="apple",
        tinhTrang="new"
    )
    db_session.add(spch)
    db_session.commit()
    db_session.refresh(spch)

    # Đắt hơn nhưng có seller
    sp_tiki = SanPhamTho(
        maSPCH=spch.maSPCH,
        tenSanPham="iphone 15 128gb tiki new",
        sanTMDT="Tiki",
        giaHienTai=Decimal("9000000"),
        linkGoc="https://seller-compare.test/tiki",
        sellerName="Tiki Trading",
        sellerRating=4.8,
        danhGia=4.6,
        soLuongDanhGia=120
    )
    db_session.add(sp_tiki)

    # Rẻ hơn nhưng seller NULL
    sp_lazada = SanPhamTho(
        maSPCH=spch.maSPCH,
        tenSanPham="iphone 15 128gb lazada new",
        sanTMDT="Lazada",
        giaHienTai=Decimal("8500000"),
        linkGoc="https://seller-compare.test/lazada",
        sellerName=None,
        sellerRating=None,
        danhGia=4.2,
        soLuongDanhGia=50
    )
    db_session.add(sp_lazada)
    db_session.commit()
    return spch.maSPCH

def test_compare_seller_info_and_sort(client, db_session):
    ma_spch = setup_compare_data(db_session)

    response = client.get(f"/api/products/compare/{ma_spch}")
    assert response.status_code == 200
    data = response.json()
    assert data.get("success") is True
    
    items = data.get("data", {}).get("items", [])
    assert len(items) == 2

    # Giá rẻ hơn phải nằm trước
    assert items[0]["sanTMDT"] == "Lazada"
    assert items[0]["giaHienTai"] == 8500000
    assert items[0]["sellerName"] is None
    assert items[0]["sellerRating"] is None
    assert items[0]["danhGia"] == 4.2
    assert items[0]["soLuongDanhGia"] == 50

    # Đắt hơn nằm sau
    assert items[1]["sanTMDT"] == "Tiki"
    assert items[1]["giaHienTai"] == 9000000
    assert items[1]["sellerName"] == "Tiki Trading"
    assert items[1]["sellerRating"] == 4.8
    assert items[1]["danhGia"] == 4.6
    assert items[1]["soLuongDanhGia"] == 120

def test_compare_not_found(client):
    response = client.get("/api/products/compare/999999")
    assert response.status_code == 404
