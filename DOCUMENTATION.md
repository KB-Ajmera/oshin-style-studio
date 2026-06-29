# Oshin Style Studio — Virtual Try-On & Styling System

Complete technical documentation of what the system is, what it uses, and how it
all fits together.

_Last updated: 2026-06-26_

---

## 1. What this is

A virtual try-on and styling widget for the fashion brand **Oshin Sarin**
(oshinsarin.in, a Shopify store). Shoppers can:

1. Take a **style quiz** and get outfit **recommendations** matched to their
   body type, occasion, and taste.
2. Upload a photo and **virtually try on** any outfit (AI dresses them in the
   garment).
3. Browse the catalog, save a **history** of try-ons, and compare looks.

It ships in two forms:
- A **full Style Studio web app** (the quiz + recommendations + try-on).
- **Embeddable widgets** that drop onto the Shopify store (a floating launcher
  button sitewide + a per-product try-on button).

---

## 2. Architecture at a glance

```
  Shopify store (oshinsarin.in)
        │  loads 2 <script> tags
        ▼
  ┌─────────────────────────────┐        ┌──────────────────────┐
  │  Widgets (vanilla JS)        │        │  Fashn.ai API        │
  │  - launcher.js (floating)    │  POST  │  virtual try-on      │
  │  - tryon-button.js (product) │ ─────► │  model: tryon-max 4K │
  └──────────────┬──────────────┘        └──────────────────────┘
                 │ calls /api/*
                 ▼
  ┌─────────────────────────────┐        ┌──────────────────────┐
  │  Backend — FastAPI (Python)  │ ─────► │  Supabase (Postgres) │
  │  hosted on Vercel serverless │        │  catalog + history   │
  │  /widget/ + /api/*           │        └──────────────────────┘
  └──────────────┬──────────────┘        ┌──────────────────────┐
                 │ image URLs            │  Cloudinary          │
                 └─────────────────────► │  product image host  │
                                         └──────────────────────┘
```

---

## 3. Tech stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3, **FastAPI** + Uvicorn |
| **Database** | **Supabase** (managed PostgreSQL) |
| **Image hosting** | **Cloudinary** |
| **Virtual try-on AI** | **Fashn.ai** (`tryon-max` model, 4K) |
| **Hairstyle try-on** | **AILab Tools API** (via RapidAPI) |
| **Frontend / widgets** | Vanilla JavaScript (no framework), HTML, CSS |
| **Hosting / deploy** | **Vercel** (serverless Python functions) |
| **Source control** | GitHub — `KB-Ajmera/oshin-style-studio` |
| **Recommendation engine** | Designer-intelligence matching engine |

---

## 4. External APIs & services used

### 4.1 Fashn.ai — virtual try-on (core paid API)
- **What:** takes a photo of a person + a garment image, returns a photoreal
  image of the person wearing the garment.
- **Model:** `tryon-max`, `resolution: 4k`, `generation_mode: quality`,
  `output_format: png`.
- **Endpoints used:**
  - `POST https://api.fashn.ai/v1/run` — start a try-on (returns a prediction id)
  - `GET https://api.fashn.ai/v1/status/{id}` — poll for the result
- **Auth:** `Authorization: Bearer <FASHN_API_KEY>`
- **Cost:** this is the main per-use cost (~₹38/try-on, approximate — depends on
  Fashn.ai's `tryon-max` pricing). Everything else is near-zero per request.
- **Code:** `backend/tryon.py`

### 4.2 Supabase — database (PostgreSQL)
- **What:** stores the product **catalog** and try-on **history / comparisons**.
- **Connection:** Postgres via the pooler (`backend/db.py`), using
  `psycopg`. Connection string built from `SUPABASE_URL` + `SUPABASE_DB_PASSWORD`.
- **Tables:** `products` (the catalog with all designer metadata), plus
  history/session storage.

### 4.3 Cloudinary — image hosting
- **What:** hosts all the product/garment images served to the widget and sent
  to Fashn.ai as `product_image` URLs.
- **Code:** `backend/upload_to_cloudinary.py`
- **Auth:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### 4.4 AILab Tools (via RapidAPI) — hairstyle try-on
- **What:** powers the optional hairstyle change feature; makeup looks are presets
  applied client-side.
- **Code:** `backend/beauty.py`

### 4.5 Shopify
- The store itself. Product **handles** map 1:1 to catalog **SKUs**, which is how
  the per-product try-on button knows which garment to use.
- Integration is via 2 embedded `<script>` tags in the theme (no Shopify app).

---

## 5. Backend modules (`backend/`)

| File | Responsibility |
|---|---|
| `main.py` | FastAPI app, all routes, CORS, security middleware |
| `config.py` | Env vars + Fashn.ai URLs |
| `db.py` | Supabase Postgres connection helper |
| `catalog.py` | Loads the product catalog from Supabase into memory |
| `questionnaire.py` | The style quiz + designer-intelligence recommendation matching |
| `tryon.py` | Fashn.ai try-on: image preprocessing, start, poll |
| `beauty.py` | Hairstyles (AILab) + makeup presets |
| `history.py` | Try-on history + comparisons storage |
| `security.py` | Rate limiting, input sanitization, security headers, CSP |
| `merge_metadata.py` | Merges Oshin's designer metadata Excel → catalog JSON |
| `migrate_products.py` | Pushes the catalog JSON into Supabase |
| `upload_to_cloudinary.py` | Uploads product images to Cloudinary |

---

## 6. API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Redirects to the widget |
| GET | `/api/health` | Health check |
| GET | `/api/questionnaire` | The style quiz definition |
| POST | `/api/preferences` | Save a user's quiz answers |
| GET | `/api/recommendations` | Ranked outfit recommendations |
| GET | `/api/categories` | Catalog categories |
| GET | `/api/outfits` | Paginated catalog |
| GET | `/api/outfits/{id}` | Single product |
| POST | `/api/tryon` | Start a virtual try-on |
| GET | `/api/tryon/status/{id}` | Poll try-on result |
| POST | `/api/tryon/sync` | Try-on (blocking) |
| GET | `/api/hairstyles` | Hairstyle options |
| GET | `/api/makeup` | Makeup looks |
| GET | `/api/beauty/recommendations` | Beauty recommendations |
| GET/POST | `/api/session`, `/api/session/{id}` | Session handling |
| GET/POST/DELETE | `/api/history*` | Try-on history |
| GET/POST | `/api/comparisons*` | Look comparisons |

---

## 7. The recommendation engine

- File: `backend/questionnaire.py`
- A **designer-intelligence matching engine**. Each outfit is matched against the
  shopper's quiz answers across weighted style signals:
  - Occasion (weight 5), style vibe (4), body shape (4), color palette (3),
    silhouette (3), fabric (2), with budget filtering.
- Outfits are ranked best-match first, so shoppers see the most relevant pieces
  at the top.
- The matching is powered by **Oshin's own designer metadata** (occasion,
  style vibe, color family, silhouette, body types, fit notes) — her styling
  expertise, encoded into the catalog. This is the key differentiator: the
  recommendations feel like a personal consultation with the designer.

