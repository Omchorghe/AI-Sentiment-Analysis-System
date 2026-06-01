"""YouTube analysis route definitions."""

from fastapi import APIRouter, HTTPException, status

from models.youtube import YouTubeAnalyzeRequest
from services.youtube_service import YouTubeCommentsDisabledError, YouTubeQuotaError, YouTubeService

router = APIRouter(prefix="/api/v1/youtube", tags=["youtube-analysis"])


@router.post("/analyze")
def analyze_youtube(payload: YouTubeAnalyzeRequest) -> dict[str, object]:
    """Analyze YouTube comments and return sentiment summary."""
    try:
        return YouTubeService.analyze_video_comments(url=payload.url)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except YouTubeCommentsDisabledError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except YouTubeQuotaError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"YouTube analysis failed: {exc}",
        ) from exc
