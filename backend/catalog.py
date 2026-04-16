"""Outfit catalog — loads from Supabase."""

from db import db_cursor

_catalog: list[dict] = []
_categories: list[str] = []


def init_catalog():
    global _catalog, _categories

    try:
        with db_cursor() as cur:
            cur.execute("""
                SELECT sku, name, mrp, color, fabric, description,
                       category, sub_category, occasion, style_vibe,
                       color_family, silhouette, body_types, fit_note,
                       pairs_with, styling_note, season, fashn_category,
                       dataset, image_url, clean_image_url, has_clean, shopify_handle
                FROM products
                ORDER BY dataset, name
            """)
            rows = cur.fetchall()

        _catalog = []
        for r in rows:
            _catalog.append({
                "id": r["sku"],
                "sku": r["sku"],
                "name": r["name"],
                "mrp": float(r["mrp"]),
                "color": r["color"],
                "fabric": r["fabric"],
                "description": r["description"],
                "category": r["category"],
                "sub_category": r["sub_category"],
                "occasion": r["occasion"],
                "style_vibe": r["style_vibe"],
                "color_family": r["color_family"],
                "silhouette": r["silhouette"],
                "body_types": r["body_types"],
                "fit_note": r["fit_note"],
                "pairs_with": r["pairs_with"],
                "styling_note": r["styling_note"],
                "season": r["season"],
                "fashn_category": r["fashn_category"],
                "dataset": r["dataset"],
                "image_url": r["image_url"],
                "clean_image_url": r["clean_image_url"],
                "has_clean": r["has_clean"],
                "shopify_handle": r["shopify_handle"],
            })

        _categories = sorted(set(item["category"] for item in _catalog))
        print(f"[Catalog] Loaded {len(_catalog)} products across {len(_categories)} categories from Supabase")
    except Exception as e:
        print(f"[Catalog] ERROR loading from Supabase: {e}")
        _catalog = []
        _categories = []


def get_all_outfits(category: str | None = None, page: int = 1, per_page: int = 24) -> dict:
    items = _catalog
    if category:
        items = [o for o in items if o["category"] == category]

    total = len(items)
    start = (page - 1) * per_page
    end = start + per_page

    return {
        "outfits": items[start:end],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max((total + per_page - 1) // per_page, 1),
    }


def get_outfit_by_id(outfit_id: str) -> dict | None:
    for item in _catalog:
        if item["id"] == outfit_id:
            return item
    return None


def get_categories() -> list[str]:
    return _categories


def get_catalog() -> list[dict]:
    return _catalog
