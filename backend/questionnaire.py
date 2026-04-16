"""Style questionnaire — Oshin Style Studio.
Questions sourced from style-questionnaire.jsx.
"""

QUESTIONNAIRE = {
    "steps": [
        # ═══ SECTION 1: ABOUT YOU ════════════════════════════
        {
            "id": "height",
            "section": "About You",
            "section_intro": "Help us understand your shape and proportions",
            "title": "How tall are you?",
            "subtitle": "We'll factor proportions into our suggestions",
            "type": "single",
            "options": [
                {"value": "petite", "label": "Under 5'3\"", "desc": "Petite"},
                {"value": "average", "label": "5'3\" – 5'7\"", "desc": "Average"},
                {"value": "tall", "label": "5'7\" – 5'10\"", "desc": "Tall"},
                {"value": "very-tall", "label": "Over 5'10\"", "desc": "Very tall"},
            ],
        },
        {
            "id": "body_shape",
            "title": "Which describes your body shape?",
            "subtitle": "It's okay if none feel exact — pick the closest",
            "type": "single",
            "options": [
                {"value": "pear", "label": "Pear", "desc": "Hips wider than shoulders"},
                {"value": "hourglass", "label": "Hourglass", "desc": "Defined waist, balanced shoulders/hips"},
                {"value": "rectangle", "label": "Rectangle", "desc": "Shoulders, waist, hips fairly aligned"},
                {"value": "apple", "label": "Apple", "desc": "Fuller through midsection"},
                {"value": "inverted-triangle", "label": "Inverted Triangle", "desc": "Shoulders wider than hips"},
                {"value": "unsure", "label": "Not sure", "desc": "Let our AI suggest broadly"},
            ],
        },
        {
            "id": "size_range",
            "title": "What size do you usually wear?",
            "subtitle": "Oshin uses degendered sizing (XS – XXL)",
            "type": "single",
            "options": [
                {"value": "XS", "label": "XS"},
                {"value": "S", "label": "S"},
                {"value": "M", "label": "M"},
                {"value": "L", "label": "L"},
                {"value": "XL", "label": "XL"},
                {"value": "XXL", "label": "XXL"},
            ],
        },
        # ═══ SECTION 2: THE OCCASION ═════════════════════════
        {
            "id": "primary_occasion",
            "section": "The Occasion",
            "section_intro": "Tell us where you're headed",
            "title": "What are you shopping for today?",
            "subtitle": "Pick the most important one",
            "type": "single",
            "options": [
                {"value": "everyday", "label": "Everyday wear"},
                {"value": "work", "label": "Work / Office"},
                {"value": "evening", "label": "Evening out"},
                {"value": "wedding", "label": "Wedding / Festive event"},
                {"value": "vacation", "label": "Vacation / Holiday"},
                {"value": "exploring", "label": "Just exploring"},
            ],
        },
        {
            "id": "weather",
            "title": "What's the weather where you'll wear it?",
            "subtitle": "",
            "type": "single",
            "options": [
                {"value": "summer", "label": "Hot summer"},
                {"value": "monsoon", "label": "Humid / Monsoon"},
                {"value": "transition", "label": "Mild / Transitional"},
                {"value": "cool", "label": "Cool / Indoor AC"},
            ],
        },
        # ═══ SECTION 3: YOUR STYLE ═══════════════════════════
        {
            "id": "vibes",
            "section": "Your Style",
            "section_intro": "Get specific about what you love",
            "title": "Which vibes describe how you like to dress?",
            "subtitle": "Pick up to 3",
            "type": "multi",
            "max": 3,
            "options": [
                {"value": "minimal", "label": "Minimal & Clean", "desc": "Simple lines, neutral palette"},
                {"value": "bold", "label": "Bold & Expressive", "desc": "Statement pieces, conversation-starters"},
                {"value": "classic", "label": "Classic Elegance", "desc": "Timeless, polished, refined"},
                {"value": "bohemian", "label": "Bohemian", "desc": "Flowy, layered, free-spirited"},
                {"value": "street-luxe", "label": "Street-luxe", "desc": "Modern, edgy, urban"},
                {"value": "romantic", "label": "Romantic", "desc": "Soft, feminine, dreamy"},
            ],
        },
        {
            "id": "silhouette",
            "title": "Which silhouette do you feel most yourself in?",
            "subtitle": "",
            "type": "single",
            "options": [
                {"value": "relaxed", "label": "Relaxed & Oversized", "desc": "Roomy, comfortable, drapey"},
                {"value": "tailored", "label": "Tailored & Structured", "desc": "Sharp lines, defined cuts"},
                {"value": "flowy", "label": "Flowy & Draped", "desc": "Movement, soft volume"},
                {"value": "fitted", "label": "Body-conscious", "desc": "Close to the body, defined"},
                {"value": "mixed", "label": "I mix it up", "desc": "Depends on the day"},
            ],
        },
        # ═══ SECTION 4: COLOR & FABRIC ═══════════════════════
        {
            "id": "color_love",
            "section": "Palette",
            "section_intro": "Colors and fabrics that work for you",
            "title": "Which palettes do you gravitate to?",
            "subtitle": "Pick all that apply",
            "type": "multi",
            "options": [
                {"value": "neutrals", "label": "Neutrals & Earth", "desc": "Beige, cream, charcoal, sage"},
                {"value": "jewel", "label": "Jewel Tones", "desc": "Emerald, sapphire, ruby, teal"},
                {"value": "pastels", "label": "Pastels", "desc": "Blush, butter, mint, lavender"},
                {"value": "monochrome", "label": "Monochrome", "desc": "Black, white, grey"},
                {"value": "bright", "label": "Bright & Vivid", "desc": "Marigold, coral, electric blue"},
            ],
        },
        {
            "id": "color_avoid",
            "title": "Any colors you actively avoid?",
            "subtitle": "Optional — helps us filter out misses",
            "type": "multi",
            "optional": True,
            "options": [
                {"value": "yellow", "label": "Yellows"},
                {"value": "pink", "label": "Pinks"},
                {"value": "red", "label": "Reds"},
                {"value": "green", "label": "Greens"},
                {"value": "white", "label": "Whites"},
                {"value": "black", "label": "Blacks"},
                {"value": "none", "label": "None — open to all"},
            ],
        },
        {
            "id": "fabric_pref",
            "title": "Fabrics you enjoy wearing",
            "subtitle": "Oshin works mainly in denim, cotton, and linen",
            "type": "multi",
            "options": [
                {"value": "denim", "label": "Denim"},
                {"value": "cotton", "label": "Cotton & Linen"},
                {"value": "silk", "label": "Silk & Satin"},
                {"value": "knit", "label": "Knits"},
                {"value": "structured", "label": "Structured / Crisp"},
                {"value": "soft", "label": "Soft & Drapey"},
            ],
        },
        # ═══ SECTION 5: SHOPPING SIGNALS ═════════════════════
        {
            "id": "struggle",
            "section": "Shopping Signals",
            "section_intro": "What you usually love or struggle with",
            "title": "What do you find hardest when shopping?",
            "subtitle": "We'll be extra mindful of this",
            "type": "single",
            "options": [
                {"value": "fit", "label": "Finding the right fit"},
                {"value": "occasion", "label": "Knowing what works for the occasion"},
                {"value": "style-jump", "label": "Trying styles outside my comfort zone"},
                {"value": "color", "label": "Picking colors that suit me"},
                {"value": "investment", "label": "Justifying spending on statement pieces"},
                {"value": "nothing", "label": "Honestly, nothing — I love shopping"},
            ],
        },
        {
            "id": "budget",
            "title": "What's your budget per piece?",
            "subtitle": "",
            "type": "single",
            "options": [
                {"value": "under-5k", "label": "Under Rs.5,000"},
                {"value": "5k-10k", "label": "Rs.5,000 - Rs.10,000"},
                {"value": "10k-15k", "label": "Rs.10,000 - Rs.15,000"},
                {"value": "15k-plus", "label": "Rs.15,000+"},
                {"value": "no-limit", "label": "Show me everything"},
            ],
        },
        # ═══ SECTION 6: OPTIONAL CONTEXT ═════════════════════
        {
            "id": "inspiration",
            "section": "One Last Thing",
            "section_intro": "Optional — but helpful for nuance",
            "title": "Anyone whose style you love?",
            "subtitle": "A celebrity, friend, or icon — totally optional",
            "type": "text",
            "optional": True,
            "placeholder": "e.g. Alia Bhatt's off-duty looks, Phoebe Philo era Celine...",
        },
        {
            "id": "additional",
            "title": "Anything else we should know?",
            "subtitle": "A specific event, a body feature you'd like to highlight or downplay, anything",
            "type": "text",
            "optional": True,
            "placeholder": "Optional — write freely",
        },
    ]
}