---

## 8. Catalog / data pipeline

1. Oshin fills designer metadata in `Oshin-Shopify-Metadata-FILL-IN.xlsx`.
2. `python backend/merge_metadata.py "<sheet>.xlsx"` — normalizes + merges into
   `data/shopify_catalog.json` (backs up the old file).
3. `python backend/migrate_products.py` — clears and re-inserts all products into
   the Supabase `products` table.
4. The app loads from Supabase at startup.

Current catalog: ~213 products (24 linesheet + 191 Shopify), with full designer
metadata on the required fields.

---

## 9. Frontend & embeddable widgets (`widget/`)

| File | What it is |
|---|---|
| `index.html`, `app.js`, `styles.css` | The full Style Studio web app |
| `launcher.js` | **Floating "Virtual Try-On" pill** (sitewide). Opens the full Style Studio in a full-screen overlay on the host site. |
| `tryon-button.js` | **Per-product "Virtual Try-On This Outfit" button**. Detects the Shopify product and runs a try-on for that exact outfit. |

### Shopify install (2 script tags in `theme.liquid`, before `</body>`)
```html
<script src="https://oshin-style-studio-kb-ajmeras-projects.vercel.app/widget/launcher.js" defer></script>
{%- if template contains 'product' -%}
  <script src="https://oshin-style-studio-kb-ajmeras-projects.vercel.app/widget/tryon-button.js"
          data-api="https://oshin-style-studio-kb-ajmeras-projects.vercel.app" defer></script>
{%- endif -%}
```
Installed safely on a **duplicated theme**, previewed, then published.

---

## 10. Deployment

- **Platform:** Vercel (serverless Python via `api/index.py`, see `vercel.json`).
- **Repo:** `github.com/KB-Ajmera/oshin-style-studio`, branch `main`.
- **Auto-deploy:** pushing to `main` triggers a Vercel build automatically.
- **Production URL:** `https://oshin-style-studio-kb-ajmeras-projects.vercel.app`
- **Security:** CSP, rate limiting, input sanitization, secure headers, and
  `frame-ancestors` allowing `oshinsarin.in` (so the overlay can embed).

---

## 11. Environment variables (`.env`)

| Variable | Used for |
|---|---|
| `FASHN_API_KEY` | Fashn.ai virtual try-on |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Cloudinary image hosting |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_KEY` | Supabase API keys |
| `SUPABASE_DB_PASSWORD` | Postgres connection |
| `HOST` / `PORT` | Local server |
| `FRONTEND_URL` / `ALLOWED_ORIGINS` | CORS (set after deploy) |

> Secrets live only in `.env` (git-ignored). Never commit them.

---

## 12. Running locally

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
cd backend && ../.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000
# App: http://127.0.0.1:8000/widget/
```

---

## 13. Cost structure

| Service | Cost |
|---|---|
| **Fashn.ai** (virtual try-on) | ~₹38 per try-on render — the core usage cost |
| **Supabase** (database) | Free tier |
| **Cloudinary** (image hosting) | Free tier |
| **Vercel** (hosting) | Free tier |
| **AILab via RapidAPI** (hairstyles) | Per-call (optional feature) |

The infrastructure runs on free tiers, so the only per-use cost is the Fashn.ai
try-on render at approximately **₹38 per try-on**. Cost scales directly with
usage — you only pay when a shopper actually tries an outfit on.
