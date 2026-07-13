from backend.app.core.datetime_utils import utc_now_naive
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend.app.core.database import SessionLocal
from backend.app.services.lich_su_gia_service import cap_nhat_san_pham_tho_va_lich_su_gia
from backend.app.services.product_grouping_service import auto_group_ungrouped_products




SPIDER_CAU_HINH = {
    "cellphones": {
        "sanTMDT": "CellPhoneS",
        "args": {
            "max_pages": "1",
        },
    },
    "fptshop": {
        "sanTMDT": "FPT Shop",
        "args": {
            "limit": "20",
        },
    },
    "hoanghamobile": {
        "sanTMDT": "Hoàng Hà Mobile",
        "args": {
            "limit": "20",
        },
    },
    "tiki": {
        "sanTMDT": "Tiki",
        "args": {
            "max_pages": "1",
        },
    },
    "lazada": {
        "sanTMDT": "Lazada",
        "args": {
            "max_pages": "1",
            "headless": "true",
        },
    },
}



def chuan_hoa_keyword_cao(gia_tri: str) -> str:
    return " ".join(str(gia_tri or "").strip().lower().split())


def lay_keywords_cao_tu_san_pham_chuan_hoa(db) -> list[str]:
    danh_sach_ten_chuan = (
        db.query(SanPhamChuanHoa.tenChuan)
        .filter(SanPhamChuanHoa.tenChuan.isnot(None))
        .order_by(SanPhamChuanHoa.maSPCH.asc())
        .all()
    )

    keywords = []
    keywords_da_co = set()

    for (ten_chuan,) in danh_sach_ten_chuan:
        keyword = chuan_hoa_keyword_cao(ten_chuan)

        if not keyword or keyword in keywords_da_co:
            continue

        keywords.append(keyword)
        keywords_da_co.add(keyword)

    return keywords

def lay_thu_muc_goc_du_an() -> Path:
    return Path(__file__).resolve().parents[3]