# ─── Budget ranges for filtering ─────────────────────────────────
BUDGET_RANGES = {
    "under-5k": (0, 5000),
    "5k-10k": (5000, 10000),
    "10k-15k": (10000, 15000),
    "15k-plus": (15000, 999999),
    "no-limit": (0, 999999),
}

# ─── Map occasion values to product occasion tags ────────────────
OCCASION_MAP = {
    "everyday": ["casual", "everyday"],
    "work": ["work", "office"],
    "evening": ["evening", "party"],
    "wedding": ["wedding", "festive"],
    "vacation": ["vacation", "holiday"],
    "exploring": [],  # match everything
}

# ─── Map vibes to product style_vibe ─────────────────────────────
VIBE_MAP = {
    "minimal": ["minimal", "minimalist", "clean"],
    "bold": ["bold", "statement", "expressive"],
    "classic": ["classic", "elegant", "timeless"],
    "bohemian": ["bohemian", "boho", "flowy"],
    "street-luxe": ["street-luxe", "urban", "edgy"],
    "romantic": ["romantic", "soft", "feminine"],
}

# ─── Map color_love to product color_family ──────────────────────
COLOR_MAP = {
    "neutrals": ["neutrals", "earth", "beige", "cream", "sage"],
    "jewel": ["jewel", "emerald", "sapphire", "ruby", "teal"],
    "pastels": ["pastels", "pastel", "blush", "butter", "mint", "lavender"],
    "monochrome": ["monochrome", "black", "white", "grey"],
    "bright": ["bright", "vivid", "electric", "coral"],
}

