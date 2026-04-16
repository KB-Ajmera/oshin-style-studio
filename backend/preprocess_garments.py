"""Preprocess Oshin's garment images using Fashn.ai Background Remove.

Strips the model/background from on-model garment photos,
leaving clean transparent-background garment images for better try-on results.

Run once: python preprocess_garments.py
Cost: 1 credit per image (~22 credits total)
"""

import asyncio
import base64
import json
import os
import sys
import httpx

sys.path.insert(0, os.path.dirname(__file__))
from config import FASHN_API_KEY, FASHN_API_URL, FASHN_STATUS_URL

INPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "product_images_final")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "product_images_clean")
CATALOG_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "catalog.json")


async def remove_background(image_path: str) -> bytes | None:
    """Send image to Fashn.ai Background Remove and get clean PNG back."""
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    ext = os.path.splitext(image_path)[1].lower()
    mime = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}.get(ext, "image/jpeg")
    b64 = f"data:{mime};base64,{base64.b64encode(image_bytes).decode()}"

    headers = {
        "Authorization": f"Bearer {FASHN_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model_name": "background-remove",
        "inputs": {
            "image": b64,
        },
        "return_base64": True,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Submit
        resp = await client.post(FASHN_API_URL, json=payload, headers=headers)
        if resp.status_code != 200:
            print(f"    ERROR submitting: {resp.status_code} — {resp.text[:200]}")
            return None

        data = resp.json()
        pred_id = data.get("id")

        if not pred_id:
            # Might be completed immediately
            if data.get("status") == "completed" and data.get("output"):
                output = data["output"][0]
                if output.startswith("data:"):
                    b64_data = output.split(",", 1)[1]
                    return base64.b64decode(b64_data)

        # Poll for result
        for _ in range(30):
            await asyncio.sleep(1)
            status_resp = await client.get(
                f"{FASHN_STATUS_URL}/{pred_id}",
                headers={"Authorization": f"Bearer {FASHN_API_KEY}"},
            )
            if status_resp.status_code != 200:
                continue

            status_data = status_resp.json()
            status = status_data.get("status")

            if status == "completed":
                output = status_data.get("output", [])
                if output:
                    result = output[0]
                    if result.startswith("data:"):
                        b64_data = result.split(",", 1)[1]
                        return base64.b64decode(b64_data)
                    else:
                        # It's a URL, download it
                        img_resp = await client.get(result)
                        if img_resp.status_code == 200:
                            return img_resp.content
                return None
            elif status in ("failed", "canceled"):
                print(f"    FAILED: {status_data.get('error')}")
                return None

    print("    TIMEOUT")
    return None


async def main():
    if not FASHN_API_KEY:
        print("ERROR: Set FASHN_API_KEY in .env first")
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Load catalog to know which images to process
    with open(CATALOG_FILE) as f:
        catalog = json.load(f)

    products = [p for p in catalog if p.get("has_image")]
    print(f"Processing {len(products)} garment images...")
    print(f"Cost: ~{len(products)} credits\n")

    success = 0
    failed = 0

    for i, product in enumerate(products):
        filename = product["image_file"]
        input_path = os.path.join(INPUT_DIR, filename)
        output_filename = os.path.splitext(filename)[0] + "_clean.png"
        output_path = os.path.join(OUTPUT_DIR, output_filename)

        # Skip if already processed
        if os.path.isfile(output_path):
            print(f"  [{i+1}/{len(products)}] SKIP (already done): {filename}")
            success += 1
            continue

        if not os.path.isfile(input_path):
            print(f"  [{i+1}/{len(products)}] MISSING: {filename}")
            failed += 1
            continue

        print(f"  [{i+1}/{len(products)}] Processing: {product['name']} ({filename})...")

        result = await remove_background(input_path)
        if result:
            with open(output_path, "wb") as f:
                f.write(result)
            size_kb = len(result) // 1024
            print(f"    OK — saved {output_filename} ({size_kb}KB)")
            success += 1
        else:
            failed += 1

        # Small delay between requests
        await asyncio.sleep(0.5)

    print(f"\nDone! Success: {success}, Failed: {failed}")
    print(f"Clean images saved to: {OUTPUT_DIR}")

    # Update catalog.json with clean image filenames
    if success > 0:
        for product in catalog:
            if product.get("has_image"):
                clean_name = os.path.splitext(product["image_file"])[0] + "_clean.png"
                clean_path = os.path.join(OUTPUT_DIR, clean_name)
                if os.path.isfile(clean_path):
                    product["image_file_clean"] = clean_name

        with open(CATALOG_FILE, "w") as f:
            json.dump(catalog, f, indent=2)
        print("Updated catalog.json with clean image references")


if __name__ == "__main__":
    asyncio.run(main())
