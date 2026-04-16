"""Virtual hairstyle and makeup try-on service.

Uses AILab Tools API (via RapidAPI) for hairstyle changes
and provides preset makeup looks that can be applied via image processing.
"""

import httpx
import base64
import os
from config import FASHN_API_KEY

# ─── Hairstyle presets ─────────────────────────────────────────────

HAIRSTYLES = [
    {"id": "long_straight", "name": "Long Straight", "category": "Long", "desc": "Sleek, flowing straight hair"},
    {"id": "long_wavy", "name": "Long Wavy", "category": "Long", "desc": "Soft, beachy waves"},
    {"id": "long_curly", "name": "Long Curly", "category": "Long", "desc": "Voluminous natural curls"},
    {"id": "medium_layered", "name": "Medium Layered", "category": "Medium", "desc": "Textured layers at shoulder length"},
    {"id": "medium_bob", "name": "Medium Bob", "category": "Medium", "desc": "Classic bob cut"},
    {"id": "medium_wavy", "name": "Medium Wavy", "category": "Medium", "desc": "Wavy mid-length style"},
    {"id": "short_pixie", "name": "Short Pixie", "category": "Short", "desc": "Bold, cropped pixie cut"},
    {"id": "short_bob", "name": "Short Bob", "category": "Short", "desc": "Sharp chin-length bob"},
    {"id": "short_curly", "name": "Short Curly", "category": "Short", "desc": "Bouncy short curls"},
    {"id": "updo_bun", "name": "Elegant Bun", "category": "Updo", "desc": "Classic pulled-back bun"},
    {"id": "updo_ponytail", "name": "High Ponytail", "category": "Updo", "desc": "Sleek high ponytail"},
    {"id": "braided", "name": "Braided", "category": "Updo", "desc": "Intricate braided style"},
]

HAIR_COLORS = [
    {"id": "natural_black", "name": "Natural Black", "color": "#1a1a1a"},
    {"id": "dark_brown", "name": "Dark Brown", "color": "#3b2314"},
    {"id": "light_brown", "name": "Light Brown", "color": "#8b6914"},
    {"id": "blonde", "name": "Blonde", "color": "#d4a76a"},
    {"id": "platinum", "name": "Platinum Blonde", "color": "#e8dcc8"},
    {"id": "red", "name": "Red / Auburn", "color": "#8b2500"},
    {"id": "burgundy", "name": "Burgundy", "color": "#6b1c3a"},
    {"id": "copper", "name": "Copper", "color": "#b87333"},
    {"id": "ash_grey", "name": "Ash Grey", "color": "#8e8e8e"},
    {"id": "pastel_pink", "name": "Pastel Pink", "color": "#f5a0b1"},
    {"id": "blue_black", "name": "Blue Black", "color": "#1c2331"},
]

# ─── Makeup presets ────────────────────────────────────────────────

