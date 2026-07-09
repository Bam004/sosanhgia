from datetime import datetime
import unicodedata
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

TEN_NGUON_CHUAN = {
    "shopee": "Shopee",
    "lazada": "Lazada",
    "tiki": "Tiki",
    "fptshop": "FPT Shop",
    "fpt": "FPT Shop",
    "cellphones": "CellphoneS",
    "cellphone": "CellphoneS",
    "hoanghamobile": "Hoang Ha Mobile",
    "hoangha": "Hoang Ha Mobile",
}

SPIDER_THEO_NGUON = {
    "Shopee": "shopee_spider.py",
    "Lazada": "lazada_spider.py",
    "Tiki": "tiki_spider.py",
    "FPT Shop": "fptshop_spider.py",
    "CellphoneS": "cellphones_spider.py",
    "Hoang Ha Mobile": "hoanghamobile_spider.py",
}

def bo_dau_tieng_viet(gia_tri):
    gia_tri = unicodedata.normalize("NFD", str(gia_tri))
    gia_tri = "".join(
        ky_tu for ky_tu in gia_tri
        if unicodedata.category(ky_tu) != "Mn"
    )
    return gia_tri.replace("Đ", "D").replace("đ", "d")


def chuan_hoa_ten_nguon(nguon):
    if not nguon:
        return "Không xác định"

    khoa = (
        bo_dau_tieng_viet(nguon)
        .lower()
        .replace(" ", "")
        .replace("-", "")
        .replace("_", "")
    )

    return TEN_NGUON_CHUAN.get(khoa, str(nguon).strip())

def la_chuoi_rong(gia_tri):
    return gia_tri is None or str(gia_tri).strip() == ""


def lay_spider_theo_nguon(nguon):
    nguon_chuan = chuan_hoa_ten_nguon(nguon)
    return SPIDER_THEO_NGUON.get(nguon_chuan, "scraper_spider.py")


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

def tao_ma_tien_trinh(nguon):
    ten_chuan = str(nguon or "unknown").upper()
    ten_chuan = (
        ten_chuan
        .replace(" ", "-")
        .replace("À", "A")
        .replace("Á", "A")
        .replace("Ạ", "A")
        .replace("Ả", "A")
        .replace("Ã", "A")
        .replace("Â", "A")
        .replace("Ầ", "A")
        .replace("Ấ", "A")
        .replace("Ậ", "A")
        .replace("Ẩ", "A")
        .replace("Ẫ", "A")
        .replace("Ă", "A")
        .replace("Ằ", "A")
        .replace("Ắ", "A")
        .replace("Ặ", "A")
        .replace("Ẳ", "A")
        .replace("Ẵ", "A")
    )

    return f"JOB-{ten_chuan}"


def tao_tien_trinh_theo_nguon(nguon, danh_sach_san_pham, danh_sach_loi):
    tong_san_pham = len(danh_sach_san_pham)
    tong_loi = len(danh_sach_loi)

    thoi_gian_cap_nhat_moi_nhat = None

    for san_pham in danh_sach_san_pham:
        if not san_pham.ngayCapNhat:
            continue

        if (
            thoi_gian_cap_nhat_moi_nhat is None
            or san_pham.ngayCapNhat > thoi_gian_cap_nhat_moi_nhat
        ):
            thoi_gian_cap_nhat_moi_nhat = san_pham.ngayCapNhat

    if tong_san_pham == 0:
        trang_thai = "Đang chờ"
        tien_do = 0
        bat_dau = "Chưa chạy"
    elif tong_loi > 0:
        trang_thai = "Có lỗi"
        tien_do = 80
        bat_dau = dinh_dang_thoi_gian(thoi_gian_cap_nhat_moi_nhat)
    else:
        trang_thai = "Hoàn tất"
        tien_do = 100
        bat_dau = dinh_dang_thoi_gian(thoi_gian_cap_nhat_moi_nhat)

    return {
        "maTienTrinh": tao_ma_tien_trinh(nguon),
        "nguon": nguon,
        "spider": lay_spider_theo_nguon(nguon),
        "trangThai": trang_thai,
        "tienDo": tien_do,
        "batDau": bat_dau,
        "sanPham": tong_san_pham,
        "loi": tong_loi,
    }

def tao_thong_ke_tien_trinh(danh_sach_tien_trinh):
    dang_chay = len([
        tien_trinh for tien_trinh in danh_sach_tien_trinh
        if tien_trinh["trangThai"] == "\u0110ang ch\u1ea1y"
    ])

    hoan_tat = len([
        tien_trinh for tien_trinh in danh_sach_tien_trinh
        if tien_trinh["trangThai"] == "Ho\u00e0n t\u1ea5t"
    ])

    dang_cho = len([
        tien_trinh for tien_trinh in danh_sach_tien_trinh
        if tien_trinh["trangThai"] == "\u0110ang ch\u1edd"
    ])

    co_loi = len([
        tien_trinh for tien_trinh in danh_sach_tien_trinh
        if tien_trinh["trangThai"] == "C\u00f3 l\u1ed7i"
    ])

    return [
        {
            "tieuDe": "\u0110ang ch\u1ea1y",
            "giaTri": dang_chay,
            "moTa": "Ti\u1ebfn tr\u00ecnh \u0111ang thu th\u1eadp d\u1eef li\u1ec7u",
        },
        {
            "tieuDe": "Ho\u00e0n th\u00e0nh",
            "giaTri": hoan_tat,
            "moTa": "Ngu\u1ed3n d\u1eef li\u1ec7u \u0111\u00e3 thu th\u1eadp th\u00e0nh c\u00f4ng",
        },
        {
            "tieuDe": "\u0110ang ch\u1edd",
            "giaTri": dang_cho,
            "moTa": "Ngu\u1ed3n ch\u01b0a c\u00f3 d\u1eef li\u1ec7u thu th\u1eadp",
        },
        {
            "tieuDe": "C\u00f3 l\u1ed7i",
            "giaTri": co_loi,
            "moTa": "Ngu\u1ed3n c\u00f3 l\u1ed7i c\u1ea7n ki\u1ec3m tra nh\u1eadt k\u00fd",
        },
    ]


@router.get("/jobs")
def get_scraping_jobs(db: Session = Depends(get_db)):
    try:
        danh_sach_san_pham = db.query(SanPhamTho).all()

        danh_sach_nguon = sorted({
            chuan_hoa_ten_nguon(san_pham.sanTMDT)
            for san_pham in danh_sach_san_pham
            if san_pham.sanTMDT
        })

        danh_sach_tien_trinh = []

        for nguon in danh_sach_nguon:
            san_pham_theo_nguon = [
                san_pham for san_pham in danh_sach_san_pham
                if chuan_hoa_ten_nguon(san_pham.sanTMDT) == nguon
            ]

            loi_theo_nguon = []

            for san_pham in san_pham_theo_nguon:
                loi_theo_nguon.extend(tao_loi_san_pham_tho(san_pham))

            danh_sach_tien_trinh.append(
                tao_tien_trinh_theo_nguon(
                    nguon=nguon,
                    danh_sach_san_pham=san_pham_theo_nguon,
                    danh_sach_loi=loi_theo_nguon,
                )
            )

        return {
            "success": True,
            "data": danh_sach_tien_trinh,
            "stats": tao_thong_ke_tien_trinh(danh_sach_tien_trinh),
            "total": len(danh_sach_tien_trinh),
        }

    except SQLAlchemyError as error:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": f"Database error: {str(error)}"
            }
        )

