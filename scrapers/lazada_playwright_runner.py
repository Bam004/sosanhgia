
import argparse
import json
import re
import sys
from urllib.parse import quote

from scrapy import Selector
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError


def clean_text(value):
    if not value:
        return None
    return re.sub(r"\s+", " ", value).strip()


def get_text_lines(card):
    lines = []
    for text in card.css("::text").getall():
        text = clean_text(text)
        if text:
            lines.append(text)
    return lines


def extract_title(card, text_lines):
    title = clean_text(card.css('a[title]::attr(title)').get())

    if title:
        return title

    alt = clean_text(card.css("img::attr(alt)").get())

    if alt:
        return alt

    for line in text_lines:
        if "?" not in line and "Off" not in line and "Voucher" not in line and "?? b?n" not in line:
            return line

    return None


def extract_price(text_lines):
    price_patterns = [
        # Ký hiệu tiền nằm trước giá: ₫5.500.000
        re.compile(
            r"(?:₫|vnđ|vnd|đồng|đ)\s*"
            r"(\d{1,3}(?:[.,]\d{3})+|\d{5,})",
            flags=re.IGNORECASE,
        ),

        # Ký hiệu tiền nằm sau giá: 5.500.000 ₫
        re.compile(
            r"(?<!\d)"
            r"(\d{1,3}(?:[.,]\d{3})+|\d{5,})"
            r"\s*(?:₫|vnđ|vnd|đồng|đ)(?!\w)",
            flags=re.IGNORECASE,
        ),
    ]

    for line in text_lines:
        clean_line = str(line or "").replace("\xa0", " ").strip()

        for pattern in price_patterns:
            match = pattern.search(clean_line)

            if not match:
                continue

            digits = re.sub(r"\D", "", match.group(1))

            if digits:
                return int(digits)

    return None

def extract_link(card):
    hrefs = card.css('a[href*="/products/"]::attr(href)').getall()

    if not hrefs:
        return None

    preferred_href = None

    for href in hrefs:
        if href.startswith("//www.lazada.vn/products/"):
            preferred_href = href
            break

    href = preferred_href or hrefs[0]

    if href.startswith("//"):
        return "https:" + href

    if href.startswith("/"):
        return "https://www.lazada.vn" + href

    return href


def extract_image(card):
    sources = []

    for img in card.css("img"):
        src = img.attrib.get("src") or img.attrib.get("data-src")
        if src:
            sources.append(src)

    for src in sources:
        if src.startswith("//"):
            src = "https:" + src

        if src.startswith("http") and "lazcdn" in src:
            return src

    return None


def extract_review_count(text_lines):
    for line in text_lines:
        match = re.fullmatch(r"\(([\d\.]+)\)", line)
        if match:
            digits = re.sub(r"\D", "", match.group(1))
            return int(digits) if digits else None
    return None


def extract_sold_text(text_lines):
    for line in text_lines:
        if "?? b?n" in line:
            return line
    return None


def parse_products(html, keyword, page_number):
    selector = Selector(text=html)
    cards = selector.css('div[data-qa-locator="product-item"]')

    products = []

    for card in cards:
        text_lines = get_text_lines(card)

        title = extract_title(card, text_lines)
        price = extract_price(text_lines)
        link = extract_link(card)
        image = extract_image(card)
        review_count = extract_review_count(text_lines)
        sold_text = extract_sold_text(text_lines)
        location = text_lines[-1] if text_lines else None

        if not title or price is None or not link:
            continue

        products.append(
            {
                "tenSanPham": title,
                "sanTMDT": "Lazada",
                "giaHienTai": price,
                "linkGoc": link,
                "hinhAnh": image,
                "danhGia": None,
                "soLuongDanhGia": review_count,
                "thuocTinh": {
                    "keyword": keyword,
                    "page": page_number,
                    "daBan": sold_text,
                    "diaDiem": location,
                },
            }
        )

    return products


def build_search_url(keyword, page):
    return f"https://www.lazada.vn/catalog/?q={quote(keyword)}&page={page}"


def crawl_lazada(keyword, max_pages, headless):
    all_products = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=headless,
            slow_mo=150 if not headless else 0,
        )

        context = browser.new_context(
            locale="vi-VN",
            viewport={"width": 1366, "height": 768},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/126.0.0.0 Safari/537.36"
            ),
            extra_http_headers={
                "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"
            },
        )

        try:
            for page_number in range(1, max_pages + 1):
                url = build_search_url(keyword, page_number)
                print(f"Opening Lazada page {page_number}: {url}", file=sys.stderr)

                page = context.new_page()
                page.goto(url, wait_until="domcontentloaded", timeout=60000)

                try:
                    page.wait_for_load_state("networkidle", timeout=20000)
                except PlaywrightTimeoutError:
                    print("Lazada networkidle timeout, continue parsing...", file=sys.stderr)

                try:
                    page.wait_for_selector(
                        'div[data-qa-locator="product-item"]',
                        timeout=25000,
                    )
                except PlaywrightTimeoutError:
                    print(f"No Lazada product card found on page {page_number}", file=sys.stderr)

                # Cu?n xu?ng ?? Lazada lazy-load ?nh s?n ph?m ph?a d??i
                for _ in range(8):
                    page.mouse.wheel(0, 900)
                    page.wait_for_timeout(600)

                page.wait_for_timeout(2000)

                html = page.content()
                page.close()

                products = parse_products(html, keyword, page_number)
                print(f"Parsed {len(products)} Lazada products on page {page_number}", file=sys.stderr)

                all_products.extend(products)
        finally:
            context.close()
            browser.close()

    # Lo?i b? s?n ph?m tr?ng theo link g?c gi?a c?c trang
    unique_products = []
    seen_links = set()

    for product in all_products:
        link = product.get("linkGoc")

        if not link or link in seen_links:
            continue

        seen_links.add(link)
        unique_products.append(product)

    print(
        f"Deduplicated Lazada products: {len(all_products)} -> {len(unique_products)}",
        file=sys.stderr,
    )

    return unique_products


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--keyword", default="iphone 15")
    parser.add_argument("--max-pages", type=int, default=1)
    parser.add_argument("--headless", default="false")

    args = parser.parse_args()

    headless = str(args.headless).lower() in ("1", "true", "yes")
    products = crawl_lazada(args.keyword, args.max_pages, headless)

    sys.stdout.buffer.write(json.dumps(products, ensure_ascii=False).encode("utf-8"))


if __name__ == "__main__":
    main()
