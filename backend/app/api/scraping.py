from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.san_pham_tho import SanPhamTho

router = APIRouter(
    prefix="/api/scraping",
    tags=["Scraping"]
)

SPIDER_THEO_NGUON = {
    "Shopee": "shopee_spider.py",
    "Lazada": "lazada_spider.py",
    "Tiki": "tiki_spider.py",
    "FPT Shop": "fptshop_spider.py",
    "CellphoneS": "cellphones_spider.py",
    "Hoang Ha Mobile": "hoanghamobile_spider.py",
}


def la_chuoi_rong(gia_tri):
    return gia_tri is None or str(gia_tri).strip() == ""


def lay_spider_theo_nguon(nguon):
    return SPIDER_THEO_NGUON.get(nguon, "scraper_spider.py")


def dinh_dang_thoi_gian(thoi_gian):
    if not thoi_gian:
        thoi_gian = datetime.utcnow()

    return thoi_gian.strftime("%d/%m/%Y %H:%M")


def tao_ma_loi(ma_san_pham_tho, ma_loi):
    return f"ERR-SPT-{ma_san_pham_tho}-{ma_loi}"


def tao_loi_san_pham_tho(san_pham):
    danh_sach_loi = []

    nguon = san_pham.sanTMDT or "Không xác định"
    spider = lay_spider_theo_nguon(nguon)
    thoi_gian = dinh_dang_thoi_gian(san_pham.ngayCapNhat)

    thong_tin_chung = {
        "thoiGian": thoi_gian,
        "nguon": nguon,
        "spider": spider,
        "trangThai": "Chưa xử lý",
        "maSPTho": san_pham.maSPTho,
        "maSPCH": san_pham.maSPCH,
        "maSanPhamThoHienThi": f"SPT-{san_pham.maSPTho}",
        "maSanPhamChuanHoaHienThi": (
            f"SPCH-{san_pham.maSPCH}" if san_pham.maSPCH else "Chưa gom nhóm"
        ),
        "tenSanPham": san_pham.tenSanPham,
    }

    if la_chuoi_rong(san_pham.tenSanPham):
        danh_sach_loi.append({
            **thong_tin_chung,
            "maLoi": tao_ma_loi(san_pham.maSPTho, "TITLE"),
            "loaiLoi": "Dữ liệu thiếu",
            "mucDo": "Cao",
            "moTa": "Sản phẩm thô thiếu tên sản phẩm sau khi thu thập.",
            "deXuatXuLy": "Kiểm tra lại selector lấy tên sản phẩm trong spider.",
        })

    if la_chuoi_rong(san_pham.sanTMDT):
        danh_sach_loi.append({
            **thong_tin_chung,
            "maLoi": tao_ma_loi(san_pham.maSPTho, "SOURCE"),
            "loaiLoi": "Dữ liệu thiếu",
            "mucDo": "Cao",
            "moTa": "Sản phẩm thô thiếu thông tin nguồn/sàn TMĐT.",
            "deXuatXuLy": "Bổ sung trường sanTMDT khi lưu dữ liệu từ spider.",
        })

    gia_hien_tai = san_pham.giaHienTai

    if gia_hien_tai is None:
        danh_sach_loi.append({
            **thong_tin_chung,
            "maLoi": tao_ma_loi(san_pham.maSPTho, "PRICE-MISSING"),
            "loaiLoi": "Dữ liệu thiếu",
            "mucDo": "Cao",
            "moTa": "Sản phẩm thô thiếu giá hiện tại.",
            "deXuatXuLy": "Kiểm tra bước parse giá và chuẩn hóa định dạng tiền tệ.",
        })
    else:
        try:
            gia_so = Decimal(gia_hien_tai)
            if gia_so <= 0:
                danh_sach_loi.append({
                    **thong_tin_chung,
                    "maLoi": tao_ma_loi(san_pham.maSPTho, "PRICE-INVALID"),
                    "loaiLoi": "Sai định dạng giá",
                    "mucDo": "Cao",
                    "moTa": "Giá hiện tại nhỏ hơn hoặc bằng 0.",
                    "deXuatXuLy": "Kiểm tra lại logic chuyển đổi chuỗi giá thành số.",
                })
        except Exception:
            danh_sach_loi.append({
                **thong_tin_chung,
                "maLoi": tao_ma_loi(san_pham.maSPTho, "PRICE-FORMAT"),
                "loaiLoi": "Sai định dạng giá",
                "mucDo": "Cao",
                "moTa": "Giá hiện tại không thể chuyển đổi sang dạng số.",
                "deXuatXuLy": "Chuẩn hóa lại dữ liệu giá trước khi lưu vào cơ sở dữ liệu.",
            })

    if la_chuoi_rong(san_pham.linkGoc) or not str(san_pham.linkGoc).startswith("http"):
        danh_sach_loi.append({
            **thong_tin_chung,
            "maLoi": tao_ma_loi(san_pham.maSPTho, "URL"),
            "loaiLoi": "Đường dẫn không hợp lệ",
            "mucDo": "Trung bình",
            "moTa": "Đường dẫn gốc của sản phẩm bị thiếu hoặc không đúng định dạng URL.",
            "deXuatXuLy": "Kiểm tra selector lấy link sản phẩm hoặc bước chuẩn hóa URL.",
        })

    if la_chuoi_rong(san_pham.hinhAnh) or not str(san_pham.hinhAnh).startswith("http"):
        danh_sach_loi.append({
            **thong_tin_chung,
            "maLoi": tao_ma_loi(san_pham.maSPTho, "IMAGE"),
            "loaiLoi": "Ảnh không hợp lệ",
            "mucDo": "Trung bình",
            "moTa": "Hình ảnh sản phẩm bị thiếu hoặc không đúng định dạng URL.",
            "deXuatXuLy": "Kiểm tra selector lấy ảnh hoặc xử lý fallback ảnh mặc định.",
        })

    if san_pham.danhGia is not None and (
        san_pham.danhGia < 0 or san_pham.danhGia > 5
    ):
        danh_sach_loi.append({
            **thong_tin_chung,
            "maLoi": tao_ma_loi(san_pham.maSPTho, "RATING"),
            "loaiLoi": "Đánh giá không hợp lệ",
            "mucDo": "Thấp",
            "moTa": "Điểm đánh giá nằm ngoài khoảng hợp lệ từ 0 đến 5.",
            "deXuatXuLy": "Kiểm tra logic parse điểm đánh giá từ nguồn dữ liệu.",
        })

    if san_pham.soLuongDanhGia is not None and san_pham.soLuongDanhGia < 0:
        danh_sach_loi.append({
            **thong_tin_chung,
            "maLoi": tao_ma_loi(san_pham.maSPTho, "REVIEW-COUNT"),
            "loaiLoi": "Đánh giá không hợp lệ",
            "mucDo": "Thấp",
            "moTa": "Số lượng đánh giá nhỏ hơn 0.",
            "deXuatXuLy": "Kiểm tra logic parse số lượng đánh giá.",
        })

    return danh_sach_loi


