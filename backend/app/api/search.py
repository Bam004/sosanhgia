from backend.app.services.search_cache_service import (
    get_cached_search_result,
    set_cached_search_result,
)
from typing import Any, cast
import unicodedata

from fastapi import APIRouter, Query, status, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.san_pham_chuan_hoa import SanPhamChuanHoa
from backend.app.models.san_pham_tho import SanPhamTho
from backend.app.services.scrape_pipeline_service import scrape_and_sync_keyword
from backend.app.services.text_matching_service import TextMatchingService

router = APIRouter(
    prefix="/api/search",
    tags=["Tim kiem"]
)


ACCESSORY_KEYWORDS = [
    "dan",
    "cuong luc",
    "op",
    "op lung",
    "case",
    "mocoll",
    "mieng dan",
    "kinh cuong luc",
    "sac",
    "cap",
    "tai nghe",
    "adapter",
    "pin du phong",
    "vi da",
    "dan da",
    "khacten",
    "cap sac",
    "cu sac",
    "phu kien",
]

REPAIR_SERVICE_KEYWORDS = [
    "thay",
    "sua",
    "sua chua",
    "ep kinh",
    "thay man hinh",
    "thay pin",
    "thay camera",
    "thay kinh",
    "oled",
    "lcd",
    "pisen",
]

PHONE_KEYWORDS = [
    "iphone",
    "samsung",
    "galaxy",
    "xiaomi",
    "redmi",
    "poco",
    "oppo",
    "vivo",
    "realme",
    "honor",
    "nokia",
    "dien thoai",
    "smartphone",
    "a55",
    "a56",
    "15 pro",
    "15 plus",
    "pro max",
]


def normalize_search_text(text: str) -> str:
    text = text or ""
    text = text.lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(
        char for char in text
        if unicodedata.category(char) != "Mn"
    )
    text = text.replace("đ", "d")
    text = " ".join(text.split())

    return text


def is_accessory(ten_san_pham: str) -> bool:
    matching_service = TextMatchingService()
    normalized_name = matching_service._normalize_text(ten_san_pham)
    return matching_service._is_accessory(normalized_name)


def is_repair_service(ten_san_pham: str) -> bool:
    matching_service = TextMatchingService()
    normalized_name = matching_service._normalize_text(ten_san_pham)
    return matching_service._classify_product_type(normalized_name, False) == "repair_service"


def detect_expected_product_type(keyword: str) -> str | None:
    normalized_keyword = normalize_search_text(keyword)
    
    # Accessory intent
    accessory_tokens = ["vi da", "dan da", "op", "op lung", "kinh cuong luc", "cuong luc", "mieng dan", "case", "khacten", "cap sac", "cu sac", "tai nghe", "adapter"]
    # We must check carefully. "sac" as standalone is dangerous, so we check " sac " or similar.
    # But since it's just intent detection on search query, if user types "sac iphone", it's accessory.
    if any(token in normalized_keyword for token in accessory_tokens) or "sac" in normalized_keyword.split():
        return "accessory"

    if any(keyword in normalized_keyword for keyword in REPAIR_SERVICE_KEYWORDS):
        return "repair_service"

    if any(keyword in normalized_keyword for keyword in PHONE_KEYWORDS):
        return "phone"

    return None


def detect_expected_condition(
    keyword: str,
    expected_product_type: str | None
) -> str | None:
    if expected_product_type != "phone":
        return None

    matching_service = TextMatchingService()
    normalized_keyword = matching_service._normalize_text(keyword)

    return matching_service._detect_condition(normalized_keyword)


def build_query_tokens(
    keyword: str,
    expected_product_type: str | None
) -> list[str]:
    normalized_keyword = normalize_search_text(keyword)
    tokens = normalized_keyword.split()

    removable_words = set()

    if expected_product_type == "repair_service":
        removable_words.update([
            "thay",
            "sua",
            "chua",
            "ep",
            "kinh",
            "man",
            "hinh",
            "pin",
            "camera",
            "oled",
            "lcd",
            "pisen",
        ])

    elif expected_product_type == "accessory":
        removable_words.update([
            "op",
            "lung",
            "dan",
            "kinh",
            "cuong",
            "luc",
            "mieng",
            "bao",
            "da",
            "case",
            "cover",
            "magsafe",
            "sac",
            "cap",
            "tai",
            "nghe",
            "adapter",
            "pin",
            "du",
            "phong",
            "mocoll",
        ])

    elif expected_product_type == "phone":
        removable_words.update([
            "dien",
            "thoai",
            "smartphone",
        ])

        condition_keywords = (
            TextMatchingService.USED_CONDITION_KEYWORDS
            | TextMatchingService.ACTIVATED_CONDITION_KEYWORDS
            | TextMatchingService.REFURBISHED_CONDITION_KEYWORDS
        )

        for condition_keyword in condition_keywords:
            removable_words.update(
                normalize_search_text(condition_keyword).split()
            )

    query_tokens = [
        token for token in tokens
        if token not in removable_words
    ]

    return query_tokens or tokens


