import asyncio
from contextlib import suppress
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from backend.app.services.scheduled_scraping_service import chay_cao_dinh_ky_mot_lan


CHU_KY_CAO_DINH_KY_GIAY = 12 * 60 * 60

_scheduler_task: Optional[asyncio.Task] = None
_dang_chay = False
_lan_chay_gan_nhat: Optional[Dict[str, Any]] = None
_loi_gan_nhat: Optional[str] = None
_thoi_diem_khoi_dong: Optional[str] = None


async def _chay_job_cao_dinh_ky():
    global _dang_chay, _lan_chay_gan_nhat, _loi_gan_nhat

    if _dang_chay:
        return

    _dang_chay = True

    try:
        ket_qua = await asyncio.to_thread(chay_cao_dinh_ky_mot_lan)
        _lan_chay_gan_nhat = ket_qua
        _loi_gan_nhat = None
    except Exception as exc:
        _loi_gan_nhat = str(exc)
    finally:
        _dang_chay = False


async def _vong_lap_scheduler():
    # Không chạy ngay khi backend vừa bật, tránh làm backend khởi động chậm.
    # Lần tự động đầu tiên sẽ chạy sau 12 giờ.
    while True:
        await asyncio.sleep(CHU_KY_CAO_DINH_KY_GIAY)
        await _chay_job_cao_dinh_ky()


def bat_scheduler_cao_dinh_ky():
    global _scheduler_task, _thoi_diem_khoi_dong

    if _scheduler_task and not _scheduler_task.done():
        return

    _thoi_diem_khoi_dong = datetime.now(timezone.utc).isoformat()
    _scheduler_task = asyncio.create_task(_vong_lap_scheduler())

async def tat_scheduler_cao_dinh_ky():
    global _scheduler_task

    if _scheduler_task is None:
        return

    if not _scheduler_task.done():
        _scheduler_task.cancel()

        with suppress(asyncio.CancelledError):
            await _scheduler_task

    _scheduler_task = None

def lay_trang_thai_scheduler() -> Dict[str, Any]:
    return {
        "success": True,
        "enabled": _scheduler_task is not None and not _scheduler_task.done(),
        "dangChay": _dang_chay,
        "chuKyGio": 12,
        "chuKyGiay": CHU_KY_CAO_DINH_KY_GIAY,
        "thoiDiemKhoiDong": _thoi_diem_khoi_dong,
        "loiGanNhat": _loi_gan_nhat,
        "lanChayGanNhat": _lan_chay_gan_nhat,
    }


async def chay_ngay_dang_nen(
    gioi_han_keyword: Optional[int] = None,
    danh_sach_spider: Optional[list[str]] = None,
) -> Dict[str, Any]:
    global _dang_chay, _lan_chay_gan_nhat, _loi_gan_nhat

    if _dang_chay:
        return {
            "success": False,
            "message": "Tien trinh cao du lieu dinh ky dang chay, vui long thu lai sau.",
        }

    _dang_chay = True

    try:
        ket_qua = await asyncio.to_thread(
            chay_cao_dinh_ky_mot_lan,
            gioi_han_keyword,
            danh_sach_spider,
        )

        _lan_chay_gan_nhat = ket_qua
        _loi_gan_nhat = None

        return ket_qua

    except Exception as exc:
        _loi_gan_nhat = str(exc)

        return {
            "success": False,
            "error": str(exc),
        }

    finally:
        _dang_chay = False
