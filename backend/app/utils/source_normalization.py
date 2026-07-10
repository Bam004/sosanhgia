import re
from typing import Tuple

SOURCE_ALIASES = {
    "cellphones": ["cellphones", "cellphone s", "cell phone s", "cellphones.com.vn"],
    "fptshop": ["fptshop", "fpt shop", "fptshop.com.vn", "fpt"],
    "hoangha": ["hoangha", "hoang ha", "hoàng hà", "hoanghamobile", "hoàng hà mobile", "hoang ha mobile"],
    "lazada": ["lazada", "lazadavn", "lazada.vn"],
    "tiki": ["tiki", "tiki.vn", "tikivn"],
    "shopee": ["shopee", "shopee.vn", "shopeevn"],
    "tiktok": ["tiktok", "tiktok shop", "tiktokshop"],
    "didongviet": ["didongviet", "di dong viet", "di động việt"],
    "thegioididong": ["thegioididong", "thế giới di động", "tgdd"],
    "dienmayxanh": ["dienmayxanh", "điện máy xanh", "dmx"]
}

DISPLAY_NAMES = {
    "cellphones": "CellphoneS",
    "fptshop": "FPT Shop",
    "hoangha": "Hoàng Hà Mobile",
    "lazada": "Lazada",
    "tiki": "Tiki",
    "shopee": "Shopee",
    "tiktok": "TikTok Shop",
    "didongviet": "Di Động Việt",
    "thegioididong": "Thế Giới Di Động",
    "dienmayxanh": "Điện Máy Xanh"
}

def normalize_source_code(merchant_name: str) -> Tuple[str, str]:
    """
    Given a raw merchant name (e.g. "FPT Shop", "cellphones", "Hoang Ha"),
    returns a tuple of (sourceCode, sourceName).

    If no alias is matched, returns a lowercased slug as sourceCode and the original name as sourceName.
    """
    if not merchant_name:
        return ("unknown", "Unknown")

    lower_name = merchant_name.lower().strip()

    for code, aliases in SOURCE_ALIASES.items():
        for alias in aliases:
            if lower_name == alias:
                return (code, DISPLAY_NAMES.get(code, merchant_name))

    # Fallback if no exact match (try contains)
    for code, aliases in SOURCE_ALIASES.items():
        for alias in aliases:
            if alias in lower_name:
                return (code, DISPLAY_NAMES.get(code, merchant_name))

    # Unmatched fallback: generate a basic slug
    fallback_code = re.sub(r'[^a-z0-9]', '_', lower_name)
    return (fallback_code, merchant_name.strip())
