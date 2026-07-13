import unicodedata

def normalize_search_text(text: str) -> str:
    text = text or ""
    text = text.lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(
        char for char in text
        if unicodedata.category(char) != "Mn"
    )
    text = text.replace("đ", "d")
    text = " ".join(text.split())

    return text
