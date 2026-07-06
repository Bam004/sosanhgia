from typing import Any, cast
from fastapi import APIRouter, Query, status, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.san_pham_chuan_hoa import SanPhamChuanHoa
from backend.app.models.san_pham_tho import SanPhamTho
from backend.app.services.scrape_pipeline_service import scrape_and_sync_keyword

router = APIRouter(
    prefix="/api/search",
    tags=["Tim kiem"]
)


from sqlalchemy import and_, or_

ACCESSORY_KEYWORDS = [
    "dán", "dan", "cường lực", "cuong luc", "ốp", "op lung", "case", "mocoll", 
    "miếng dán", "mieng dan", "kính cường lực", "kinh cuong luc", "sạc", "sac", "cáp", "cap"
]

def is_accessory(ten_san_pham: str) -> bool:
    if not ten_san_pham:
        return False
    ten_lower = ten_san_pham.lower()
    for kw in ACCESSORY_KEYWORDS:
        if kw in ten_lower:
            return True
    return False

def build_search_data(keyword: str, db: Session):
    keyword = " ".join(keyword.strip().split())
    tokens = keyword.split()

    conditions = []
    for token in tokens:
        like = f"%{token}%"
        conditions.append(
            or_(
                SanPhamChuanHoa.tenChuanHoa.ilike(like),
                SanPhamChuanHoa.thuongHieu.ilike(like),
                SanPhamChuanHoa.modelKey.ilike(like),
                SanPhamChuanHoa.productType.ilike(like),
            )
        )

    query = db.query(SanPhamChuanHoa).filter(and_(*conditions))
    spch_list = query.all()

    groups = []
    all_items = []
    sources = set()
    
    kw_lower = keyword.lower()
    is_accessory_search = any(kw in kw_lower for kw in ACCESSORY_KEYWORDS)

    for spch in spch_list:
        items = db.query(SanPhamTho).filter(
            SanPhamTho.maSPCH == spch.maSPCH
        ).all()
        
        # Lọc bỏ phụ kiện nếu không phải đang search phụ kiện
        filtered_items = []
        for item in items:
            if not is_accessory_search and is_accessory(item.tenSanPham):
                continue
            filtered_items.append(item)
            
        items = filtered_items

        if not items:
            continue

        # Sắp xếp thủ công: giá > 0 tăng dần, giá = 0 đẩy xuống cuối
        items.sort(key=lambda x: float(x.giaHienTai) if x.giaHienTai and x.giaHienTai > 0 else float('inf'))

        prices = []
        group_sources = set()
        raw_items = []

        for item in items:
            gia_hien_tai = cast(Any, item.giaHienTai)
            if gia_hien_tai is not None and gia_hien_tai > 0:
                prices.append(gia_hien_tai)

            san_tmdt = cast(Any, item.sanTMDT)
            if san_tmdt:
                group_sources.add(san_tmdt)

            raw_item = {
                "maSPTho": item.maSPTho,
                "maSPCH": item.maSPCH,
                "tenSanPham": item.tenSanPham,
                "sanTMDT": item.sanTMDT,
                "giaHienTai": float(gia_hien_tai) if gia_hien_tai is not None else None,
                "linkGoc": item.linkGoc,
                "hinhAnh": item.hinhAnh,
                "danhGia": item.danhGia,
                "soLuongDanhGia": item.soLuongDanhGia
            }

            raw_items.append(raw_item)
            all_items.append(raw_item)

        sources.update(group_sources)

        group_data = {
            "maNhomTam": spch.maSPCH,
            "maSPCH": spch.maSPCH,
            "tenChuanHoa": spch.tenChuanHoa,
            "thuongHieu": spch.thuongHieu,
            "dungLuong": spch.dungLuong,
            "modelKey": spch.modelKey,
            "productType": spch.productType,
            "soNguon": len(group_sources),
            "nguon": sorted(group_sources),
            "soSanPham": len(items),
            "giaThapNhat": float(min(prices)) if prices else None,
            "giaCaoNhat": float(max(prices)) if prices else None,
            "sanPhamGiaThapNhat": raw_items[0] if raw_items else None,
            "items": raw_items
        }
        groups.append(group_data)

    return {
        "keyword": keyword,
        "total_items": len(all_items),
        "total_groups": len(groups),
        "sources": sorted(sources),
        "groups": groups,
        "items": all_items
    }


@router.get("")
def search_products(
    keyword: str = Query(..., min_length=1),
    auto_scrape: bool = Query(True),
    db: Session = Depends(get_db)
):
    try:
        keyword = " ".join(keyword.strip().split())

        data = build_search_data(keyword, db)
        scraped = False

        if data["total_groups"] == 0 and auto_scrape:
            scrape_and_sync_keyword(keyword, db)
            db.expire_all()

            data = build_search_data(keyword, db)
            scraped = True

        return {
            "success": True,
            "data": {
                **data,
                "scraped": scraped
            }
        }

    except Exception as error:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": str(error)
            }
        )