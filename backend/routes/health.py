"""Health route definitions."""

from fastapi import APIRouter

from models.health import HealthResponse
from services.sentiment_service import SentimentService

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Health check endpoint."""
    return SentimentService.get_health_status()
