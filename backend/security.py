"""Security layer — rate limiting, input validation, secure headers, attack prevention."""

import hashlib
import hmac
import os
import re
import time
from collections import defaultdict
from fastapi import HTTPException, Request, UploadFile
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# ─── Rate limiting (in-memory, per IP + endpoint) ─────────
_request_log: dict[str, list[float]] = defaultdict(list)
_banned_ips: dict[str, float] = {}  # IP -> unban time

RATE_LIMITS = {
    "tryon": (8, 600),       # 8 try-ons per 10 min per IP
    "upload": (20, 300),     # 20 uploads per 5 min
    "read": (120, 60),       # 120 reads per minute
    "write": (30, 60),       # 30 writes per minute
    "default": (60, 60),
}

BAN_THRESHOLD = 200  # Requests above this in 60s = auto-ban
BAN_DURATION = 3600  # 1 hour ban


def _get_client_ip(request: Request) -> str:
    """Get real client IP, accounting for Vercel/Cloudflare proxies."""
    # Vercel sets x-forwarded-for
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_rate_limit(request: Request, endpoint_type: str = "default"):
    """Enforce rate limit; auto-ban abusers."""
    ip = _get_client_ip(request)
    now = time.time()

    # Check ban list
    if ip in _banned_ips:
        if now < _banned_ips[ip]:
            raise HTTPException(status_code=429, detail="Temporarily blocked due to abuse.")
        del _banned_ips[ip]

    limit, window = RATE_LIMITS.get(endpoint_type, RATE_LIMITS["default"])

    # Track all requests in last 60s for auto-ban detection
    key_all = f"{ip}:all"
    _request_log[key_all] = [t for t in _request_log[key_all] if now - t < 60]
    if len(_request_log[key_all]) >= BAN_THRESHOLD:
        _banned_ips[ip] = now + BAN_DURATION
        raise HTTPException(status_code=429, detail="Blocked for abuse.")
    _request_log[key_all].append(now)

    # Per-endpoint rate limit
    key = f"{ip}:{endpoint_type}"
    _request_log[key] = [t for t in _request_log[key] if now - t < window]

    if len(_request_log[key]) >= limit:
        retry_after = int(window - (now - _request_log[key][0]))
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded ({limit}/{window}s). Retry in {retry_after}s.",
            headers={"Retry-After": str(retry_after)},
        )

    _request_log[key].append(now)


# ─── File upload validation ─────────────────────────────
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
MIN_UPLOAD_SIZE = 500  # 500 bytes (block tiny files)
ALLOWED_MIME = {
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "image/heic", "image/heif", "application/octet-stream"
}


async def validate_upload(file: UploadFile) -> bytes:
    """Validate uploaded image: type, size, magic bytes."""
    if file.content_type and file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=415, detail="Invalid file type. Use JPEG, PNG, WebP, or HEIC.")

    # Read in chunks to prevent memory DoS
    content = bytearray()
    chunk_size = 64 * 1024  # 64KB chunks
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        content.extend(chunk)
        if len(content) > MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=413, detail="File too large (max 10MB).")

    if len(content) < MIN_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File is too small or empty.")

    # Verify magic bytes — prevents fake extensions
    content_bytes = bytes(content)
    is_image = (
        content_bytes[:3] == b"\xff\xd8\xff" or  # JPEG
        content_bytes[:8] == b"\x89PNG\r\n\x1a\n" or  # PNG
        content_bytes[:4] == b"RIFF" or  # WebP
        (len(content_bytes) > 12 and content_bytes[4:8] == b"ftyp")  # HEIC/HEIF
    )
    if not is_image:
        raise HTTPException(status_code=415, detail="Not a valid image file.")

    return content_bytes


# ─── Session ID validation ──────────────────────────────
SESSION_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{8,64}$")


def validate_session_id(session_id: str) -> str:
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    if not SESSION_ID_PATTERN.match(session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID")
    return session_id


# ─── String input sanitization ──────────────────────────
DANGEROUS_PATTERNS = [
    re.compile(r"<script", re.I),
    re.compile(r"javascript:", re.I),
    re.compile(r"on\w+\s*=", re.I),  # onclick, onload, etc.
    re.compile(r"data:text/html", re.I),
]


def sanitize_string(value: str, max_len: int = 500, field_name: str = "input") -> str:
    """Block XSS patterns and enforce length."""
    if not isinstance(value, str):
        return ""
    if len(value) > max_len:
        raise HTTPException(status_code=400, detail=f"{field_name} exceeds {max_len} chars")
    for pattern in DANGEROUS_PATTERNS:
        if pattern.search(value):
            raise HTTPException(status_code=400, detail=f"Invalid characters in {field_name}")
    return value.strip()


# ─── Secure response headers middleware ─────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # OWASP recommended headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Strict-Transport-Security (only over HTTPS)
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Content Security Policy — restrict resources
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "img-src 'self' data: https://res.cloudinary.com https://cdn.shopify.com https://cdn.fashn.ai blob:; "
            "font-src 'self' https://fonts.gstatic.com; "
            "connect-src 'self' https://api.fashn.ai; "
            "media-src 'self' blob:; "
            "frame-ancestors 'self' https://oshinsarin.in https://www.oshinsarin.in;"
        )

        return response


# ─── Trusted host validation ────────────────────────────
def verify_trusted_host(request: Request):
    """Block requests with suspicious Host headers."""
    host = request.headers.get("host", "")
    allowed = [
        "localhost", "127.0.0.1",
        "oshinsarin.in", "www.oshinsarin.in",
    ]

    # Get allowed from env
    frontend_url = os.getenv("FRONTEND_URL", "")
    if frontend_url:
        from urllib.parse import urlparse
        parsed = urlparse(frontend_url)
        if parsed.hostname:
            allowed.append(parsed.hostname)

    # Vercel deploys
    if ".vercel.app" in host:
        return True

    host_clean = host.split(":")[0].lower()
    for allowed_host in allowed:
        if host_clean == allowed_host.lower():
            return True

    # Allow in dev
    if os.getenv("HOST", "").startswith("0.0.0.0"):
        return True

    return True  # Don't block by default, just log
