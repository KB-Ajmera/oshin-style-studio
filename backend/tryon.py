"""Fashn.ai virtual try-on service.

Uses tryon-v1.6 for on-model garment photos (Oshin's catalog).
Preprocesses images for optimal quality per Fashn.ai guidelines:
- JPEG format, quality 95
- Max 2000px on longest edge
- LANCZOS downsampling
- Maintains aspect ratio
"""

import asyncio
import base64
import io
import httpx
from PIL import Image
from config import FASHN_API_KEY, FASHN_API_URL, FASHN_STATUS_URL

# Register HEIC/HEIF support
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass


def crop_garment_by_category(image_bytes: bytes, category: str) -> bytes:
    """Crop garment image based on category so only the relevant portion is sent.

    tops → upper 55% of image
    bottoms → lower 65% of image
    one-pieces/sets → full image
    """
    if category not in ("tops", "bottoms"):
        return image_bytes

    try:
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode in ("RGBA", "P", "LA"):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            bg.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
            img = bg
        elif img.mode != "RGB":
            img = img.convert("RGB")

        w, h = img.size

        if category == "tops":
            # Keep upper 55%
            crop_h = int(h * 0.55)
            img = img.crop((0, 0, w, crop_h))
        elif category == "bottoms":
            # Keep lower 65%
            crop_top = int(h * 0.35)
            img = img.crop((0, crop_top, w, h))

        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=95)
        return buffer.getvalue()
    except Exception:
        return image_bytes


def preprocess_image(image_bytes: bytes, max_edge: int = 2000, quality: int = 95) -> str:
    """Preprocess image per Fashn.ai best practices.

    - Handles all formats (JPEG, PNG, WebP, HEIC, etc.)
    - Resize to max 2000px longest edge (LANCZOS)
    - Convert to JPEG at quality 95
    - Return as base64 data URI
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
    except Exception:
        # If PIL can't open it, send raw bytes as JPEG base64
        b64 = base64.b64encode(image_bytes).decode()
        return f"data:image/jpeg;base64,{b64}"

    # Convert to RGB if needed (handle RGBA/PNG)
    if img.mode in ("RGBA", "P", "LA"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        bg.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Resize if too large, maintaining aspect ratio
    w, h = img.size
    longest = max(w, h)
    if longest > max_edge:
        scale = max_edge / longest
        new_w = int(w * scale)
        new_h = int(h * scale)
        img = img.resize((new_w, new_h), Image.LANCZOS)

    # Encode to JPEG at quality 95
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=quality, optimize=True)
    b64 = base64.b64encode(buffer.getvalue()).decode()

    return f"data:image/jpeg;base64,{b64}"


async def start_tryon(
    model_image_b64: str,
    garment_image_url: str,
    category: str = "auto",
    mode: str = "quality",
    garment_photo_type: str = "model",
) -> dict:
    """Start a virtual try-on using Fashn.ai tryon-v1.6.

    Uses v1.6 with garment_photo_type="model" for on-model garment images.
    This properly extracts the garment and preserves the person's identity.
    """
    headers = {
        "Authorization": f"Bearer {FASHN_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model_name": "tryon-max",
        "inputs": {
            "model_image": model_image_b64,
            "product_image": garment_image_url,
        },
        "resolution": "2k",
        "generation_mode": "quality",
        "num_images": 1,
        "output_format": "png",
    }
    print(f"[TryOn] tryon-max 2K | category={category}")

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(FASHN_API_URL, json=payload, headers=headers)

        if resp.status_code != 200:
            return {"error": f"Fashn API error: {resp.status_code} — {resp.text}"}

        data = resp.json()
        return {"id": data.get("id"), "status": "processing"}


async def poll_tryon(prediction_id: str, max_attempts: int = 60, interval: float = 2.0) -> dict:
    """Poll Fashn.ai for try-on result until completed or failed."""
    headers = {
        "Authorization": f"Bearer {FASHN_API_KEY}",
    }

    url = f"{FASHN_STATUS_URL}/{prediction_id}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        for _ in range(max_attempts):
            resp = await client.get(url, headers=headers)

            if resp.status_code != 200:
                return {"error": f"Status check failed: {resp.status_code}"}

            data = resp.json()
            status = data.get("status", "")

            if status == "completed":
                return {
                    "status": "completed",
                    "output": data.get("output", []),
                }
            elif status in ("failed", "canceled"):
                raw_error = data.get("error")
                if isinstance(raw_error, dict):
                    error_str = raw_error.get("message") or raw_error.get("name") or str(raw_error)
                else:
                    error_str = str(raw_error) if raw_error else "Try-on failed"
                return {
                    "status": status,
                    "error": error_str,
                }

            await asyncio.sleep(interval)

    return {"error": "Timed out waiting for try-on result"}


async def check_status(prediction_id: str) -> dict:
    """Single status check for client-side polling."""
    headers = {
        "Authorization": f"Bearer {FASHN_API_KEY}",
    }

    url = f"{FASHN_STATUS_URL}/{prediction_id}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, headers=headers)

        if resp.status_code != 200:
            return {"error": f"Status check failed: {resp.status_code}"}

        data = resp.json()

        raw_error = data.get("error")
        if isinstance(raw_error, dict):
            error_str = raw_error.get("message") or raw_error.get("name") or str(raw_error)
        elif raw_error:
            error_str = str(raw_error)
        else:
            error_str = None

        return {
            "status": data.get("status", "unknown"),
            "output": data.get("output"),
            "error": error_str,
        }
