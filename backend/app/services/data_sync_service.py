import re
from decimal import Decimal, InvalidOperation
from sqlalchemy.orm import Session
from backend.app.models.san_pham_chuan_hoa import SanPhamChuanHoa
from backend.app.models.san_pham_tho import SanPhamTho
from backend.app.models.lich_su_gia import LichSuGia
from backend.app.services.product_grouping_service import (
    refresh_standardized_product_summary,
)

class DataSyncService:
    def __init__(self, db: Session):
        self.db = db

    def _normalize_price(self, raw_price) -> Decimal:
        if raw_price is None:
            return Decimal("0")
        price_text = str(raw_price).strip()
        price_text = price_text.replace("₫", "").replace("VNĐ", "").replace("vnđ", "").replace(",", "").replace(".", "")
        price_text = re.sub(r"\s+", "", price_text)
        if not price_text.isdigit():
            raise ValueError("Invalid price format")
        try:
            return Decimal(price_text)
        except InvalidOperation:
            raise ValueError("Invalid price format")

    def sync_groups(self, groups: list[dict]) -> dict:
        inserted_count = 0
        updated_count = 0
        history_inserted_count = 0
        skipped_count = 0
        errors = []

        for group in groups:
            try:
                # 1. Upsert SanPhamChuanHoa
                model_key = group.get("modelKey")
                product_type = group.get("productType")
                dung_luong = group.get("dungLuong")
                tinh_trang = group.get("tinhTrang") or group.get("condition") or "new"
                ten_chuan_hoa = group.get("tenChuanHoa", "Unknown Product")

                # Try to find existing
                spch = None
                if product_type and model_key:
                    spch = self.db.query(SanPhamChuanHoa).filter(
                        SanPhamChuanHoa.productType == product_type,
                        SanPhamChuanHoa.modelKey == model_key,
                        SanPhamChuanHoa.dungLuong == dung_luong,
                        SanPhamChuanHoa.tinhTrang == tinh_trang
                    ).first()

                if not spch:
                    # Create new
                    spch = SanPhamChuanHoa(
                        tenChuan=ten_chuan_hoa,
                        thuongHieu=group.get("thuongHieu"),
                        dungLuong=dung_luong,
                        modelKey=model_key,
                        productType=product_type,
                        tinhTrang=tinh_trang,
                        hinhAnhChinh=group.get("sanPhamGiaThapNhat", {}).get("hinhAnh")
                    )
                    self.db.add(spch)
                    self.db.commit()
                    self.db.refresh(spch)

                # 2. Upsert items
                for item in group.get("items", []):
                    try:
                        link_goc = item.get("linkGoc") or item.get("origin_url")
                        if not link_goc:
                            skipped_count += 1
                            continue

                        raw_price = item.get("giaHienTai") or item.get("current_price")
                        clean_price = self._normalize_price(raw_price)

                        ten_sp = item.get("tenSanPham") or item.get("raw_title") or "Unknown"
                        san_tmdt = item.get("sanTMDT") or item.get("merchant_name") or "Unknown"
                        hinh_anh = item.get("hinhAnh") or item.get("image_url")
                        danh_gia = item.get("danhGia") or item.get("rating")
                        so_luong_danh_gia = item.get("soLuongDanhGia") or item.get("review_count") or 0

                        sp_tho = self.db.query(SanPhamTho).filter(SanPhamTho.linkGoc == link_goc).first()

                        if sp_tho:
                            # Check if price changed
                            price_changed = sp_tho.giaHienTai != clean_price

                            # Update fields
                            sp_tho.maSPCH = spch.maSPCH
                            sp_tho.tenSanPham = ten_sp
                            sp_tho.sanTMDT = san_tmdt
                            sp_tho.giaHienTai = clean_price
                            sp_tho.hinhAnh = hinh_anh
                            sp_tho.danhGia = danh_gia
                            sp_tho.soLuongDanhGia = so_luong_danh_gia

                            updated_count += 1

                            if price_changed and clean_price > 0:
                                lich_su = LichSuGia(
                                    maSPTho=sp_tho.maSPTho,
                                    gia=clean_price,
                                )
                                self.db.add(lich_su)
                                history_inserted_count += 1

                            # Đẩy thay đổi của sản phẩm thô xuống session trước khi tính lại SPCH.
                            self.db.flush()

                            refresh_standardized_product_summary(
                                self.db,
                                spch,
                            )

                            self.db.commit()
                        else:
                            # Insert new
                            sp_tho = SanPhamTho(
                                maSPCH=spch.maSPCH,
                                tenSanPham=ten_sp,
                                sanTMDT=san_tmdt,
                                giaHienTai=clean_price,
                                linkGoc=link_goc,
                                hinhAnh=hinh_anh,
                                danhGia=danh_gia,
                                soLuongDanhGia=so_luong_danh_gia
                            )
                            self.db.add(sp_tho)

                            # Cần flush để lấy maSPTho và đưa bản ghi mới vào session.
                            self.db.flush()
                            self.db.refresh(sp_tho)

                            refresh_standardized_product_summary(
                                self.db,
                                spch,
                            )

                            self.db.commit()
                            inserted_count += 1

                            # Initial price history
                            if clean_price > 0:
                                lich_su = LichSuGia(maSPTho=sp_tho.maSPTho, gia=clean_price)
                                self.db.add(lich_su)
                                history_inserted_count += 1
                                self.db.commit()

                    except Exception as item_err:
                        self.db.rollback()
                        errors.append(f"Error saving item {item.get('linkGoc')}: {str(item_err)}")
                        skipped_count += 1

            except Exception as group_err:
                self.db.rollback()
                errors.append(f"Error saving group {group.get('tenChuanHoa')}: {str(group_err)}")

        return {
            "inserted_count": inserted_count,
            "updated_count": updated_count,
            "history_inserted_count": history_inserted_count,
            "skipped_count": skipped_count,
            "errors": errors
        }