MAKEUP_LOOKS = [
    {
        "id": "natural",
        "name": "Natural / No Makeup",
        "category": "Everyday",
        "desc": "Subtle enhancement, barely-there look",
        "tags": ["casual", "minimalist", "everyday"],
        "details": {
            "foundation": "Light coverage, skin-matching",
            "eyes": "Neutral tones, light mascara",
            "lips": "Nude / MLBB (My Lips But Better)",
            "blush": "Soft peach",
            "brows": "Naturally groomed",
        },
    },
    {
        "id": "everyday_glam",
        "name": "Everyday Glam",
        "category": "Everyday",
        "desc": "Polished daily look with a touch of glamour",
        "tags": ["casual", "date", "classic"],
        "details": {
            "foundation": "Medium coverage, dewy finish",
            "eyes": "Warm brown eyeshadow, winged liner",
            "lips": "Mauve or dusty rose",
            "blush": "Warm pink",
            "brows": "Defined and filled",
        },
    },
    {
        "id": "smokey_eye",
        "name": "Smokey Eye",
        "category": "Evening",
        "desc": "Classic smokey eye for dramatic evenings",
        "tags": ["party", "date", "glamorous"],
        "details": {
            "foundation": "Full coverage, matte finish",
            "eyes": "Dark smokey blend, heavy mascara",
            "lips": "Nude or deep berry",
            "blush": "Contoured cheeks",
            "brows": "Sharp, defined arches",
        },
    },
    {
        "id": "bold_red",
        "name": "Bold Red Lip",
        "category": "Evening",
        "desc": "Statement red lip with clean eye",
        "tags": ["party", "formal", "classic"],
        "details": {
            "foundation": "Flawless base, matte",
            "eyes": "Clean lid, volumizing mascara",
            "lips": "Classic red",
            "blush": "Subtle warm tone",
            "brows": "Polished and groomed",
        },
    },
    {
        "id": "dewy_glow",
        "name": "Dewy Glass Skin",
        "category": "Everyday",
        "desc": "K-beauty inspired luminous skin",
        "tags": ["casual", "trendy", "minimalist"],
        "details": {
            "foundation": "Sheer, luminous finish",
            "eyes": "Shimmer wash, no liner",
            "lips": "Gradient lip tint",
            "blush": "Cream blush on cheekbones",
            "brows": "Soft, feathered",
        },
    },
    {
        "id": "bridal_indian",
        "name": "Indian Bridal",
        "category": "Bridal",
        "desc": "Rich, traditional bridal makeup",
        "tags": ["wedding", "ethnic", "glamorous"],
        "details": {
            "foundation": "Full coverage, long-wear",
            "eyes": "Gold & burgundy eyeshadow, kajal, false lashes",
            "lips": "Deep red or maroon",
            "blush": "Deep rose with highlight",
            "brows": "Bold, arched",
            "extras": "Bindi, highlighting",
        },
    },
    {
        "id": "bridal_western",
        "name": "Western Bridal",
        "category": "Bridal",
        "desc": "Elegant, timeless bridal beauty",
        "tags": ["wedding", "classic", "romantic"],
        "details": {
            "foundation": "Airbrush finish, long-wear",
            "eyes": "Champagne shimmer, soft liner, lashes",
            "lips": "Soft pink or rose",
            "blush": "Peach with glow",
            "brows": "Soft, natural arch",
        },
    },
    {
        "id": "editorial",
        "name": "Editorial / Bold",
        "category": "Creative",
        "desc": "High-fashion, artistic makeup",
        "tags": ["party", "trendy", "glamorous"],
        "details": {
            "foundation": "Sculpted, matte",
            "eyes": "Graphic liner, color pop",
            "lips": "Unconventional color or ombre",
            "blush": "Sculpted contour",
            "brows": "Statement brows",
        },
    },
    {
        "id": "soft_romantic",
        "name": "Soft Romantic",
        "category": "Evening",
        "desc": "Feminine, dreamy makeup for dates",
        "tags": ["date", "romantic", "classic"],
        "details": {
            "foundation": "Satin finish",
            "eyes": "Pink/mauve shimmer, soft liner",
            "lips": "Berry or plum",
            "blush": "Rosy flush",
            "brows": "Soft and natural",
        },
    },
    {
        "id": "sporty_fresh",
        "name": "Sporty Fresh",
        "category": "Everyday",
        "desc": "Minimal, active lifestyle look",
        "tags": ["sports", "casual", "minimalist"],
        "details": {
            "foundation": "Tinted moisturizer / SPF",
            "eyes": "Clear brow gel, no shadow",
            "lips": "Lip balm / tinted",
            "blush": "Cream, natural flush",
            "brows": "Brushed up, natural",
        },
    },
]


def get_hairstyles():
    return {"hairstyles": HAIRSTYLES, "colors": HAIR_COLORS}


def get_makeup_looks(occasion: str | None = None):
    looks = MAKEUP_LOOKS
    if occasion:
        looks = [l for l in looks if occasion in l["tags"]]
    return {"looks": looks}


def get_recommended_looks(preferences: dict) -> dict:
    """Recommend hairstyles and makeup based on questionnaire answers."""
    occasions = preferences.get("occasion", [])
    styles = preferences.get("style", [])
    season = preferences.get("season", "")

    # Filter makeup looks by occasion/style overlap
    scored_looks = []
    for look in MAKEUP_LOOKS:
        score = 0
        for tag in look["tags"]:
            if tag in occasions:
                score += 2
            if tag in styles:
                score += 1
        scored_looks.append({**look, "relevance": score})

    scored_looks.sort(key=lambda x: -x["relevance"])

    # Recommend hairstyle categories based on occasion
    rec_hair_cats = set()
    if any(o in occasions for o in ["formal", "wedding"]):
        rec_hair_cats.update(["Updo", "Long"])
    if any(o in occasions for o in ["casual", "sports"]):
        rec_hair_cats.update(["Medium", "Short"])
    if any(o in occasions for o in ["party", "date"]):
        rec_hair_cats.update(["Long", "Medium"])
    if not rec_hair_cats:
        rec_hair_cats = {"Long", "Medium", "Short", "Updo"}

    rec_hairstyles = [h for h in HAIRSTYLES if h["category"] in rec_hair_cats]

    return {
        "recommended_makeup": scored_looks[:5],
        "recommended_hairstyles": rec_hairstyles,
        "recommended_hair_colors": HAIR_COLORS[:6],
    }