def lam_sach_ten_file(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "keyword"


def doc_file_json_ket_qua(duong_dan_file: Path) -> List[Dict[str, Any]]:
    if not duong_dan_file.exists() or duong_dan_file.stat().st_size == 0:
        return []

    try:
        with duong_dan_file.open("r", encoding="utf-8") as file:
            du_lieu = json.load(file)

        if isinstance(du_lieu, list):
            return [item for item in du_lieu if isinstance(item, dict)]

        if isinstance(du_lieu, dict):
            return [du_lieu]

        return []
    except json.JSONDecodeError:
        return []


def chuan_hoa_item_tu_spider(
    item: Dict[str, Any],
    keyword: str,
    spider_name: str,
) -> Dict[str, Any]:
    cau_hinh = SPIDER_CAU_HINH.get(spider_name, {})

    return {
        "tenSanPham": item.get("tenSanPham")
        or item.get("ten_san_pham")
        or item.get("title")
        or item.get("name"),
        "sanTMDT": item.get("sanTMDT")
        or item.get("san_tmdt")
        or item.get("merchant_name")
        or cau_hinh.get("sanTMDT")
        or spider_name,
        "giaHienTai": item.get("giaHienTai")
        or item.get("gia")
        or item.get("price")
        or item.get("current_price"),
        "linkGoc": item.get("linkGoc")
        or item.get("link_goc")
        or item.get("origin_url")
        or item.get("url")
        or item.get("link"),
        "hinhAnh": item.get("hinhAnh")
        or item.get("hinh_anh")
        or item.get("image_url")
        or item.get("image"),
        "danhGia": item.get("danhGia")
        or item.get("danh_gia")
        or item.get("rating"),
        "soLuongDanhGia": item.get("soLuongDanhGia")
        or item.get("so_luong_danh_gia")
        or item.get("review_count")
        or 0,
        "attributes": {
            **(item.get("attributes") or {}),
            "keyword": item.get("keyword") or keyword,
            "spider": spider_name,
            "scheduledScraping": True,
        },
    }


def chay_mot_spider_theo_keyword(
    spider_name: str,
    keyword: str,
    output_dir: Optional[Path] = None,
    timeout_giay: int = 180,
) -> Dict[str, Any]:
    thu_muc_goc = lay_thu_muc_goc_du_an()
    output_dir = output_dir or thu_muc_goc / "logs" / "scheduled_scraping"
    output_dir.mkdir(parents=True, exist_ok=True)

    ten_file = f"{spider_name}_{lam_sach_ten_file(keyword)}_{utc_now_naive().strftime('%Y%m%d%H%M%S')}.json"
    duong_dan_file = output_dir / ten_file

    cau_hinh = SPIDER_CAU_HINH[spider_name]

    command = [
        sys.executable,
        "-m",
        "scrapy",
        "crawl",
        spider_name,
        "-a",
        f"keyword={keyword}",
        "-O",
        str(duong_dan_file),
    ]

    for ten_tham_so, gia_tri in cau_hinh.get("args", {}).items():
        command.extend(["-a", f"{ten_tham_so}={gia_tri}"])

    env = os.environ.copy()
    env["SCRAPY_SETTINGS_MODULE"] = "scrapers.settings"
    env["PYTHONPATH"] = str(thu_muc_goc)

    ket_qua = subprocess.run(
        command,
        cwd=str(thu_muc_goc),
        env=env,
        capture_output=True,
        text=True,
        timeout=timeout_giay,
        encoding="utf-8",
        errors="replace",
    )

    items = doc_file_json_ket_qua(duong_dan_file)

    return {
        "spider": spider_name,
        "keyword": keyword,
        "returnCode": ket_qua.returncode,
        "outputFile": str(duong_dan_file),
        "soItemCaoDuoc": len(items),
        "stdout": ket_qua.stdout[-1000:],
        "stderr": ket_qua.stderr[-1000:],
        "items": items,
    }


def chay_cao_dinh_ky_mot_lan(
    gioi_han_keyword: Optional[int] = None,
    danh_sach_spider: Optional[List[str]] = None,
) -> Dict[str, Any]:
    db = SessionLocal()

    tong_item_cao_duoc = 0
    tong_item_luu_db = 0
    tong_loi = 0
    chi_tiet = []

    try:
        keywords = lay_keywords_cao_tu_san_pham_chuan_hoa(db)

        if gioi_han_keyword:
            keywords = keywords[:gioi_han_keyword]

        spiders = danh_sach_spider or list(SPIDER_CAU_HINH.keys())
        spiders = [
            spider
            for spider in spiders
            if spider in SPIDER_CAU_HINH
        ]

        if not keywords:
            return {
                "success": False,
                "message": "Khong co san pham chuan hoa nao de sinh keyword cao du lieu.",
                "thoiDiemChay": utc_now_naive().isoformat(),
                "soKeyword": 0,
                "soSpider": len(spiders),
                "tongItemCaoDuoc": 0,
                "tongItemLuuDb": 0,
                "tongLoi": 0,
                "gomNhom": None,
                "chiTiet": [],
            }

        if not spiders:
            return {
                "success": False,
                "message": "Khong co spider hop le de cao du lieu.",
                "thoiDiemChay": utc_now_naive().isoformat(),
                "soKeyword": len(keywords),
                "soSpider": 0,
                "tongItemCaoDuoc": 0,
                "tongItemLuuDb": 0,
                "tongLoi": 0,
                "gomNhom": None,
                "chiTiet": [],
            }

        for keyword in keywords:
            for spider_name in spiders:
                try:
                    ket_qua_spider = chay_mot_spider_theo_keyword(
                        spider_name=spider_name,
                        keyword=keyword,
                    )

                    so_item_cao_duoc = ket_qua_spider.get("soItemCaoDuoc", 0)
                    tong_item_cao_duoc += so_item_cao_duoc
                    so_luu_thanh_cong = 0

                    if ket_qua_spider.get("returnCode") == 0:
                        for item in ket_qua_spider.get("items", []):
                            du_lieu_chuan = chuan_hoa_item_tu_spider(
                                item=item,
                                keyword=keyword,
                                spider_name=spider_name,
                            )

                            if (
                                not du_lieu_chuan.get("tenSanPham")
                                or not du_lieu_chuan.get("giaHienTai")
                                or not du_lieu_chuan.get("linkGoc")
                            ):
                                continue

                            cap_nhat_san_pham_tho_va_lich_su_gia(
                                db=db,
                                du_lieu=du_lieu_chuan,
                                commit=False,
                            )

                            so_luu_thanh_cong += 1

                        db.commit()
                    else:
                        tong_loi += 1

                    tong_item_luu_db += so_luu_thanh_cong

                    chi_tiet.append({
                        "keyword": keyword,
                        "spider": spider_name,
                        "returnCode": ket_qua_spider.get("returnCode"),
                        "soItemCaoDuoc": so_item_cao_duoc,
                        "soItemLuuDb": so_luu_thanh_cong,
                        "outputFile": ket_qua_spider.get("outputFile"),
                    })

                except Exception as exc:
                    db.rollback()
                    tong_loi += 1

                    chi_tiet.append({
                        "keyword": keyword,
                        "spider": spider_name,
                        "error": str(exc),
                    })

        ket_qua_gom_nhom = auto_group_ungrouped_products(
            db=db,
            commit=False,
        )
        db.commit()

        return {
            "success": True,
            "thoiDiemChay": utc_now_naive().isoformat(),
            "soKeyword": len(keywords),
            "soSpider": len(spiders),
            "tongItemCaoDuoc": tong_item_cao_duoc,
            "tongItemLuuDb": tong_item_luu_db,
            "tongLoi": tong_loi,
            "gomNhom": ket_qua_gom_nhom,
            "chiTiet": chi_tiet,
        }

    finally:
        db.close()
