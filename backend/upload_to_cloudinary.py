"""Upload all garment images to Cloudinary and build final catalog."""

import os
import sys
import json
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

import cloudinary
import cloudinary.uploader

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)

BASE = os.path.join(os.path.dirname(__file__), "..", "data")
LINESHEET_DIR = os.path.join(BASE, "linesheet_images")
LINESHEET_CLEAN_DIR = os.path.join(BASE, "linesheet_images_clean")
SHOPIFY_DIR = os.path.join(BASE, "shopify_all_images")
SHOPIFY_CLEAN_DIR = os.path.join(BASE, "shopify_all_clean")


def upload(filepath: str, public_id: str, folder: str) -> str | None:
    """Upload one image and return the secure URL."""
    try:
        result = cloudinary.uploader.upload(
            filepath,
            public_id=public_id,
            folder=folder,
            overwrite=False,
            resource_type="image",
            unique_filename=False,
        )
        return result["secure_url"]
    except Exception as e:
        # If already exists, fetch the URL
        if "already exists" in str(e).lower():
            try:
                url = cloudinary.utils.cloudinary_url(f"{folder}/{public_id}")[0]
                return url
            except:
                pass
        print(f"    UPLOAD ERROR: {public_id} — {str(e)[:100]}")
        return None


def main():
    # Load catalogs
    with open(os.path.join(BASE, "catalog.json")) as f:
        linesheet_catalog = json.load(f)
    with open(os.path.join(BASE, "shopify_catalog.json")) as f:
        shopify_catalog = json.load(f)

    linesheet_count = 0
    shopify_count = 0

    # ─── Upload linesheet images ───
    print(f"Uploading linesheet images...")
    for p in linesheet_catalog:
        sku = p["sku"]
        ls_img = p.get("linesheet_image", "")
        ls_clean = p.get("linesheet_clean", "")

        if ls_img:
            path = os.path.join(LINESHEET_DIR, ls_img)
            if os.path.isfile(path):
                url = upload(path, sku, "tryon/linesheet")
                if url:
                    p["display_url"] = url
                    linesheet_count += 1

        if ls_clean:
            path = os.path.join(LINESHEET_CLEAN_DIR, ls_clean)
            if os.path.isfile(path):
                url = upload(path, f"{sku}_clean", "tryon/linesheet_clean")
                if url:
                    p["clean_url"] = url

        if linesheet_count % 5 == 0 and linesheet_count > 0:
            print(f"  {linesheet_count} linesheet uploaded...")

    print(f"  Linesheet done: {linesheet_count}")

    # ─── Upload Shopify images ───
    print(f"\nUploading Shopify images...")
    for i, p in enumerate(shopify_catalog):
        sku = p["sku"]
        img_file = p.get("image_file", "")
        clean_file = p.get("local_clean", "")

        # Shopify originals are already on Shopify CDN — use those URLs directly
        if p.get("shopify_image_url"):
            p["display_url"] = p["shopify_image_url"]
            shopify_count += 1

        # Upload local clean images to Cloudinary
        if clean_file:
            path = os.path.join(SHOPIFY_CLEAN_DIR, clean_file)
            if os.path.isfile(path):
                url = upload(path, f"{sku}_clean", "tryon/shopify_clean")
                if url:
                    p["clean_url"] = url

        if (i+1) % 20 == 0:
            print(f"  {i+1}/{len(shopify_catalog)} processed...")

    print(f"  Shopify done: {shopify_count}")

    # Save updated catalogs
    with open(os.path.join(BASE, "catalog.json"), "w") as f:
        json.dump(linesheet_catalog, f, indent=2)
    with open(os.path.join(BASE, "shopify_catalog.json"), "w") as f:
        json.dump(shopify_catalog, f, indent=2)

    print(f"\nTotal images uploaded to Cloudinary")
    print(f"Linesheet: {linesheet_count}, Shopify: {shopify_count}")
    print(f"Catalogs updated with Cloudinary URLs")


if __name__ == "__main__":
    main()