def loc_danh_sach_loi(danh_sach_loi, nguon, loai_loi, muc_do, trang_thai, tu_khoa):
    ket_qua = danh_sach_loi

    if nguon and nguon != "Tất cả":
        ket_qua = [loi for loi in ket_qua if loi["nguon"] == nguon]

    if loai_loi and loai_loi != "Tất cả":
        ket_qua = [loi for loi in ket_qua if loi["loaiLoi"] == loai_loi]

    if muc_do and muc_do != "Tất cả":
        ket_qua = [loi for loi in ket_qua if loi["mucDo"] == muc_do]

    if trang_thai and trang_thai != "Tất cả":
        ket_qua = [loi for loi in ket_qua if loi["trangThai"] == trang_thai]

    if tu_khoa:
        tu_khoa_lower = tu_khoa.lower().strip()
        ket_qua = [
            loi for loi in ket_qua
            if tu_khoa_lower in str(loi["maLoi"]).lower()
            or tu_khoa_lower in str(loi["nguon"]).lower()
            or tu_khoa_lower in str(loi["spider"]).lower()
            or tu_khoa_lower in str(loi["loaiLoi"]).lower()
            or tu_khoa_lower in str(loi["tenSanPham"] or "").lower()
        ]

    return ket_qua


def tao_thong_ke_loi(danh_sach_loi):
    tong_loi = len(danh_sach_loi)
    loi_cao = len([loi for loi in danh_sach_loi if loi["mucDo"] == "Cao"])
    chua_xu_ly = len([loi for loi in danh_sach_loi if loi["trangThai"] == "Chưa xử lý"])
    so_nguon_co_loi = len({loi["nguon"] for loi in danh_sach_loi})

    return [
        {
            "tieuDe": "Tổng lỗi",
            "giaTri": tong_loi,
            "moTa": "Lỗi phát hiện từ dữ liệu sản phẩm thô",
        },
        {
            "tieuDe": "Lỗi nghiêm trọng",
            "giaTri": loi_cao,
            "moTa": "Cần kiểm tra selector hoặc dữ liệu đầu vào",
        },
        {
            "tieuDe": "Nguồn có lỗi",
            "giaTri": so_nguon_co_loi,
            "moTa": "Số sàn TMĐT đang phát sinh lỗi dữ liệu",
        },
        {
            "tieuDe": "Chưa xử lý",
            "giaTri": chua_xu_ly,
            "moTa": "Các lỗi cần quản trị viên kiểm tra",
        },
    ]


@router.get("/error-logs")
def get_scraping_error_logs(
    nguon: str = Query("Tất cả"),
    loai_loi: str = Query("Tất cả"),
    muc_do: str = Query("Tất cả"),
    trang_thai: str = Query("Tất cả"),
    tu_khoa: str = Query(""),
    db: Session = Depends(get_db),
):
    try:
        danh_sach_san_pham = (
            db.query(SanPhamTho)
            .order_by(SanPhamTho.ngayCapNhat.desc())
            .all()
        )

        danh_sach_loi = []

        for san_pham in danh_sach_san_pham:
            danh_sach_loi.extend(tao_loi_san_pham_tho(san_pham))

        danh_sach_loi = loc_danh_sach_loi(
            danh_sach_loi=danh_sach_loi,
            nguon=nguon,
            loai_loi=loai_loi,
            muc_do=muc_do,
            trang_thai=trang_thai,
            tu_khoa=tu_khoa,
        )

        return {
            "success": True,
            "data": danh_sach_loi,
            "stats": tao_thong_ke_loi(danh_sach_loi),
            "total": len(danh_sach_loi),
        }

    except SQLAlchemyError as error:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": f"Database error: {str(error)}"
            }
        )


@router.get("/error-logs/stats")
def get_scraping_error_log_stats(db: Session = Depends(get_db)):
    try:
        danh_sach_san_pham = db.query(SanPhamTho).all()
        danh_sach_loi = []

        for san_pham in danh_sach_san_pham:
            danh_sach_loi.extend(tao_loi_san_pham_tho(san_pham))

        return {
            "success": True,
            "data": tao_thong_ke_loi(danh_sach_loi),
        }

    except SQLAlchemyError as error:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": f"Database error: {str(error)}"
            }
        )

