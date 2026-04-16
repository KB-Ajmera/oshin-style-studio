"""Migrate products from JSON catalogs into Supabase."""

import os
import sys
import json
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from db import db_cursor

BASE = os.path.join(os.path.dirname(__file__), "..", "data")

FASHN_CATEGORY_MAP = {
    "tops": "tops",
    "bottoms": "bottoms",
    "one-pieces": "one-pieces",
    "sets": "one-pieces",
    "auto": "auto",
}


def migrate():
    with open(os.path.join(BASE, "catalog.json")) as f:
        linesheet = json.load(f)
    with open(os.path.join(BASE, "shopify_catalog.json")) as f:
        shopify = json.load(f)

    # Deduplicate by SKU (linesheet takes priority)
    linesheet_skus = set(p["sku"] for p in linesheet)
    all_products = list(linesheet)
    for p in shopify:
        if p["sku"] not in linesheet_skus:
            all_products.append(p)

    print(f"Total products to insert: {len(all_products)}")

    with db_cursor() as cur:
        # Clear existing
        cur.execute("DELETE FROM products")

        inserted = 0
        for p in all_products:
            sku = p["sku"]
            name = p["name"]
            mrp = float(p.get("mrp", 0))
            category = p.get("category", "tops")
            fashn_cat = FASHN_CATEGORY_MAP.get(category, "auto")

            display_url = p.get("display_url", "") or p.get("shopify_image_url", "")
            clean_url = p.get("clean_url", "")
            has_clean = bool(clean_url)

            dataset = "oshin" if p in linesheet else "shopify"

            if not display_url:
                continue

            cur.execute("""
                INSERT INTO products (
                    sku, name, mrp, color, fabric, description,
                    category, sub_category, occasion, style_vibe,
                    color_family, silhouette, body_types, fit_note,
                    pairs_with, styling_note, season, fashn_category,
                    dataset, image_url, clean_image_url, has_clean, shopify_handle
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (sku) DO UPDATE SET
                    name = EXCLUDED.name,
                    image_url = EXCLUDED.image_url,
                    clean_image_url = EXCLUDED.clean_image_url,
                    has_clean = EXCLUDED.has_clean
            """, (
                sku, name, mrp,
                p.get("color", ""), p.get("fabric", ""), p.get("description", ""),
                category, p.get("sub_category", ""), p.get("occasion", ""),
                p.get("style_vibe", ""), p.get("color_family", ""),
                p.get("silhouette", ""), p.get("body_types", ""),
                p.get("fit_note", ""), p.get("pairs_with", ""),
                p.get("styling_note", ""), p.get("season", ""),
                fashn_cat, dataset, display_url, clean_url, has_clean,
                p.get("shopify_handle", ""),
            ))
            inserted += 1

        cur.execute("SELECT category, COUNT(*) FROM products GROUP BY category ORDER BY category")
        counts = cur.fetchall()

    print(f"\nInserted {inserted} products")
    print("By category:")
    for row in counts:
        print(f"  {row['category']}: {row['count']}")


if __name__ == "__main__":
    migrate()
