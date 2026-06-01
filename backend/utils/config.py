"""Configuration helpers for the backend."""

import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class Settings(BaseModel):
    """Application settings."""

    app_name: str = "Sentiment Analysis API"
    app_version: str = "0.1.0"
    allowed_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*",
    ]
    
    # Bluesky configuration
    bluesky_handle: str = os.getenv("BLUESKY_HANDLE", "")
    bluesky_app_password: str = os.getenv("BLUESKY_APP_PASSWORD", "")
    
    # YouTube configuration
    youtube_api_key: str = os.getenv("YOUTUBE_API_KEY", "")

    # Finnhub configuration
    finnhub_api_key: str = os.getenv("FINNHUB_API_KEY", "")


settings = Settings()
