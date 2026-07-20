import re
import unicodedata
from typing import Any


class TextMatchingService:
    # Khai báo thương hiệu và các tên gọi thường gặp để nhận diện brand.
    BRAND_ALIASES = {
    # Điện thoại, máy tính bảng, laptop
    "apple": [
        "apple",
        "iphone",
        "ipad",
        "macbook",
        "imac",
    ],
    "samsung": [
        "samsung",
        "galaxy",
    ],
    "xiaomi": [
        "xiaomi",
        "redmi",
        "poco",
    ],
    "oppo": ["oppo"],
    "vivo": ["vivo"],
    "realme": ["realme"],
    "nokia": ["nokia"],
    "honor": ["honor"],
    "masstel": ["masstel"],
    "huawei": [
        "huawei",
        "matepad",
        "matebook",
    ],

    # Laptop, PC, linh kiện
    "asus": [
        "asus",
        "vivobook",
        "zenbook",
        "rog",
    ],
    "acer": [
        "acer",
        "aspire",
        "predator",
    ],
    "lenovo": [
        "lenovo",
        "thinkpad",
        "ideapad",
        "legion",
    ],
    "dell": [
        "dell",
        "inspiron",
        "latitude",
        "optiplex",
        "alienware",
    ],
    "hp": [
        "hp",
        "hewlett packard",
        "pavilion",
        "elitebook",
        "probook",
        "omen",
    ],
    "msi": ["msi"],
    "gigabyte": ["gigabyte", "aorus"],
    "intel": ["intel"],
    "amd": ["amd", "ryzen", "radeon"],
    "nvidia": [
        "nvidia",
        "geforce",
        "rtx",
        "gtx",
    ],
    "kingston": ["kingston"],
    "corsair": ["corsair"],
    "western digital": [
        "western digital",
        "wd",
    ],
    "seagate": ["seagate"],

    # Màn hình, máy in
    "canon": ["canon"],
    "epson": ["epson"],
    "brother": ["brother"],
    "fujifilm": ["fujifilm", "fuji"],
    "viewsonic": ["viewsonic"],
    "benq": ["benq"],
    "aoc": ["aoc"],

    # Máy ảnh, camera
    "sony": [
        "sony",
        "alpha",
        "cybershot",
    ],
    "nikon": ["nikon"],
    "gopro": ["gopro"],
    "dahua": ["dahua"],
    "hikvision": ["hikvision"],
    "ezviz": ["ezviz"],
    "imou": ["imou"],

    # Điện lạnh, tivi, gia dụng
    "lg": ["lg"],
    "panasonic": ["panasonic"],
    "toshiba": ["toshiba"],
    "sharp": ["sharp"],
    "aqua": ["aqua"],
    "electrolux": ["electrolux"],
    "hitachi": ["hitachi"],
    "daikin": ["daikin"],
    "mitsubishi": [
        "mitsubishi",
        "mitsubishi electric",
        "mitsubishi heavy",
    ],
    "casper": ["casper"],
    "midea": ["midea"],
    "gree": ["gree"],
    "funiki": ["funiki"],
    "nagakawa": ["nagakawa"],
    "hisense": ["hisense"],
    "tcl": ["tcl"],
    "coocaa": ["coocaa"],
    "skyworth": ["skyworth"],

    # Gia dụng và thiết bị nhà bếp
    "philips": ["philips"],
    "sunhouse": ["sunhouse"],
    "kangaroo": ["kangaroo"],
    "locknlock": [
        "locknlock",
        "lock and lock",
        "lock&lock",
    ],
    "tefal": ["tefal"],
    "bluestone": ["bluestone"],
    "bear": ["bear"],
    "hafele": ["hafele"],
    "bosch": ["bosch"],
    "cuckoo": ["cuckoo"],
    "supor": ["supor"],
    "comfee": ["comfee"],
    "deerma": ["deerma"],
    "dreame": ["dreame"],
    "ecovacs": ["ecovacs"],
    "roborock": ["roborock"],
    "dyson": ["dyson"],

    # Âm thanh và phụ kiện
    "jbl": ["jbl"],
    "marshall": ["marshall"],
    "anker": ["anker", "soundcore"],
    "baseus": ["baseus"],
    "ugreen": ["ugreen"],
    "logitech": ["logitech"],
    "razer": ["razer"],
    "hyperx": ["hyperx"],
    "sennheiser": ["sennheiser"],
    "bose": ["bose"],

    # Thiết bị mạng
    "tp-link": [
        "tp link",
        "tp-link",
        "tplink",
    ],
    "tenda": ["tenda"],
    "mercusys": ["mercusys"],
    "totolink": ["totolink"],
    "ubiquiti": ["ubiquiti"],
}

    # Các từ ít giá trị khi so khớp tên sản phẩm.
    STOP_WORDS = {
        "dien",
        "thoai",
        "smartphone",
        "chinh",
        "hang",
        "chinhhang",
        "genuine",
        "new",
        "fullbox",
        "vn",
        "vna",
        "vn/a",
        "gia",
        "re",
        "tra",
        "gop",
        "bao",
        "hanh",
        "mau",
        "ram",
        "rom",
    }

    ACCESSORY_KEYWORDS = {
        "op",
        "lung",
        "oplung",
        "dan",
        "kinh",
        "cuong",
        "luc",
        "mieng",
        "miengdan",
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
        "khacten",
    }

    REPAIR_SERVICE_KEYWORDS = {
        "thay",
        "sua",
        "ep",
        "man",
        "hinh",
        "pin",
        "camera",
        "kinh",
        "vo",
        "nap",
        "lung",
        "oled",
        "lcd",
        "pisen",
    }

    USED_CONDITION_KEYWORDS = {
        "cu",
        "may cu",
        "hang cu",
        "da qua su dung",
        "like new",
        "99",
        "95",
        "tray",
        "xuoc",
        "can",
        "mop",
        "dep",
        "ngoai hinh",
    }

    ACTIVATED_CONDITION_KEYWORDS = {
        "da kich hoat",
        "kich hoat",
        "troi bao hanh",
        "bh kich hoat",
        "bao hanh dien tu",
    }

    REFURBISHED_CONDITION_KEYWORDS = {
        "refurbished",
        "renew",
        "tan trang",
        "doi tra",
    }

    # Ngưỡng điểm để quyết định hai sản phẩm có thuộc cùng nhóm hay không.
    MATCH_THRESHOLD = 0.82

        # Hàm chính: nhận danh sách sản phẩm và gom các sản phẩm tương đồng thành nhóm.
    def group_products(self, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        enriched_items = []

        for item in items:
            if not item.get("tenSanPham"):
                continue

            enriched_items.append(self._enrich_item(item))

        groups: list[dict[str, Any]] = []

        for item in enriched_items:
            matched_group = self._find_best_group(item, groups)

            if matched_group:
                matched_group["items"].append(item)
            else:
                groups.append({
                    "items": [item]
                })

        return [
            self._build_group_response(index + 1, group)
            for index, group in enumerate(groups)
        ]

    def filter_relevant_items(
        self,
        items: list[dict[str, Any]],
        keyword: str
    ) -> list[dict[str, Any]]:
        normalized_keyword = self._normalize_text(keyword)
        keyword_model_key = (
            self._extract_iphone_model_key(normalized_keyword)
            or self._extract_android_model_key(normalized_keyword)
        )

        repair_search_keywords = [
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

        accessory_search_keywords = [
            "op",
            "op lung",
            "op dien thoai",
            "op iphone",
            "op da",
            "dan",
            "dan da",
            "dan kinh",
            "dan man hinh",
            "kinh cuong luc",
            "cuong luc",
            "mieng dan",
            "bao da",
            "vi da",
            "kem vi",
            "vi dung the",
            "dung the",
            "card holder",
            "case",
            "cover",
            "magsafe",
            "sac",
            "cap",
            "cap sac",
            "cu sac",
            "tai nghe",
            "adapter",
            "pin du phong",
            "phu kien",
            "khacten",
            "mentor",
            "de giu dien thoai",
            "gia do dien thoai",
            "gia do",
            "day deo dien thoai",
            "vong giu dien thoai",
            "de sac",
            "sac khong day",
            "kiem sac",
            "den livestream",
            "remote",
            "baseus primetrip",
            "haiyuan",
            "uag magnetic",
            "zagg",
        ]

        phone_search_keywords = [
            "iphone",
            "galaxy",
            "redmi",
            "poco",
            "dien thoai",
            "smartphone",
        ]

        is_repair_search = self._has_condition_keyword(
            normalized_keyword,
            set(repair_search_keywords),
        )

        is_accessory_search = self._has_condition_keyword(
            normalized_keyword,
            set(accessory_search_keywords),
        )

        is_phone_search = (
            keyword_model_key is not None
            or self._has_condition_keyword(
                normalized_keyword,
                set(phone_search_keywords),
            )
        )

        expected_product_type = None

        if is_repair_search:
            expected_product_type = "repair_service"
        elif is_accessory_search:
            expected_product_type = "accessory"
        elif is_phone_search:
            expected_product_type = "phone"

        expected_condition = None
        if expected_product_type == "phone":
            expected_condition = self._detect_condition(normalized_keyword)

        filtered_items = []

        for item in items:
            if not item.get("tenSanPham"):
                continue

            enriched_item = self._enrich_item(item)
            matching_data = enriched_item["_matching"]
            product_type = matching_data.get("product_type")

            # Nếu hệ thống đã nhận diện được ý định tìm kiếm,
            # chỉ giữ đúng loại sản phẩm tương ứng.
            if expected_product_type and product_type != expected_product_type:
                continue

            condition = matching_data.get("condition", "new")
            if expected_condition and condition != expected_condition:
                continue


            # Nếu keyword có model rõ ràng, chỉ giữ sản phẩm cùng dòng model.
            if keyword_model_key:
                model_key = matching_data.get("model_key") or ""

                if not model_key.startswith(keyword_model_key):
                    continue

            filtered_items.append(
                self._remove_matching_metadata(enriched_item)
            )

        return filtered_items

    def _has_condition_keyword(
        self,
        normalized_text: str,
        keywords: set[str]
    ) -> bool:
        for keyword in keywords:
            normalized_keyword = self._normalize_text(keyword)
            if not normalized_keyword:
                continue

            pattern = (
                r"(?<!\w)"
                + re.escape(normalized_keyword).replace(r"\ ", r"\s+")
                + r"(?!\w)"
            )

            if re.search(pattern, normalized_text):
                return True

        return False

    def _detect_condition(self, normalized_name: str) -> str:
        if self._has_condition_keyword(
            normalized_name,
            self.REFURBISHED_CONDITION_KEYWORDS
        ):
            return "refurbished"

        if self._has_condition_keyword(
            normalized_name,
            self.ACTIVATED_CONDITION_KEYWORDS
        ):
            return "activated"

        if self._has_condition_keyword(
            normalized_name,
            self.USED_CONDITION_KEYWORDS
        ):
            return "used"

        return "new"

    # Hàm này bổ sung dữ liệu phục vụ matching cho từng sản phẩm.
    def _enrich_item(self, item: dict[str, Any]) -> dict[str, Any]:
        product_name = item.get("tenSanPham", "")
        normalized_name = self._normalize_text(product_name)
        tokens = self._tokenize(normalized_name)
        brand = self._extract_brand(normalized_name)
        storage = self._extract_storage(normalized_name)
        is_accessory = self._is_accessory(normalized_name)
        product_type = self._classify_product_type(normalized_name, is_accessory)
        condition = self._detect_condition(normalized_name)

        model_key = self._extract_model_key(
            normalized_name=normalized_name,
            tokens=tokens,
            brand=brand,
            storage=storage
        )

        enriched_item = dict(item)
        enriched_item["_matching"] = {
            "normalized_name": normalized_name,
            "tokens": tokens,
            "brand": brand,
            "storage": storage,
            "model_key": model_key,
            "is_accessory": is_accessory,
            "product_type": product_type,
            "condition": condition,
            "tinhTrang": condition
        }

        return enriched_item

    # Hàm này tìm nhóm phù hợp nhất cho một sản phẩm.
    def _find_best_group(
        self,
        item: dict[str, Any],
        groups: list[dict[str, Any]]
    ):
        best_group = None
        best_score = 0.0

        for group in groups:
            representative_item = group["items"][0]
            score = self._calculate_match_score(item, representative_item)

            if score > best_score:
                best_score = score
                best_group = group

        if best_score >= self.MATCH_THRESHOLD:
            return best_group

        return None

    # Hàm này tính điểm tương đồng giữa hai sản phẩm.
    def _calculate_match_score(
        self,
        item_a: dict[str, Any],
        item_b: dict[str, Any]
    ) -> float:
        data_a = item_a["_matching"]
        data_b = item_b["_matching"]

        if data_a.get("product_type") != data_b.get("product_type"):
            return 0.0

        if data_a.get("condition", "new") != data_b.get("condition", "new"):
            return 0.0

        brand_a = data_a["brand"]
        brand_b = data_b["brand"]

        if brand_a and brand_b and brand_a != brand_b:
            return 0.0

        storage_a = data_a["storage"]
        storage_b = data_b["storage"]
        model_key_a = data_a["model_key"]
        model_key_b = data_b["model_key"]

        # Nếu có model_key thì ưu tiên so khớp theo model.
        if model_key_a and model_key_b:
            if model_key_a != model_key_b:
                return 0.0

            score = 0.88

            if storage_a and storage_b:
                if storage_a == storage_b:
                    score += 0.1
                else:
                    score -= 0.35

            return max(0.0, min(score, 1.0))

        # Nếu không có model_key rõ ràng thì dùng Jaccard + Levenshtein.
        jaccard_score = self._jaccard_similarity(
            data_a["tokens"],
            data_b["tokens"]
        )

        levenshtein_score = self._levenshtein_similarity(
            data_a["normalized_name"],
            data_b["normalized_name"]
        )

        score = jaccard_score * 0.55 + levenshtein_score * 0.45

        if brand_a and brand_b and brand_a == brand_b:
            score += 0.08

        if storage_a and storage_b:
            if storage_a == storage_b:
                score += 0.08
            else:
                score -= 0.2

        return max(0.0, min(score, 1.0))

    # Hàm này tạo dữ liệu trả về cho từng nhóm sản phẩm.
    def _build_group_response(
        self,
        index: int,
        group: dict[str, Any]
    ) -> dict[str, Any]:
        items = [
            self._remove_matching_metadata(item)
            for item in group["items"]
        ]

        items = sorted(
            items,
            key=lambda item: (
                item.get("giaHienTai") is None,
                item.get("giaHienTai") or 0
            )
        )

        representative = self._choose_representative_item(items)

        prices = [
            item.get("giaHienTai")
            for item in items
            if item.get("giaHienTai") is not None
        ]

        sources = sorted({
            item.get("sanTMDT")
            for item in items
            if item.get("sanTMDT")
        })

        matching_data = group["items"][0]["_matching"]

        return {
            "maNhomTam": index,
            "tenChuanHoa": representative.get("tenSanPham"),
            "thuongHieu": matching_data.get("brand"),
            "dungLuong": matching_data.get("storage"),
            "modelKey": matching_data.get("model_key"),
            "productType": matching_data.get("product_type"),
            "tinhTrang": matching_data.get("condition", "new"),
            "soNguon": len(sources),
            "nguon": sources,
            "soSanPham": len(items),
            "giaThapNhat": min(prices) if prices else None,
            "giaCaoNhat": max(prices) if prices else None,
            "sanPhamGiaThapNhat": items[0] if items else None,
            "items": items
        }

    # Hàm này chọn sản phẩm đại diện cho nhóm.
    def _choose_representative_item(
        self,
        items: list[dict[str, Any]]
    ) -> dict[str, Any]:
        if not items:
            return {}

        def representative_score(item: dict[str, Any]) -> tuple:
            name = item.get("tenSanPham") or ""
            normalized_name = self._normalize_text(name)
            source = item.get("sanTMDT") or ""

            bad_title_keywords = [
                "may cu",
                "hang cu",
                "san pham cu",
                "troi bao hanh",
                "da kich hoat",
                "bh kich hoat",
                "man hinh sang",
                "camera",
                "snapdragon",
                "bao hanh 12 thang",
            ]

            bad_keyword_count = sum(
                1 for keyword in bad_title_keywords
                if keyword in normalized_name
            )

            source_priority = {
                "FPT Shop": 0,
                "CellPhoneS": 1,
                "Hoàng Hà Mobile": 2,
                "Lazada": 3,
            }.get(source, 4)

            return (
                bad_keyword_count,
                source_priority,
                len(name)
            )

        return min(items, key=representative_score)

    # Hàm này xóa dữ liệu kỹ thuật _matching trước khi trả ra API.
    def _remove_matching_metadata(
        self,
        item: dict[str, Any]
    ) -> dict[str, Any]:
        clean_item = dict(item)
        clean_item.pop("_matching", None)
        return clean_item

    # Hàm này tạo khóa model để phân biệt các dòng sản phẩm.
    def _extract_model_key(
        self,
        normalized_name: str,
        tokens: list[str],
        brand: str | None,
        storage: str | None
    ) -> str:
        iphone_key = self._extract_iphone_model_key(normalized_name)

        if iphone_key:
            return iphone_key

        android_key = self._extract_android_model_key(normalized_name)

        if android_key:
            return android_key

        clean_tokens = []

        for token in tokens:
            if token in self.STOP_WORDS:
                continue

            if storage and token == storage:
                continue

            clean_tokens.append(token)

        if brand:
            clean_tokens = [
                token for token in clean_tokens
                if token != brand
            ]
            return " ".join([brand] + clean_tokens[:6]).strip()

        return " ".join(clean_tokens[:6]).strip()

    # Hàm này tách riêng model iPhone để tránh gom nhầm iPhone 15 với iPhone 15 Plus.
    def _extract_iphone_model_key(self, normalized_name: str) -> str | None:
        match = re.search(
            r"\biphone\s+(se|\d{1,2}e?|\d{1,2})"
            r"(?:\s+(pro\s+max|pro|max|plus|e))?",
            normalized_name
        )

        if not match:
            return None

        generation = match.group(1)
        variant = match.group(2) or ""

        if variant == "max":
            variant = "pro max"

        model_parts = ["apple", "iphone", generation]

        if variant:
            model_parts.append(variant)

        if "sim viettel" in normalized_name:
            model_parts.append("sim viettel")

        return " ".join(model_parts).strip()

    def _extract_android_model_key(self, normalized_name: str) -> str | None:
        android_patterns = [
            (
                r"\b(?:samsung\s+)?galaxy\s+([a-z])\s*(\d{1,3})(?:\s+(ultra|plus|fe))?\b",
                lambda match: [
                    "samsung",
                    "galaxy",
                    f"{match.group(1)}{match.group(2)}",
                    match.group(3)
                ]
            ),
            (
                r"\b(?:xiaomi\s+)?redmi\s+note\s*(\d{1,3}[a-z]?)(?:\s+(pro\s+max|pro|max|plus|ultra))?\b",
                lambda match: [
                    "xiaomi",
                    "redmi",
                    "note",
                    match.group(1),
                    match.group(2)
                ]
            ),
            (
                r"\b(?:xiaomi\s+)?redmi\s+(\d{1,3}[a-z]?)(?:\s+(pro\s+max|pro|max|plus|ultra))?\b",
                lambda match: [
                    "xiaomi",
                    "redmi",
                    match.group(1),
                    match.group(2)
                ]
            ),
            (
                r"\bxiaomi\s+(mi\s+)?(\d{1,3}[a-z]?)(?:\s+(pro\s+max|pro|max|plus|ultra|lite))?\b",
                lambda match: [
                    "xiaomi",
                    "mi" if match.group(1) else None,
                    match.group(2),
                    match.group(3)
                ]
            ),
            (
                r"\b(?:xiaomi\s+)?poco\s+([a-z]\d{1,3}[a-z]?)(?:\s+(pro\s+max|pro|max|plus|ultra))?\b",
                lambda match: [
                    "xiaomi",
                    "poco",
                    match.group(1),
                    match.group(2)
                ]
            ),
            (
                r"\boppo\s+(reno|find|a)\s*([a-z]?\d{1,3}[a-z]?)(?:\s+(pro\s+max|pro|max|plus|ultra|f))?\b",
                lambda match: [
                    "oppo",
                    match.group(1),
                    match.group(2),
                    match.group(3)
                ]
            ),
            (
                r"\bvivo\s+([a-z]?\d{1,3}[a-z]?)(?:\s+(pro\s+max|pro|max|plus|ultra))?\b",
                lambda match: [
                    "vivo",
                    match.group(1),
                    match.group(2)
                ]
            ),
            (
                r"\brealme\s+([a-z]?\d{1,3}[a-z]?)(?:\s+(pro\s+max|pro|max|plus|ultra))?\b",
                lambda match: [
                    "realme",
                    match.group(1),
                    match.group(2)
                ]
            ),
            (
                r"\bhonor\s+([a-z]?\d{1,3}[a-z]?)(?:\s+(pro\s+max|pro|max|plus|ultra))?\b",
                lambda match: [
                    "honor",
                    match.group(1),
                    match.group(2)
                ]
            ),
            (
                r"\bnokia\s+([a-z]?\d{1,3}[a-z]?)(?:\s+(pro\s+max|pro|max|plus|ultra))?\b",
                lambda match: [
                    "nokia",
                    match.group(1),
                    match.group(2)
                ]
            ),
        ]

        for pattern, build_parts in android_patterns:
            match = re.search(pattern, normalized_name)

            if not match:
                continue

            parts = [
                str(part).strip()
                for part in build_parts(match)
                if part
            ]

            return " ".join(parts)

        return None

    # Hàm này nhận diện thương hiệu từ tên sản phẩm.
    def _extract_brand(self, normalized_name: str) -> str | None:
        # Loại bỏ đơn vị công suất máy lạnh như 1 HP, 1.5 HP, 2 HP
        # để không nhận nhầm thành thương hiệu HP.
        ten_de_nhan_dien = re.sub(
            r"\b\d+(?:[.,]\d+)?\s*hp\b",
            " ",
            normalized_name,
        )

        for brand, aliases in self.BRAND_ALIASES.items():
            for alias in aliases:
                if re.search(
                    rf"\b{re.escape(alias)}\b",
                    ten_de_nhan_dien,
                ):
                    return brand

        return None

    # Hàm này nhận diện dung lượng bộ nhớ như 128GB, 256GB, 1TB.
    def _extract_storage(self, normalized_name: str) -> str | None:
        match = re.search(
            r"\b(64|128|256|512)\s*gb\b|\b(1|2)\s*tb\b",
            normalized_name
        )

        if not match:
            return None

        storage = match.group(0)
        return storage.replace(" ", "")

    def _classify_product_type(
        self,
        normalized_name: str,
        is_accessory: bool
    ) -> str:
        """
        Phân loại sản phẩm dựa trên tên đã được chuẩn hóa.

        Thứ tự kiểm tra đi từ nhóm cụ thể đến nhóm tổng quát để hạn chế
        phân loại nhầm, ví dụ:
        - "quạt tản nhiệt laptop" phải là linh kiện/phụ kiện máy tính,
        không phải quạt gia dụng.
        - "tai nghe bluetooth" phải là thiết bị âm thanh,
        không phải phụ kiện chung.
        """

        def khop_bat_ky(danh_sach_pattern: list[str]) -> bool:
            return any(
                re.search(pattern, normalized_name)
                for pattern in danh_sach_pattern
            )

        # 1. Dịch vụ sửa chữa
        repair_patterns = [
            r"\bdich\s+vu\s+sua\s+chua\b",
            r"\bsua\s+chua\b",
            r"\bthay\s+man\s+hinh\b",
            r"\bthay\s+pin\b",
            r"\bthay\s+camera\b",
            r"\bthay\s+kinh\b",
            r"\bthay\s+vo\b",
            r"\bthay\s+loa\b",
            r"\bep\s+kinh\b",
            r"\bsua\s+dien\s+thoai\b",
            r"\bsua\s+laptop\b",
            r"\bsua\s+may\s+tinh\b",
        ]

        if khop_bat_ky(repair_patterns):
            return "repair_service"

        # 2. Máy tính bảng
        tablet_patterns = [
            r"\bipad\b",
            r"\btablet\b",
            r"\bmay\s+tinh\s+bang\b",
            r"\bgalaxy\s+tab\b",
            r"\bxiaomi\s+pad\b",
            r"\boppo\s+pad\b",
            r"\bhuawei\s+matepad\b",
        ]

        if khop_bat_ky(tablet_patterns):
            return "tablet"

        # 7. Linh kiện máy tính
        computer_component_patterns = [
            r"\bcard\s+man\s+hinh\b",
            r"\bcard\s+do\s+hoa\b",
            r"\bvga\b",
            r"\bgpu\b",
            r"\bcpu\b",
            r"\bbo\s+vi\s+xu\s+ly\b",
            r"\bmainboard\b",
            r"\bmain\s+board\b",
            r"\bbo\s+mach\s+chu\b",
            r"\bram\b",
            r"\bssd\b",
            r"\bhdd\b",
            r"\bo\s+cung\b",
            r"\bnguon\s+may\s+tinh\b",
            r"\bpower\s+supply\b",
            r"\bcase\s+may\s+tinh\b",
            r"\bvo\s+case\b",
            r"\btan\s+nhiet\s+cpu\b",
            r"\btan\s+nhiet\s+laptop\b",
            r"\bquat\s+tan\s+nhiet\b",
        ]

        if khop_bat_ky(computer_component_patterns):
            return "computer_component"

        # 3. Laptop
        laptop_patterns = [
            r"\blaptop\b",
            r"\bnotebook\b",
            r"\bmacbook\b",
            r"\bultrabook\b",
            r"\bchromebook\b",
            r"\bvivobook\b",
            r"\bzenbook\b",
            r"\bthinkpad\b",
            r"\bideapad\b",
            r"\baspire\b",
            r"\bpredator\s+helios\b",
            r"\brog\s+strix\b",
        ]

        if khop_bat_ky(laptop_patterns):
            return "laptop"

        # 4. Máy tính để bàn / PC
        desktop_patterns = [
            r"\bdesktop\b",
            r"\bmay\s+tinh\s+de\s+ban\b",
            r"\bmay\s+bo\b",
            r"\bpc\s+gaming\b",
            r"\bpc\s+van\s+phong\b",
            r"\bmini\s+pc\b",
            r"\bimac\b",
            r"\bworkstation\b",
            r"\ball\s+in\s+one\b",
        ]

        if khop_bat_ky(desktop_patterns):
            return "desktop"

        # 5. Màn hình máy tính
        monitor_patterns = [
            r"\bman\s+hinh\s+may\s+tinh\b",
            r"\bmonitor\b",
            r"\bman\s+hinh\s+gaming\b",
            r"\bman\s+hinh\s+cong\b",
        ]

        if khop_bat_ky(monitor_patterns):
            return "monitor"

        # 6. Máy in / Máy scan
        printer_patterns = [
            r"\bmay\s+in\b",
            r"\bprinter\b",
            r"\bmay\s+scan\b",
            r"\bscanner\b",
            r"\bmay\s+photocopy\b",
            r"\bmay\s+in\s+hoa\s+don\b",
            r"\bmay\s+in\s+nhiet\b",
        ]

        if khop_bat_ky(printer_patterns):
            return "printer"


        # 8. Thiết bị mạng
        network_patterns = [
            r"\brouter\b",
            r"\bmodem\b",
            r"\bbo\s+phat\s+wifi\b",
            r"\bbo\s+kich\s+song\s+wifi\b",
            r"\bmesh\s+wifi\b",
            r"\bswitch\s+mang\b",
            r"\baccess\s+point\b",
            r"\bcard\s+mang\b",
        ]

        if khop_bat_ky(network_patterns):
            return "network_device"

        # 9. Tivi
        television_patterns = [
            r"\btivi\b",
            r"\bsmart\s+tv\b",
            r"\bsmart\s+tivi\b",
            r"\bgoogle\s+tv\b",
            r"\bandroid\s+tv\b",
            r"\bqled\s+tv\b",
            r"\boled\s+tv\b",
            r"\bmini\s+led\s+tv\b",
        ]

        if khop_bat_ky(television_patterns):
            return "television"

        # 10. Máy ảnh / Camera
        camera_patterns = [
            r"\bmay\s+anh\b",
            r"\bcamera\s+hanh\s+trinh\b",
            r"\bcamera\s+giam\s+sat\b",
            r"\bcamera\s+an\s+ninh\b",
            r"\bcamera\s+ip\b",
            r"\bwebcam\b",
            r"\baction\s+camera\b",
            r"\bgopro\b",
            r"\bong\s+kinh\s+may\s+anh\b",
        ]

        if khop_bat_ky(camera_patterns):
            return "camera"

        # 11. Đồng hồ thông minh
        smartwatch_patterns = [
            r"\bsmartwatch\b",
            r"\bsmart\s+watch\b",
            r"\bapple\s+watch\b",
            r"\bgalaxy\s+watch\b",
            r"\bdong\s+ho\s+thong\s+minh\b",
            r"\bvong\s+deo\s+thong\s+minh\b",
            r"\bsmartband\b",
        ]

        if khop_bat_ky(smartwatch_patterns):
            return "smartwatch"

        # 12. Tai nghe / Loa
        audio_patterns = [
            r"\btai\s+nghe\b",
            r"\bheadphone\b",
            r"\bheadset\b",
            r"\bearphone\b",
            r"\bearbuds\b",
            r"\bairpods\b",
            r"\bloa\s+bluetooth\b",
            r"\bloa\s+soundbar\b",
            r"\bsoundbar\b",
            r"\bloa\s+keo\b",
            r"\bloa\s+may\s+tinh\b",
            r"\bmicro\s+karaoke\b",
        ]

        if khop_bat_ky(audio_patterns):
            return "headphone_speaker"

        # 13. Tủ lạnh
        refrigerator_patterns = [
            r"\btu\s+lanh\b",
            r"\btu\s+dong\b",
            r"\btu\s+mat\b",
            r"\btu\s+bao\s+quan\b",
            r"\bmini\s+fridge\b",
            r"\brefrigerator\b",
        ]

        if khop_bat_ky(refrigerator_patterns):
            return "refrigerator"


        # 17. Quạt điều hòa
        air_cooler_patterns = [
            r"\bquat\s+dieu\s+hoa\b",
            r"\bmay\s+lam\s+mat\s+khong\s+khi\b",
            r"\bair\s+cooler\b",
        ]

        if khop_bat_ky(air_cooler_patterns):
            return "air_cooler"


        # 14. Máy lạnh / Điều hòa
        air_conditioner_patterns = [
            r"\bmay\s+lanh\b",
            r"\bdieu\s+hoa\b",
            r"\bair\s+conditioner\b",
            r"\bmay\s+dieu\s+hoa\b",
        ]

        if khop_bat_ky(air_conditioner_patterns):
            return "air_conditioner"

        # 15. Máy giặt
        washing_machine_patterns = [
            r"\bmay\s+giat\b",
            r"\bmay\s+giat\s+cua\s+truoc\b",
            r"\bmay\s+giat\s+cua\s+tren\b",
            r"\bwasher\b",
        ]

        if khop_bat_ky(washing_machine_patterns):
            return "washing_machine"

        # 16. Máy sấy
        dryer_patterns = [
            r"\bmay\s+say\s+quan\s+ao\b",
            r"\bmay\s+say\s+bom\s+nhiet\b",
            r"\btu\s+say\s+quan\s+ao\b",
            r"\bdryer\b",
        ]

        if khop_bat_ky(dryer_patterns):
            return "dryer"

        # 18. Quạt gia dụng
        fan_patterns = [
            r"\bquat\s+dien\b",
            r"\bquat\s+may\b",
            r"\bquat\s+dung\b",
            r"\bquat\s+treo\s+tuong\b",
            r"\bquat\s+tran\b",
            r"\bquat\s+hop\b",
            r"\bquat\s+thap\b",
            r"\bquat\s+tich\s+dien\b",
        ]

        if khop_bat_ky(fan_patterns):
            return "fan"

        # 19. Máy lọc không khí
        air_purifier_patterns = [
            r"\bmay\s+loc\s+khong\s+khi\b",
            r"\bair\s+purifier\b",
            r"\bmay\s+hut\s+am\b",
            r"\bmay\s+tao\s+am\b",
        ]

        if khop_bat_ky(air_purifier_patterns):
            return "air_purifier"

        # 20. Máy hút bụi
        vacuum_patterns = [
            r"\bmay\s+hut\s+bui\b",
            r"\brobot\s+hut\s+bui\b",
            r"\brobot\s+lau\s+nha\b",
            r"\bvacuum\b",
        ]

        if khop_bat_ky(vacuum_patterns):
            return "vacuum_cleaner"

        # 21. Thiết bị nhà bếp
        kitchen_patterns = [
            r"\bnoi\s+com\s+dien\b",
            r"\bnoi\s+chien\s+khong\s+dau\b",
            r"\bbep\s+tu\b",
            r"\bbep\s+hồng\s+ngoai\b",
            r"\bbep\s+hong\s+ngoai\b",
            r"\blo\s+vi\s+song\b",
            r"\blo\s+nuong\b",
            r"\bmay\s+xay\s+sinh\s+to\b",
            r"\bmay\s+ep\s+cham\b",
            r"\bmay\s+pha\s+ca\s+phe\b",
            r"\bam\s+sieu\s+toc\b",
            r"\bmay\s+rua\s+chen\b",
            r"\bmay\s+rua\s+bat\b",
            r"\bmay\s+hut\s+mui\b",
        ]

        if khop_bat_ky(kitchen_patterns):
            return "kitchen_appliance"

        # 22. Thiết bị chăm sóc cá nhân
        personal_care_patterns = [
            r"\bmay\s+say\s+toc\b",
            r"\bmay\s+cao\s+rau\b",
            r"\bban\s+chai\s+dien\b",
            r"\bmay\s+rua\s+mat\b",
            r"\bmay\s+massage\b",
            r"\bmay\s+tam\s+nuoc\b",
            r"\bmay\s+tri\s+lieu\b",
        ]

        if khop_bat_ky(personal_care_patterns):
            return "personal_care"

        # 23. Phụ kiện điện thoại và thiết bị.
        #
        # Phải kiểm tra phụ kiện trước điện thoại vì các tên như
        # "Ốp lưng iPhone 15 Pro Max" vẫn chứa model điện thoại và sẽ
        # khớp phone_patterns nếu kiểm tra điện thoại trước.
        if is_accessory:
            return "accessory"

        # 24. Điện thoại
        phone_patterns = [
            r"\biphone\s+(se|\d{1,2}e?|\d{1,2})\b",
            r"\bsamsung\s+galaxy\s+[a-z0-9]+\b",
            r"\bgalaxy\s+[a-z0-9]+\b",
            r"\bxiaomi\s+\d{1,2}[a-z]?\b",
            r"\bredmi\s+(note\s+)?\d{1,2}[a-z]?\b",
            r"\bpoco\s+[a-z0-9]+\b",
            r"\boppo\s+(reno|find|a)\s*[a-z0-9]+\b",
            r"\bvivo\s+[a-z0-9]+\b",
            r"\brealme\s+[a-z0-9]+\b",
            r"\bhonor\s+[a-z0-9]+\b",
            r"\bnokia\s+[a-z0-9]+\b",
            r"\bdien\s+thoai\b",
            r"\bsmartphone\b",
        ]

        if khop_bat_ky(phone_patterns):
            return "phone"

        # 25. Nhóm gia dụng tổng quát
        home_appliance_patterns = [
            r"\bgia\s+dung\b",
            r"\bdien\s+gia\s+dung\b",
            r"\bthiet\s+bi\s+gia\s+dinh\b",
        ]

        if khop_bat_ky(home_appliance_patterns):
            return "home_appliance"

        return "other"

    def _is_accessory(self, normalized_name: str) -> bool:
        false_accessory_phrases = [
            "bao hanh",
            "troi bao hanh",
            "het bao hanh",
            "con bao hanh",
        ]

        for phrase in false_accessory_phrases:
            if phrase in normalized_name:
                normalized_name = normalized_name.replace(phrase, " ")

        tokens = set(normalized_name.split())

        strong_accessory_tokens = {
            "oplung",
            "miengdan",
            "case",
            "cover",
            "magsafe",
            "adapter",
        }

        if tokens.intersection(strong_accessory_tokens):
            return True

        accessory_patterns = [
            r"\bop\s+lung\b",
            r"\bop\s+dien\s+thoai\b",
            r"\bop\s+iphone\b",
            r"\bop\s+da\b",
            r"\bdan\s+kinh\b",
            r"\bdan\s+da\b",
            r"\bkinh\s+dan\b",
            r"\bdan\s+man\s+hinh\b",
            r"\bkinh\s+dan\s+man\s+hinh\b",
            r"\btam\s+dan\b",
            r"\bdan\s+chong\s+va\s+dap\b",
            r"\bcuong\s+luc\b",
            r"\bkinh\s+cuong\s+luc\b",
            r"\bmieng\s+dan\b",
            r"\bmocoll\b",
            r"\bbao\s+da\b",
            r"\bvi\s+da\b",
            r"\bkem\s+vi\b",
            r"\bvi\s+dung\s+the\b",
            r"\bdung\s+the\b",
            r"\bcard\s+holder\b",
            r"\bcase\b",
            r"\bcover\b",
            r"\bmagsafe\b",
            r"\bcap\s+sac\b",
            r"\bcu\s+sac\b",
            r"\bsac\b",
            r"\btai\s+nghe\b",
            r"\bphu\s+kien\b",
            r"\bkhacten\b",
            r"\bmentor\b",
            r"\bde\s+giu\s+dien\s+thoai\b",
            r"\bgia\s+do\s+dien\s+thoai\b",
            r"\bgia\s+do\b",
            r"\bday\s+deo\s+dien\s+thoai\b",
            r"\bvong\s+giu\s+dien\s+thoai\b",
            r"\bde\s+sac\b",
            r"\bsac\s+khong\s+day\b",
            r"\bkiem\s+sac\b",
            r"\bden\s+livestream\b",
            r"\bremote\b",
            r"\bbaseus\s+primetrip\b",
            r"\bhaiyuan\b",
            r"\buag\s+magnetic\b",
            r"\bzagg\b",
        ]

        for pattern in accessory_patterns:
            if re.search(pattern, normalized_name):
                return True

        return False

    # Hàm này chuẩn hóa tên sản phẩm trước khi so khớp.
    def _normalize_text(self, text: str) -> str:
        text = text or ""
        text = text.lower()
        text = unicodedata.normalize("NFD", text)
        text = "".join(
            char for char in text
            if unicodedata.category(char) != "Mn"
        )
        text = text.replace("đ", "d")
        text = re.sub(r"[/\-_,.()+]", " ", text)
        text = re.sub(r"\s+", " ", text)

        return text.strip()

    # Hàm này tách tên sản phẩm thành các token quan trọng.
    def _tokenize(self, normalized_text: str) -> list[str]:
        tokens = normalized_text.split()

        return [
            token for token in tokens
            if token and token not in self.STOP_WORDS
        ]

    # Hàm này tính Jaccard Similarity giữa hai tập token.
    def _jaccard_similarity(
        self,
        tokens_a: list[str],
        tokens_b: list[str]
    ) -> float:
        set_a = set(tokens_a)
        set_b = set(tokens_b)

        if not set_a or not set_b:
            return 0.0

        intersection = len(set_a.intersection(set_b))
        union = len(set_a.union(set_b))

        return intersection / union

    # Hàm này chuyển Levenshtein Distance thành điểm tương đồng từ 0 đến 1.
    def _levenshtein_similarity(
        self,
        text_a: str,
        text_b: str
    ) -> float:
        distance = self._levenshtein_distance(text_a, text_b)
        max_length = max(len(text_a), len(text_b))

        if max_length == 0:
            return 1.0

        return 1 - distance / max_length

    # Hàm này tính Levenshtein Distance giữa hai chuỗi.
    def _levenshtein_distance(
        self,
        text_a: str,
        text_b: str
    ) -> int:
        if text_a == text_b:
            return 0

        if len(text_a) == 0:
            return len(text_b)

        if len(text_b) == 0:
            return len(text_a)

        previous_row = list(range(len(text_b) + 1))

        for i, char_a in enumerate(text_a, start=1):
            current_row = [i]

            for j, char_b in enumerate(text_b, start=1):
                insert_cost = current_row[j - 1] + 1
                delete_cost = previous_row[j] + 1
                replace_cost = previous_row[j - 1]

                if char_a != char_b:
                    replace_cost += 1

                current_row.append(
                    min(insert_cost, delete_cost, replace_cost)
                )

            previous_row = current_row

        return previous_row[-1]

