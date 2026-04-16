import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

FASHN_API_KEY = os.getenv("FASHN_API_KEY", "")
FASHN_API_URL = "https://api.fashn.ai/v1/run"
FASHN_STATUS_URL = "https://api.fashn.ai/v1/status"

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# Dataset paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WOMEN_FASHION_DIR = os.path.join(BASE_DIR, "women fashion")
CLOTHES_DATASET_DIR = os.path.join(BASE_DIR, "Clothes_Dataset")

# Supported image extensions
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
