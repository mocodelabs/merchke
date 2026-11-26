"""
Vendors often type every size or colour into one variant ("S, M, XL" / "Black, Red").
Each variant is one buyable option with its own stock, so such entries are expanded into one
variant per size x colour combination, each getting the entered stock and price modifier.
"""
import re
from itertools import product as combinations

# Separators between options: comma, slash, semicolon or pipe. Not "and"/"&", which appear
# inside real names such as "Black & White".
_SPLIT = re.compile(r'\s*[,/;|]\s*')
# A leading field name the vendor typed into the field itself, e.g. "Color Black" or "Sizes: S".
_LABEL = re.compile(r'^\s*(?:sizes?|colou?rs?)\s*[:\-]?\s+', re.IGNORECASE)


def split_options(value, max_length):
    """'Color Black, Red, White' -> ['Black', 'Red', 'White']; '' -> ['']."""
    text = _LABEL.sub('', value or '')
    seen, options = set(), []
    for part in _SPLIT.split(text):
        part = part.strip()[:max_length]
        if part and part.lower() not in seen:
            seen.add(part.lower())
            options.append(part)
    return options or ['']


def expand_variant_data(data, size_max, color_max):
    """Yield one variant dict per size x colour combination in `data`."""
    sizes = split_options(data.get('size', ''), size_max)
    colors = split_options(data.get('color', ''), color_max)
    for size, color in combinations(sizes, colors):
        yield {**data, 'size': size, 'color': color}
