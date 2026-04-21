import re
import math


def compute_stats(content: str) -> dict:
    if not content.strip():
        return {"word_count": 0, "char_count": 0, "reading_time_min": 0}

    cleaned = re.sub(r"^#{1,6}\s+", "", content, flags=re.MULTILINE)
    cleaned = re.sub(r"[*_~`>|[\]()!\-]", "", cleaned)
    cleaned = re.sub(r"\n+", " ", cleaned).strip()

    char_count = len(cleaned)

    cjk_chars = re.findall(r"[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]", cleaned)
    cjk_count = len(cjk_chars)

    non_cjk = re.sub(r"[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]", " ", cleaned).strip()
    latin_words = len([w for w in non_cjk.split() if w]) if non_cjk else 0

    word_count = cjk_count + latin_words
    reading_time_min = max(1, math.ceil(word_count / 350))

    return {
        "word_count": word_count,
        "char_count": char_count,
        "reading_time_min": reading_time_min,
    }
