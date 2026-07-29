from django.db import migrations


CATEGORIES = [
    # ── Physical ────────────────────────────────────────────────────────────────
    {"name": "T-Shirts & Tops",       "slug": "t-shirts-tops",       "icon": "👕", "product_type": "physical", "order": 1},
    {"name": "Jerseys & Sportswear",  "slug": "jerseys-sportswear",  "icon": "⚽", "product_type": "physical", "order": 2},
    {"name": "Hoodies & Jackets",     "slug": "hoodies-jackets",     "icon": "🧥", "product_type": "physical", "order": 3},
    {"name": "Caps & Hats",           "slug": "caps-hats",           "icon": "🧢", "product_type": "physical", "order": 4},
    {"name": "Accessories",           "slug": "accessories",         "icon": "💎", "product_type": "physical", "order": 5},
    {"name": "Custom Prints",         "slug": "custom-prints",       "icon": "🎨", "product_type": "physical", "order": 6},
    {"name": "Bags & Backpacks",      "slug": "bags-backpacks",      "icon": "🎒", "product_type": "physical", "order": 7},
    {"name": "Shoes & Sneakers",      "slug": "shoes-sneakers",      "icon": "👟", "product_type": "physical", "order": 8},
    {"name": "Stickers & Posters",    "slug": "stickers-posters",    "icon": "🗂️", "product_type": "physical", "order": 9},
    {"name": "Home & Living",         "slug": "home-living",         "icon": "🏠", "product_type": "physical", "order": 10},

    # ── Digital ─────────────────────────────────────────────────────────────────
    {"name": "Beats & Instrumentals", "slug": "beats-instrumentals", "icon": "🎹", "product_type": "digital", "order": 1},
    {"name": "DJ Mixes",              "slug": "dj-mixes",            "icon": "🎧", "product_type": "digital", "order": 2},
    {"name": "Sample Packs",          "slug": "sample-packs",        "icon": "🎛️", "product_type": "digital", "order": 3},
    {"name": "Presets & Plugins",     "slug": "presets-plugins",     "icon": "🔧", "product_type": "digital", "order": 4},
    {"name": "E-Books & Guides",      "slug": "ebooks-guides",       "icon": "📖", "product_type": "digital", "order": 5},
    {"name": "Photography & Art",     "slug": "photography-art",     "icon": "📸", "product_type": "digital", "order": 6},
    {"name": "Video Content",         "slug": "video-content",       "icon": "🎬", "product_type": "digital", "order": 7},
    {"name": "Podcasts",              "slug": "podcasts",            "icon": "🎙️", "product_type": "digital", "order": 8},
    {"name": "Graphic Design Assets", "slug": "graphic-design",      "icon": "✏️", "product_type": "digital", "order": 9},
    {"name": "Courses & Tutorials",   "slug": "courses-tutorials",   "icon": "🎓", "product_type": "digital", "order": 10},

    # ── Ticket ──────────────────────────────────────────────────────────────────
    {"name": "Concerts & Live Music", "slug": "concerts-live-music", "icon": "🎤", "product_type": "ticket", "order": 1},
    {"name": "Festival Passes",       "slug": "festival-passes",     "icon": "🎪", "product_type": "ticket", "order": 2},
    {"name": "Club Nights",           "slug": "club-nights",         "icon": "🎉", "product_type": "ticket", "order": 3},
    {"name": "Comedy Shows",          "slug": "comedy-shows",        "icon": "😂", "product_type": "ticket", "order": 4},
    {"name": "Sports Events",         "slug": "sports-events",       "icon": "🏟️", "product_type": "ticket", "order": 5},
    {"name": "Workshops & Classes",   "slug": "workshops-classes",   "icon": "📚", "product_type": "ticket", "order": 6},
    {"name": "Art Exhibitions",       "slug": "art-exhibitions",     "icon": "🖼️", "product_type": "ticket", "order": 7},
    {"name": "Food & Lifestyle",      "slug": "food-lifestyle",      "icon": "🍽️", "product_type": "ticket", "order": 8},
]


def seed_categories(apps, schema_editor):
    Category = apps.get_model("products", "Category")
    for cat in CATEGORIES:
        Category.objects.get_or_create(slug=cat["slug"], defaults=cat)


def unseed_categories(apps, schema_editor):
    Category = apps.get_model("products", "Category")
    slugs = [c["slug"] for c in CATEGORIES]
    Category.objects.filter(slug__in=slugs).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("products", "0004_category_product_type"),
    ]

    operations = [
        migrations.RunPython(seed_categories, unseed_categories),
    ]
