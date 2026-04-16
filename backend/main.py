"""FastAPI backend for Virtual Try-On + Styling Assistant."""

import os
import base64
from contextlib import asynccontextmanager
from urllib.parse import unquote

from fastapi import FastAPI, UploadFile, File, Form, Query, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel

import config
from catalog import init_catalog, get_all_outfits, get_outfit_by_id, get_categories, get_catalog
from tryon import start_tryon, poll_tryon, check_status, preprocess_image, crop_garment_by_category
from questionnaire import QUESTIONNAIRE, get_recommendations
from beauty import get_hairstyles, get_makeup_looks, get_recommended_looks
from history import (
    get_or_create_session, save_preferences, add_tryon_to_history,
    get_history, add_comparison, get_comparisons, delete_history_entry,
)
from security import (
    check_rate_limit, validate_upload, validate_session_id, sanitize_string,
    SecurityHeadersMiddleware,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_catalog()
    yield


app = FastAPI(
    title="Virtual Try-On & Styling Assistant API",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS — restrict to allowed origins in production
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else [
    "http://localhost:8000",
    "http://localhost:3000",
    "https://oshinsarin.in",
    "https://www.oshinsarin.in",
]
ALLOWED_ORIGINS = [o.strip() for o in ALLOWED_ORIGINS if o.strip()]

# Security middleware stack (order matters — last added runs first)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "localhost", "127.0.0.1", "0.0.0.0",
        "*.vercel.app",
        "oshinsarin.in", "*.oshinsarin.in",
        "*",  # Keep wildcard for now; tighten after domain is set
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Session-Id", "Authorization"],
    expose_headers=["X-Session-Id"],
    max_age=3600,
)

# Serve widget static files
WIDGET_DIR = os.path.join(config.BASE_DIR, "widget")
app.mount("/widget", StaticFiles(directory=WIDGET_DIR, html=True), name="widget")


@app.get("/")
async def root():
    return RedirectResponse(url="/widget/")


@app.get("/api/health")
async def health_check():
    """Public health check — doesn't expose internals."""
    return {"status": "ok"}


# ─── Global error handler — hide internal errors in production ────
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

IS_DEV = os.getenv("HOST", "").startswith("0.0.0.0") and not os.getenv("VERCEL")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log server-side, return generic message to client
    print(f"[ERROR] {type(exc).__name__}: {exc}")
    if IS_DEV:
        return JSONResponse(status_code=500, content={"detail": str(exc)})
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": "Invalid request data"})


# ─── Session helper ────────────────────────────────────────────────

def _session_id(request: Request) -> str:
    return request.headers.get("X-Session-Id", "")


# ─── Questionnaire endpoints ──────────────────────────────────────

@app.get("/api/questionnaire")
async def get_questionnaire(request: Request):
    check_rate_limit(request, "read")
    return QUESTIONNAIRE


class PreferencesBody(BaseModel):
    session_id: str
    preferences: dict


@app.post("/api/preferences")
async def save_user_preferences(body: PreferencesBody, request: Request):
    check_rate_limit(request, "write")
    sid = validate_session_id(body.session_id)
    session = save_preferences(sid, body.preferences)
    return {"status": "saved", "session_id": session["session_id"]}


@app.get("/api/recommendations")
async def get_outfit_recommendations(
    request: Request,
    session_id: str = Query(...),
    limit: int = Query(30, ge=1, le=100),
):
    check_rate_limit(request, "read")
    session_id = validate_session_id(session_id)
    session = get_or_create_session(session_id)
    prefs = session.get("preferences", {})
    if not prefs:
        raise HTTPException(status_code=400, detail="No preferences saved. Complete the questionnaire first.")

    recommended = get_recommendations(get_catalog(), prefs, limit=limit)
    return {"outfits": recommended, "preferences": prefs}


# ─── Catalog endpoints ────────────────────────────────────────────

@app.get("/api/categories")
async def list_categories(request: Request):
    check_rate_limit(request, "read")
    return {"categories": get_categories()}


@app.get("/api/outfits")
async def list_outfits(
    request: Request,
    category: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    check_rate_limit(request, "read")
    if category:
        category = sanitize_string(category, max_len=50, field_name="category")
    return get_all_outfits(category=category, page=page, per_page=per_page)


@app.get("/api/outfits/{outfit_id}")
async def get_outfit(request: Request, outfit_id: str):
    check_rate_limit(request, "read")
    outfit_id = sanitize_string(outfit_id, max_len=100, field_name="outfit_id")
    outfit = get_outfit_by_id(outfit_id)
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")
    return outfit


# Images are served directly from Cloudinary CDN — no local serving needed




# ─── Virtual Try-On endpoints ─────────────────────────────────────

@app.post("/api/tryon")
async def virtual_tryon(
    request: Request,
    user_image: UploadFile = File(...),
    outfit_id: str = Form(...),
    mode: str = Form("quality"),
    session_id: str = Form(""),
    hairstyle: str = Form(""),
    makeup: str = Form(""),
):
    """Start a virtual try-on."""
    check_rate_limit(request, "tryon")

    if not config.FASHN_API_KEY:
        raise HTTPException(status_code=500, detail="Service temporarily unavailable")

    outfit_id = sanitize_string(outfit_id, max_len=100, field_name="outfit_id")
    outfit = get_outfit_by_id(outfit_id)
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")

    # Validate + preprocess user image (JPEG, max 2000px, quality 95, LANCZOS)
    image_bytes = await validate_upload(user_image)
    b64_image = preprocess_image(image_bytes)

    # Garment image URL (Cloudinary or Shopify CDN) — send URL directly to Fashn.ai
    garment_url = _get_garment_url(outfit)
    if not garment_url:
        raise HTTPException(status_code=404, detail="Garment image not found")

    result = await start_tryon(
        model_image_b64=b64_image,
        garment_image_url=garment_url,
        category=outfit.get("fashn_category", "auto"),
        mode=mode,
        garment_photo_type="flat-lay" if outfit.get("has_clean") else "model",
    )

    if "error" in result:
        raise HTTPException(status_code=502, detail=result["error"])

    result["outfit_id"] = outfit_id
    result["outfit_name"] = outfit["name"]
    result["outfit_image"] = outfit["image_url"]
    result["session_id"] = session_id
    result["hairstyle"] = hairstyle
    result["makeup"] = makeup

    return result


@app.get("/api/tryon/status/{prediction_id}")
async def tryon_status(request: Request, prediction_id: str):
    check_rate_limit(request, "read")
    prediction_id = sanitize_string(prediction_id, max_len=100, field_name="prediction_id")
    if not config.FASHN_API_KEY:
        raise HTTPException(status_code=500, detail="FASHN_API_KEY not configured")
    result = await check_status(prediction_id)
    if "error" in result and result.get("status") is None:
        raise HTTPException(status_code=502, detail=result["error"])
    return result


@app.post("/api/tryon/sync")
async def virtual_tryon_sync(
    request: Request,
    user_image: UploadFile = File(...),
    outfit_id: str = Form(...),
    mode: str = Form("quality"),
    session_id: str = Form(""),
    hairstyle: str = Form(""),
    makeup: str = Form(""),
):
    """Synchronous try-on — waits for result."""
    check_rate_limit(request, "tryon")

    if not config.FASHN_API_KEY:
        raise HTTPException(status_code=500, detail="Service temporarily unavailable")

    outfit = get_outfit_by_id(outfit_id)
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")

    image_bytes = await validate_upload(user_image)
    b64_image = preprocess_image(image_bytes)

    garment_url = _get_garment_url(outfit)
    if not garment_url:
        raise HTTPException(status_code=404, detail="Garment image not found")

    start_result = await start_tryon(
        model_image_b64=b64_image,
        garment_image_url=garment_url,
        category=outfit.get("fashn_category", "auto"),
        mode=mode,
        garment_photo_type="flat-lay" if outfit.get("has_clean") else "model",
    )

    if "error" in start_result:
        raise HTTPException(status_code=502, detail=start_result["error"])

    final = await poll_tryon(start_result["id"])
    if "error" in final:
        raise HTTPException(status_code=502, detail=final["error"])

    # Save to history
    if session_id:
        add_tryon_to_history(
            session_id=session_id,
            outfit_id=outfit_id,
            outfit_name=outfit["name"],
            outfit_image=outfit["image_url"],
            result_images=final.get("output", []),
            hairstyle=hairstyle or None,
            makeup=makeup or None,
        )

    return final


# ─── Beauty endpoints ──────────────────────────────────────────────

@app.get("/api/hairstyles")
async def list_hairstyles():
    return get_hairstyles()


@app.get("/api/makeup")
async def list_makeup_looks(occasion: str | None = Query(None)):
    return get_makeup_looks(occasion)


@app.get("/api/beauty/recommendations")
async def beauty_recommendations(session_id: str = Query(...)):
    session = get_or_create_session(session_id)
    prefs = session.get("preferences", {})
    return get_recommended_looks(prefs)


# ─── History endpoints ─────────────────────────────────────────────

@app.get("/api/session/{session_id}")
async def get_session(request: Request, session_id: str):
    check_rate_limit(request, "read")
    session_id = validate_session_id(session_id)
    session = get_or_create_session(session_id)
    return session


@app.post("/api/session")
async def create_session(request: Request):
    check_rate_limit(request, "write")
    session = get_or_create_session()
    return {"session_id": session["session_id"]}


@app.get("/api/history/{session_id}")
async def get_tryon_history(request: Request, session_id: str):
    check_rate_limit(request, "read")
    session_id = validate_session_id(session_id)
    return {"history": get_history(session_id)}


class SaveHistoryBody(BaseModel):
    session_id: str
    outfit_id: str
    outfit_name: str
    outfit_image: str
    result_images: list[str]
    hairstyle: str | None = None
    makeup: str | None = None


@app.post("/api/history")
async def save_to_history(body: SaveHistoryBody, request: Request):
    check_rate_limit(request, "write")
    validate_session_id(body.session_id)
    # Sanitize strings in body
    body.outfit_name = sanitize_string(body.outfit_name, max_len=200, field_name="outfit_name")
    entry = add_tryon_to_history(
        session_id=body.session_id,
        outfit_id=body.outfit_id,
        outfit_name=body.outfit_name,
        outfit_image=body.outfit_image,
        result_images=body.result_images,
        hairstyle=body.hairstyle,
        makeup=body.makeup,
    )
    return entry


@app.delete("/api/history/{session_id}/{entry_id}")
async def delete_from_history(request: Request, session_id: str, entry_id: str):
    check_rate_limit(request, "write")
    session_id = validate_session_id(session_id)
    entry_id = sanitize_string(entry_id, max_len=100, field_name="entry_id")
    ok = delete_history_entry(session_id, entry_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"status": "deleted"}


# ─── Comparison endpoints ─────────────────────────────────────────

class CompareBody(BaseModel):
    session_id: str
    tryon_ids: list[str]
    name: str | None = None


@app.post("/api/comparisons")
async def create_comparison(body: CompareBody, request: Request):
    check_rate_limit(request, "write")
    validate_session_id(body.session_id)
    if len(body.tryon_ids) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 try-ons to compare")
    comp = add_comparison(body.session_id, body.tryon_ids, body.name)
    return comp


@app.get("/api/comparisons/{session_id}")
async def list_comparisons(request: Request, session_id: str):
    check_rate_limit(request, "read")
    session_id = validate_session_id(session_id)
    return {"comparisons": get_comparisons(session_id)}


# ─── Helpers ───────────────────────────────────────────────────────

def _get_garment_url(outfit: dict) -> str | None:
    """Get garment image URL for try-on (Cloudinary or Shopify CDN)."""
    if outfit.get("has_clean") and outfit.get("clean_image_url"):
        return outfit["clean_image_url"]
    return outfit.get("image_url") or None


# ─── Run ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=config.HOST, port=config.PORT, reload=True)