# ─── Map fabric_pref to product fabric keywords ──────────────────
FABRIC_MAP = {
    "denim": ["denim"],
    "cotton": ["cotton", "linen"],
    "silk": ["silk", "satin"],
    "knit": ["knit", "jersey"],
    "structured": ["structured", "crisp", "twill"],
    "soft": ["soft", "drapey", "viscose"],
}


def score_outfit(outfit: dict, preferences: dict) -> float:
    """Score an outfit against the full Oshin questionnaire answers."""
    score = 0.0

    # ── Occasion match (weight: 5) ──
    pref_occasion = preferences.get("primary_occasion", "")
    if pref_occasion and pref_occasion != "exploring":
        occasion_keywords = OCCASION_MAP.get(pref_occasion, [])
        product_occasions = [o.strip().lower() for o in outfit.get("occasion", "").split(",") if o.strip()]
        for kw in occasion_keywords:
            if any(kw in po for po in product_occasions):
                score += 5
                break

    # ── Style vibe match (weight: 4) ──
    pref_vibes = preferences.get("vibes", [])
    product_vibe = outfit.get("style_vibe", "").strip().lower()
    if pref_vibes and product_vibe:
        for vibe in pref_vibes:
            vibe_keywords = VIBE_MAP.get(vibe, [])
            if any(kw in product_vibe for kw in vibe_keywords):
                score += 4
                break

    # ── Color palette match (weight: 3) ──
    pref_colors = preferences.get("color_love", [])
    product_color_family = outfit.get("color_family", "").strip().lower()
    product_color = outfit.get("color", "").strip().lower()
    if pref_colors:
        for color_pref in pref_colors:
            color_keywords = COLOR_MAP.get(color_pref, [])
            if any(kw in product_color_family or kw in product_color for kw in color_keywords):
                score += 3
                break

    # ── Color avoid penalty (weight: -3) ──
    avoid_colors = preferences.get("color_avoid", [])
    if avoid_colors and "none" not in avoid_colors:
        product_color_lower = product_color
        for avoid in avoid_colors:
            if avoid in product_color_lower:
                score -= 3
                break

    # ── Silhouette match (weight: 3) ──
    pref_silhouette = preferences.get("silhouette", "")
    product_silhouette = outfit.get("silhouette", "").strip().lower()
    if pref_silhouette and pref_silhouette != "mixed" and product_silhouette:
        if pref_silhouette in product_silhouette:
            score += 3

    # ── Body shape match (weight: 4) ──
    pref_body = preferences.get("body_shape", "")
    product_body_types = outfit.get("body_types", "").lower()
    if pref_body and pref_body != "unsure" and product_body_types:
        # Normalize
        normalized_pref = pref_body.replace("-", " ").replace("_", " ")
        normalized_product = product_body_types.replace("_", " ")
        if normalized_pref in normalized_product:
            score += 4

    # ── Fabric match (weight: 2) ──
    pref_fabrics = preferences.get("fabric_pref", [])
    product_fabric = outfit.get("fabric", "").lower()
    if pref_fabrics and product_fabric:
        for fab in pref_fabrics:
            fab_keywords = FABRIC_MAP.get(fab, [])
            if any(kw in product_fabric for kw in fab_keywords):
                score += 2
                break

    # ── Budget filter (weight: 0 or -10) ──
    pref_budget = preferences.get("budget", "no-limit")
    budget_range = BUDGET_RANGES.get(pref_budget, (0, 999999))
    mrp = outfit.get("mrp", 0)
    if mrp < budget_range[0] or mrp > budget_range[1]:
        score -= 10  # Heavy penalty for out of budget

    # ── Exploring bonus — if "just exploring", give base score to everything ──
    if pref_occasion == "exploring":
        score += 2

    return score


