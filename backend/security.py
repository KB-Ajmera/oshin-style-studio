"""Security middleware and validators."""

import time
from collections import defaultdict
from fastapi import HTTPException, UploadFile

# ─── Rate limiting (in-memory, per IP) ──────────────────
_request_log: dict[str, list[float]] = defaultdict(list)

RATE_LIMITS = {
    "tryon": (10, 600),      # 10 try-ons per 10 min per IP
    "default": (60, 60),     # 60 requests per minute per IP
}


def check_rate_limit(ip: str, endpoint_type: str = "default"):
    """Raise HTTPException if IP exceeds rate limit for this endpoint."""
    limit, window = RATE_LIMITS.get(endpoint_type, RATE_LIMITS["default"])
    now = time.time()

    # Clean old entries
    _request_log[ip] = [t for t in _request_log[ip] if now - t < window]

    if len(_request_log[ip]) >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Limit: {limit} per {window}s.",
        )

    _request_log[ip].append(now)


# ─── File upload validation ─────────────────────────────
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME = {
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "image/heic", "image/heif", "application/octet-stream"
}


async def validate_upload(file: UploadFile) -> bytes:
    """Validate uploaded file is an image and under size limit."""
    if file.content_type and file.content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. Allowed: JPEG, PNG, WebP, HEIC."
        )

    content = await file.read()

    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size: {MAX_UPLOAD_SIZE // (1024*1024)}MB."
        )

    if len(content) < 100:
        raise HTTPException(status_code=400, detail="File is too small or empty.")

    # Verify it's actually an image by checking magic bytes
    is_image = (
        content[:3] == b"\xff\xd8\xff" or  # JPEG
        content[:8] == b"\x89PNG\r\n\x1a\n" or  # PNG
        content[:4] == b"RIFF" or  # WebP
        content[4:12] == b"ftypheic" or content[4:12] == b"ftypheif" or  # HEIC
        content[4:8] == b"ftyp"  # HEIF container
    )
    if not is_image:
        raise HTTPException(status_code=415, detail="File is not a valid image.")

    return content


# ─── Session ID validation ──────────────────────────────
import re
SESSION_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{8,64}$")


def validate_session_id(session_id: str) -> str:
    """Ensure session_id is safe for DB queries."""
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    if not SESSION_ID_PATTERN.match(session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID format")
    return session_id
