"""Vercel Python serverless function — FastAPI app entry point."""

import sys
import os

# Ensure backend/ is importable
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))
sys.path.insert(0, ROOT)

# Import and re-export the FastAPI app
from main import app

# Vercel's Python runtime detects `app` as the ASGI handler automatically
