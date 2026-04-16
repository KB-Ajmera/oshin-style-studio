"""Vercel serverless entry point — wraps FastAPI app."""

import sys
import os

# Add backend to path so we can import
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from main import app

# Vercel automatically handles the ASGI app via Mangum-style adapter
# FastAPI works out of the box with Vercel's Python runtime
