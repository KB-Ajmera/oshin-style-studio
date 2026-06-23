"""Merge designer-styling metadata from the Oshin Excel sheet into shopify_catalog.json.

Reads the filled-in metadata workbook, normalizes the values (trim, collapse
whitespace, lowercase controlled-vocab fields, standardize multi-value
separators), and merges them into data/shopify_catalog.json keyed by SKU/handle.

Run from the repo root:  python backend/merge_metadata.py "Oshin-Shopify-Metadata-FILL-IN (2).xlsx"
Then push to Supabase with:  python backend/migrate_products.py
"""

import os
import re
import sys
import json
import shutil

import openpyxl

BASE = os.path.join(os.path.dirname(__file__), "..")
DATA = os.path.join(BASE, "data")
CATALOG = os.path.join(DATA, "shopify_catalog.json")

# Excel header -> JSON field
COLUMN_MAP = {
    "Sub-Category": "sub_category",
    "Occasion(s)*": "occasion",
    "Style Vibe*": "style_vibe",
    "Color Family*": "color_family",
    "Silhouette*": "silhouette",
    "Body Types it Flatters": "body_types",
    "Fit Note": "fit_note",
    "Pairs Well With (SKUs)": "pairs_with",
    "Oshin's Styling Note": "styling_note",
    "Bestseller?": "bestseller",
    "Season": "season",
    "Color": "color",
    "Fabric": "fabric",
}

# Fields that are a single controlled-vocabulary token -> lowercase
SINGLE_VOCAB = {"style_vibe", "color_family", "silhouette", "fit_note"}
# Fields that are comma-separated multi-value lists -> normalize separators
MULTI_VALUE = {"occasion", "body_types", "pairs_with"}
# Multi-value fields whose tokens are controlled vocab -> lowercase tokens
MULTI_LOWER = {"occasion", "body_types", "pairs_with"}

# Occasion plural/synonym/typo fixups so stragglers merge with the dominant token
OCCASION_SYNONYMS = {
    "evenings": "evening",
    "outings": "outing",
    "vacations": "vacation",
    "vacaction": "vacation",
    "dinners": "dinner",
    "weddings": "wedding",
    "work": "workwear",
}


def clean(s):
    if s is None:
        return ""
    return re.sub(r"\s+", " ", str(s).strip())


def normalize(field, value):
    v = clean(value)
    if not v:
        return ""
    if field in SINGLE_VOCAB:
        return v.lower()
    if field in MULTI_VALUE:
        tokens = []
        seen = set()
        for tok in re.split(r"[,/]+", v):
            tok = tok.strip()
            if not tok:
                continue
            if field in MULTI_LOWER:
                tok = tok.lower()
            if field == "occasion":
                tok = OCCASION_SYNONYMS.get(tok, tok)
            if tok not in seen:
                seen.add(tok)
                tokens.append(tok)
        return ", ".join(tokens)
    return v


def load_metadata(xlsx_path):
    wb = openpyxl.load_workbook(xlsx_path)
    ws = wb["Shopify Products"]
    rows = list(ws.iter_rows(values_only=True))
    header = rows[0]
    idx = {h: i for i, h in enumerate(header) if h}
    sku_col = idx["SKU / Handle"]

    meta = {}
    for r in rows[1:]:
        sku = clean(r[sku_col])
        if not sku:
            continue
        rec = {}
        for col, field in COLUMN_MAP.items():
            if col in idx:
                rec[field] = normalize(field, r[idx[col]])
        meta[sku] = rec
    return meta


def main():
    if len(sys.argv) < 2:
        print("usage: python backend/merge_metadata.py <metadata.xlsx>")
        sys.exit(1)
    xlsx_path = sys.argv[1]

    meta = load_metadata(xlsx_path)
    print(f"Loaded metadata for {len(meta)} SKUs from {os.path.basename(xlsx_path)}")

    with open(CATALOG) as f:
        catalog = json.load(f)

    # Backup before writing
    backup = CATALOG + ".bak"
    shutil.copy2(CATALOG, backup)
    print(f"Backed up catalog -> {os.path.basename(backup)}")

    matched = 0
    fields_written = 0
    unmatched_skus = []
    for p in catalog:
        sku = p.get("sku") or p.get("shopify_handle")
        rec = meta.get(sku)
        if not rec:
            unmatched_skus.append(sku)
            continue
        matched += 1
        for field, val in rec.items():
            if val:  # only overwrite when the sheet has a value
                p[field] = val
                fields_written += 1

    meta_skus = set(meta)
    catalog_skus = set(p.get("sku") for p in catalog)

    with open(CATALOG, "w") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)

    print(f"\nMatched {matched}/{len(catalog)} catalog products")
    print(f"Wrote {fields_written} non-empty metadata fields")
    if unmatched_skus:
        print(f"\n{len(unmatched_skus)} catalog products had NO metadata row:")
        for s in unmatched_skus:
            print(f"  - {s}")
    orphans = meta_skus - catalog_skus
    if orphans:
        print(f"\n{len(orphans)} sheet SKUs not found in catalog:")
        for s in sorted(orphans):
            print(f"  - {s}")

    # Coverage report on required fields
    print("\nCoverage after merge:")
    for field in ["occasion", "style_vibe", "color_family", "silhouette",
                  "body_types", "fit_note", "pairs_with", "sub_category"]:
        n = sum(1 for p in catalog if p.get(field))
        print(f"  {field:16} {n:3}/{len(catalog)}")


if __name__ == "__main__":
    main()
