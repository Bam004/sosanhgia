import re
import logging
import time

from collections import defaultdict
from decimal import Decimal, InvalidOperation

from sqlalchemy.orm import Session

from backend.app.models.san_pham_chuan_hoa import SanPhamChuanHoa
from backend.app.models.san_pham_tho import SanPhamTho
from backend.app.models.lich_su_gia import LichSuGia
from backend.app.services.product_grouping_service import (
    determine_standardized_status,
)
from backend.app.services.text_matching_service import TextMatchingService

logger = logging.getLogger(__name__)

class DataSyncService:
    def __init__(self, db: Session):
        self.db = db

    def _normalize_price(self, raw_price) -> Decimal:
        if raw_price is None:
            return Decimal("0")

        price_text = str(raw_price).strip()

        price_text = (
            price_text
            .replace("₫", "")
            .replace("VNĐ", "")
            .replace("vnđ", "")
            .replace(",", "")
            .replace(".", "")
        )

        price_text = re.sub(r"\s+", "", price_text)

        if not price_text.isdigit():
            raise ValueError("Invalid price format")

        try:
            return Decimal(price_text)
        except InvalidOperation as error:
            raise ValueError("Invalid price format") from error

    def _refresh_summaries_bulk(
    self,
    standardized_products: dict[int, SanPhamChuanHoa],
    ) -> None:
        if not standardized_products:
            return

        standardized_ids = list(standardized_products.keys())

        # Chỉ một truy vấn lấy toàn bộ sản phẩm thô của các nhóm bị ảnh hưởng.
        all_items = (
            self.db.query(SanPhamTho)
            .filter(SanPhamTho.maSPCH.in_(standardized_ids))
            .all()
        )

        items_by_standardized_id: dict[int, list[SanPhamTho]] = defaultdict(list)

        for item in all_items:
            if item.maSPCH is not None:
                items_by_standardized_id[item.maSPCH].append(item)

        matching_service = TextMatchingService()

        for standardized_id, standardized_product in standardized_products.items():
            items = items_by_standardized_id.get(standardized_id, [])

            prices = [
                item.giaHienTai
                for item in items
                if item.giaHienTai is not None
                and item.giaHienTai > 0
            ]

            sources = {
                str(item.sanTMDT).strip().lower()
                for item in items
                if item.sanTMDT
                and str(item.sanTMDT).strip()
            }

            representative_item = next(
                (item for item in items if item.hinhAnh),
                items[0] if items else None,
            )

            standardized_product.soSanPhamTho = len(items)
            standardized_product.soNguonBan = len(sources)
            standardized_product.giaThapNhat = (
                min(prices) if prices else None
            )
            standardized_product.giaCaoNhat = (
                max(prices) if prices else None
            )

            standardized_product.trangThai = determine_standardized_status(
                total_sources=len(sources),
                need_review=bool(standardized_product.canKiemTra),
            )

            if (
                representative_item
                and not standardized_product.hinhAnhChinh
            ):
                standardized_product.hinhAnhChinh = (
                    representative_item.hinhAnh
                )

            ten_de_phan_loai = (
                standardized_product.tenChuan
                or (
                    representative_item.tenSanPham
                    if representative_item
                    else ""
                )
            )

            normalized_name = matching_service._normalize_text(
                ten_de_phan_loai
            )

            brand = matching_service._extract_brand(normalized_name)
            is_accessory = matching_service._is_accessory(normalized_name)

            product_type = matching_service._classify_product_type(
                normalized_name,
                is_accessory,
            )

            standardized_product.productType = product_type
            standardized_product.loai = product_type
            standardized_product.thuongHieu = brand

            for item in items:
                item_normalized_name = matching_service._normalize_text(
                    item.tenSanPham or ""
                )

                item_is_accessory = matching_service._is_accessory(
                    item_normalized_name
                )

                item_product_type = matching_service._classify_product_type(
                    item_normalized_name,
                    item_is_accessory,
                )

                item_attributes = dict(item.attributes or {})
                item_attributes["productType"] = item_product_type
                item.attributes = item_attributes

    def sync_groups(self, groups: list[dict]) -> dict:

        sync_started_at = time.perf_counter()

        inserted_count = 0
        updated_count = 0
        history_inserted_count = 0
        skipped_count = 0
        errors: list[str] = []

        # Gom toàn bộ link từ dữ liệu mới để truy vấn SanPhamTho một lần.
        incoming_links: list[str] = []

        for group in groups:
            for item in group.get("items", []):
                link_goc = (
                    item.get("linkGoc")
                    or item.get("origin_url")
                )

                if link_goc:
                    incoming_links.append(link_goc)

        existing_raw_products: dict[str, SanPhamTho] = {}

        raw_query_started_at = time.perf_counter()

        if incoming_links:
            existing_items = (
                self.db.query(SanPhamTho)
                .filter(SanPhamTho.linkGoc.in_(set(incoming_links)))
                .all()
            )

            existing_raw_products = {
                item.linkGoc: item
                for item in existing_items
            }

        logger.info(
            "[DataSync] Query sản phẩm thô hiện có hoàn tất sau %.2f giây",
            time.perf_counter() - raw_query_started_at,
        )

        # Lấy trước toàn bộ sản phẩm chuẩn hóa hiện có.
        standardized_query_started_at = time.perf_counter()

        existing_standardized_products = (
            self.db.query(SanPhamChuanHoa)
            .all()
        )

        logger.info(
            "[DataSync] Query sản phẩm chuẩn hóa hiện có hoàn tất sau %.2f giây",
            time.perf_counter() - standardized_query_started_at,
        )

        standardized_product_map = {
            (
                product.productType,
                product.modelKey,
                product.dungLuong,
                product.tinhTrang,
            ): product
            for product in existing_standardized_products
        }

        affected_standardized_products: dict[int, SanPhamChuanHoa] = {}

        # Giữ các sản phẩm thô mới để tạo lịch sử giá sau khi flush hàng loạt.
        new_items_for_history: list[tuple[SanPhamTho, Decimal]] = []

        try:
            process_started_at = time.perf_counter()

            for group in groups:
                model_key = group.get("modelKey")
                product_type = group.get("productType")
                dung_luong = group.get("dungLuong")
                tinh_trang = (
                    group.get("tinhTrang")
                    or group.get("condition")
                    or "new"
                )

                ten_chuan_hoa = group.get(
                    "tenChuanHoa",
                    "Unknown Product",
                )

                product_key = (
                    product_type,
                    model_key,
                    dung_luong,
                    tinh_trang,
                )

                spch = standardized_product_map.get(product_key)

                if spch is None:
                    spch = SanPhamChuanHoa(
                        tenChuan=ten_chuan_hoa,
                        thuongHieu=group.get("thuongHieu"),
                        dungLuong=dung_luong,
                        modelKey=model_key,
                        productType=product_type,
                        tinhTrang=tinh_trang,
                        hinhAnhChinh=(
                            group
                            .get("sanPhamGiaThapNhat", {})
                            .get("hinhAnh")
                        ),
                    )

                    self.db.add(spch)
                    self.db.flush()

                    standardized_product_map[product_key] = spch

                for item in group.get("items", []):
                    try:
                        link_goc = (
                            item.get("linkGoc")
                            or item.get("origin_url")
                        )

                        if not link_goc:
                            skipped_count += 1
                            continue

                        raw_price = (
                            item.get("giaHienTai")
                            or item.get("current_price")
                        )

                        clean_price = self._normalize_price(raw_price)

                        ten_sp = (
                            item.get("tenSanPham")
                            or item.get("raw_title")
                            or "Unknown"
                        )

                        san_tmdt = (
                            item.get("sanTMDT")
                            or item.get("merchant_name")
                            or "Unknown"
                        )

                        hinh_anh = (
                            item.get("hinhAnh")
                            or item.get("image_url")
                        )

                        danh_gia = (
                            item.get("danhGia")
                            or item.get("rating")
                        )

                        so_luong_danh_gia = (
                            item.get("soLuongDanhGia")
                            or item.get("review_count")
                            or 0
                        )

                        sp_tho = existing_raw_products.get(link_goc)

                        if sp_tho is not None:
                            price_changed = (
                                sp_tho.giaHienTai != clean_price
                            )

                            sp_tho.maSPCH = spch.maSPCH
                            sp_tho.tenSanPham = ten_sp
                            sp_tho.sanTMDT = san_tmdt
                            sp_tho.giaHienTai = clean_price
                            sp_tho.hinhAnh = hinh_anh
                            sp_tho.danhGia = danh_gia
                            sp_tho.soLuongDanhGia = so_luong_danh_gia

                            updated_count += 1

                            if price_changed and clean_price > 0:
                                self.db.add(
                                    LichSuGia(
                                        maSPTho=sp_tho.maSPTho,
                                        gia=clean_price,
                                    )
                                )

                                history_inserted_count += 1
                        else:
                            sp_tho = SanPhamTho(
                                maSPCH=spch.maSPCH,
                                tenSanPham=ten_sp,
                                sanTMDT=san_tmdt,
                                giaHienTai=clean_price,
                                linkGoc=link_goc,
                                hinhAnh=hinh_anh,
                                danhGia=danh_gia,
                                soLuongDanhGia=so_luong_danh_gia,
                            )

                            self.db.add(sp_tho)

                            existing_raw_products[link_goc] = sp_tho
                            inserted_count += 1

                            if clean_price > 0:
                                new_items_for_history.append(
                                    (sp_tho, clean_price)
                                )

                        affected_standardized_products[
                            spch.maSPCH
                        ] = spch

                    except Exception as item_error:
                        errors.append(
                            "Error saving item "
                            f"{item.get('linkGoc')}: "
                            f"{str(item_error)}"
                        )

                        skipped_count += 1

            logger.info(
                "[DataSync] Tạo và cập nhật object trong session hoàn tất sau %.2f giây",
                time.perf_counter() - process_started_at,
            )

            # Đẩy toàn bộ sản phẩm và lịch sử giá xuống transaction.
            flush_before_summary_started_at = time.perf_counter()

            self.db.flush()

            logger.info(
                "[DataSync] Flush trước bulk summary hoàn tất sau %.2f giây",
                time.perf_counter() - flush_before_summary_started_at,
            )

            # Sau khi flush hàng loạt, các sản phẩm mới đã có maSPTho.
            for sp_tho, clean_price in new_items_for_history:
                self.db.add(
                    LichSuGia(
                        maSPTho=sp_tho.maSPTho,
                        gia=clean_price,
                    )
                )
                history_inserted_count += 1

            # Cập nhật toàn bộ summary bằng một truy vấn bulk.
            bulk_summary_started_at = time.perf_counter()

            self._refresh_summaries_bulk(
                affected_standardized_products,
            )

            logger.info(
                "[DataSync] Bulk summary hoàn tất sau %.2f giây",
                time.perf_counter() - bulk_summary_started_at,
            )

            # Đẩy các thay đổi summary xuống transaction.
            flush_after_summary_started_at = time.perf_counter()

            self.db.flush()

            logger.info(
                "[DataSync] Flush sau bulk summary hoàn tất sau %.2f giây",
                time.perf_counter() - flush_after_summary_started_at,
            )

            # Toàn bộ pipeline chỉ commit một lần.
            commit_started_at = time.perf_counter()

            self.db.commit()

            logger.info(
                "[DataSync] Commit cuối hoàn tất sau %.2f giây",
                time.perf_counter() - commit_started_at,
            )

        except Exception as error:
            self.db.rollback()
            errors.append(f"Database sync failed: {str(error)}")

        logger.info(
            "[DataSync] Tổng thời gian sync_groups: %.2f giây",
            time.perf_counter() - sync_started_at,
        )

        return {
            "inserted_count": inserted_count,
            "updated_count": updated_count,
            "history_inserted_count": history_inserted_count,
            "skipped_count": skipped_count,
            "errors": errors,
        }

