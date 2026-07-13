import re
import unicodedata
from typing import Any


class TextMatchingService:
    # Khai báo thương hiệu và các tên gọi thường gặp để nhận diện brand.
    BRAND_ALIASES = {
        "apple": ["apple", "iphone", "ipad", "macbook"],
        "samsung": ["samsung", "galaxy"],
        "xiaomi": ["xiaomi", "redmi", "poco"],
        "oppo": ["oppo"],
        "vivo": ["vivo"],
        "realme": ["realme"],
        "nokia": ["nokia"],
        "honor": ["honor"],
        "masstel": ["masstel"],
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
        for brand, aliases in self.BRAND_ALIASES.items():
            for alias in aliases:
                if re.search(rf"\b{re.escape(alias)}\b", normalized_name):
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
        repair_patterns = [
            r"\bthay\s+man\s+hinh\b",
            r"\bthay\s+pin\b",
            r"\bthay\s+camera\b",
            r"\bthay\s+kinh\b",
            r"\bep\s+kinh\b",
            r"\bsua\s+chua\b",
            r"\boled\b",
            r"\blcd\b",
        ]

        for pattern in repair_patterns:
            if re.search(pattern, normalized_name):
                return "repair_service"

        if is_accessory:
            return "accessory"

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
        ]

        for pattern in phone_patterns:
            if re.search(pattern, normalized_name):
                return "phone"

        if "dien thoai" in normalized_name or "smartphone" in normalized_name:
            return "phone"

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

