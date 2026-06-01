"""Bluesky analysis route definitions."""

import logging

from fastapi import APIRouter, HTTPException, status

from models.bluesky import BlueskyAnalyzeRequest
from services.bluesky_service import (
    BlueskyService,
    BlueskyAuthError,
    BlueskyAPIError,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/bluesky", tags=["bluesky-analysis"])


@router.post("/analyze")
def analyze_bluesky(payload: BlueskyAnalyzeRequest) -> dict[str, object]:
    """
    Analyze Bluesky posts and return sentiment summary.

    Args:
        payload: Request containing keyword and limit

    Returns:
        Dictionary with sentiment analysis results

    Raises:
        HTTPException: If analysis fails
    """
    try:
        logger.info(f"Received Bluesky analysis request: keyword='{payload.keyword}', limit={payload.limit}")
        result = BlueskyService.analyze_posts(
            keyword=payload.keyword,
            limit=payload.limit
        )
        logger.info("Bluesky analysis completed successfully")
        return result

    except BlueskyAuthError as exc:
        logger.error(f"Authentication error: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bluesky authentication failed: {str(exc)}",
        ) from exc

    except BlueskyAPIError as exc:
        logger.error(f"API error: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bluesky API error: {str(exc)}",
        ) from exc

    except Exception as exc:
        logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Bluesky analysis failed: {str(exc)}",
        ) from exc
