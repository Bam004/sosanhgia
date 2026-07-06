from fastapi import APIRouter, Query, status, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.san_pham_chuan_hoa import SanPhamChuanHoa
from backend.app.models.san_pham_tho import SanPhamTho

router = APIRouter(
    prefix="/api/search",
    tags=["Tim kiem"]
)

@router.get("")
def search_products(
    keyword: str = Query(..., min_length=1),
    db: Session = Depends(get_db)
):
    try:
        # Lấy danh sách nhóm sản phẩm phù hợp từ DB
        query = db.query(SanPhamChuanHoa).filter(SanPhamChuanHoa.tenChuanHoa.ilike(f"%{keyword}%"))
        spch_list = query.all()

        groups = []
        all_items = []
        sources = set()

        for spch in spch_list:
            items = db.query(SanPhamTho).filter(SanPhamTho.maSPCH == spch.maSPCH).order_by(SanPhamTho.giaHienTai.asc()).all()
            if not items:
                continue

            prices = [item.giaHienTai for item in items if item.giaHienTai is not None]
            group_sources = {item.sanTMDT for item in items if item.sanTMDT}
            sources.update(group_sources)
            
            raw_items = []
            for item in items:
                raw_item = {
                    "maSPTho": item.maSPTho,
                    "maSPCH": item.maSPCH,
                    "tenSanPham": item.tenSanPham,
                    "sanTMDT": item.sanTMDT,
                    "giaHienTai": float(item.giaHienTai) if item.giaHienTai else None,
                    "linkGoc": item.linkGoc,
                    "hinhAnh": item.hinhAnh,
                    "danhGia": item.danhGia,
                    "soLuongDanhGia": item.soLuongDanhGia
                }
                raw_items.append(raw_item)
                all_items.append(raw_item)

            group_data = {
                "maNhomTam": spch.maSPCH, # Gán tạm maSPCH vào maNhomTam để tương thích frontend cũ
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
            "success": True,
            "data": {
                "keyword": keyword,
                "total_items": len(all_items),
                "total_groups": len(groups),
                "sources": sorted(sources),
                "groups": groups,
                "items": all_items
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