def build_search_data(keyword: str, db: Session):
    keyword = " ".join(keyword.strip().split())
    expected_product_type = detect_expected_product_type(keyword)
    expected_condition = detect_expected_condition(keyword, expected_product_type)
    matching_service = TextMatchingService()
    tokens = build_query_tokens(keyword, expected_product_type)

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

    query = db.query(SanPhamChuanHoa)

    if conditions:
        query = query.filter(and_(*conditions))

    if expected_product_type:
        query = query.filter(SanPhamChuanHoa.productType == expected_product_type)

    if expected_condition:
        query = query.filter(SanPhamChuanHoa.tinhTrang == expected_condition)

    spch_list = query.all()

    groups = []
    all_items = []
    sources = set()

    for spch in spch_list:
        items = db.query(SanPhamTho).filter(
            SanPhamTho.maSPCH == spch.maSPCH
        ).all()

        # Lọc lại ở cấp item để tránh dữ liệu cũ trong DB làm sai kết quả.
        filtered_items = []

        for item in items:
            normalized_item_name = matching_service._normalize_text(item.tenSanPham)
            is_acc = matching_service._is_accessory(normalized_item_name)
            item_product_type = matching_service._classify_product_type(normalized_item_name, is_acc)
            
            if expected_product_type == "phone":
                if item_product_type != "phone":
                    continue
                item_condition = matching_service._detect_condition(normalized_item_name)
                if expected_condition and item_condition != expected_condition:
                    continue

            if expected_product_type == "accessory":
                if item_product_type != "accessory":
                    continue

            if expected_product_type == "repair_service":
                if item_product_type != "repair_service":
                    continue

            filtered_items.append(item)

        items = filtered_items

        if not items:
            continue

        # Sắp xếp thủ công: giá > 0 tăng dần, giá = 0 đẩy xuống cuối.
        items.sort(
            key=lambda item: (
                float(item.giaHienTai)
                if item.giaHienTai and item.giaHienTai > 0
                else float("inf")
            )
        )

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
                "soLuongDanhGia": item.soLuongDanhGia,
                "tinhTrang": spch.tinhTrang,
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
            "tinhTrang": spch.tinhTrang,
            "soNguon": len(group_sources),
            "nguon": sorted(group_sources),
            "soSanPham": len(items),
            "giaThapNhat": float(min(prices)) if prices else None,
            "giaCaoNhat": float(max(prices)) if prices else None,
            "sanPhamGiaThapNhat": raw_items[0] if raw_items else None,
            "items": raw_items,
        }
        groups.append(group_data)

    return {
        "keyword": keyword,
        "total_items": len(all_items),
        "total_groups": len(groups),
        "sources": sorted(sources),
        "groups": groups,
        "items": all_items,
    }


@router.get("")
def search_products(
    keyword: str = Query(..., min_length=1),
    auto_scrape: bool = Query(True),
    db: Session = Depends(get_db)
):
    try:
        keyword = " ".join(keyword.strip().split())

        if not auto_scrape:
            cached_data = get_cached_search_result(keyword)
            if cached_data is not None:
                return {
                    "success": True,
                    "data": {
                        **cached_data,
                        "scraped": False,
                        "mode": "cache",
                        "cache_hit": True,
                    }
                }

        scraped = False
        scrape_error = None
        scrape_result = None

        if auto_scrape:
            try:
                scrape_result = scrape_and_sync_keyword(keyword, db)
                db.expire_all()
                scraped = True
            except Exception as error:
                db.rollback()
                db.expire_all()
                scrape_error = str(error)

        data = build_search_data(keyword, db)

        if not auto_scrape:
            set_cached_search_result(keyword, data)

        return {
            "success": True,
            "data": {
                **data,
                "scraped": scraped,
                "mode": "realtime" if auto_scrape else "cache",
                "cache_hit": False,
                "scrape_error": scrape_error,
                "scrape_result": scrape_result,
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