def _category_match_score(outfit: dict, preferences: dict) -> float:
    """Soft scoring based on product name + category for products without metadata."""
    score = 0.0
    name = outfit.get("name", "").lower()
    category = outfit.get("category", "").lower()
    sub_cat = outfit.get("sub_category", "").lower()

    # Match by occasion keywords in product name
    pref_occasion = preferences.get("primary_occasion", "")
    occasion_keywords = {
        "everyday": ["casual", "tee", "t-shirt", "basic", "everyday"],
        "work": ["shirt", "blazer", "trouser", "formal"],
        "evening": ["dress", "gown", "cocktail", "party"],
        "wedding": ["gown", "sari", "bridal", "ethnic"],
        "vacation": ["dress", "shorts", "linen", "summer"],
    }
    if pref_occasion and pref_occasion != "exploring":
        for kw in occasion_keywords.get(pref_occasion, []):
            if kw in name or kw in sub_cat:
                score += 2
                break

    # Match by category preference
    pref_vibes = preferences.get("vibes", [])
    vibe_keywords = {
        "minimal": ["basic", "plain", "simple", "classic"],
        "bold": ["statement", "print", "bright", "bold"],
        "classic": ["classic", "timeless", "traditional"],
        "bohemian": ["flowy", "boho", "relaxed", "draped"],
        "street-luxe": ["oversized", "relaxed", "denim", "jacket"],
        "romantic": ["floral", "lace", "dress", "soft"],
    }
    for vibe in pref_vibes:
        for kw in vibe_keywords.get(vibe, []):
            if kw in name:
                score += 1
                break

    # Color matching from product name
    pref_colors = preferences.get("color_love", [])
    color_keywords = {
        "monochrome": ["black", "white", "grey"],
        "neutrals": ["beige", "cream", "sand", "natural", "khaki"],
        "jewel": ["emerald", "sapphire", "ruby", "teal", "burgundy"],
        "pastels": ["pink", "blush", "mint", "lavender"],
        "bright": ["red", "yellow", "orange", "electric", "coral"],
    }
    for cp in pref_colors:
        for kw in color_keywords.get(cp, []):
            if kw in name:
                score += 1
                break

    # Budget filter
    pref_budget = preferences.get("budget", "no-limit")
    budget_range = BUDGET_RANGES.get(pref_budget, (0, 999999))
    mrp = outfit.get("mrp", 0)
    if mrp < budget_range[0] or mrp > budget_range[1]:
        score -= 5

    return score


def get_recommendations(all_outfits: list[dict], preferences: dict, limit: int = 24) -> list[dict]:
    """Return outfits ranked by match score. Includes all products with soft scoring."""
    scored = []
    for outfit in all_outfits:
        # Full metadata scoring (for linesheet products with rich data)
        s = score_outfit(outfit, preferences)

        # If product lacks metadata (mostly empty tags), use soft category/name scoring
        has_metadata = bool(
            outfit.get("occasion", "").strip()
            or outfit.get("style_vibe", "").strip()
            or outfit.get("body_types", "").strip()
        )

        if not has_metadata:
            s = _category_match_score(outfit, preferences) + 1  # Base boost so they appear

        # Include all products (not just > 0) — sort by score
        if s >= 0:
            pct = min(round((max(s, 0) / 21) * 100), 99) if s > 0 else 0
            scored.append({**outfit, "match_score": s, "match_pct": pct})

    scored.sort(key=lambda x: (-x["match_score"], x["name"]))
    return scored[:limit]
