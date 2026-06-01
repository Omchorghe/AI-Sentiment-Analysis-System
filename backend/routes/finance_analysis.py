"""Finance Pulse analysis route definitions."""

import logging

from fastapi import APIRouter, HTTPException, Path, status

from services.finance_service import FinanceService, FinanceServiceError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/finance-pulse", tags=["finance-pulse"])

@router.get("/{ticker}")
def analyze_finance_pulse(
    ticker: str = Path(..., min_length=1, max_length=10, description="Stock ticker symbol")
) -> dict:
    """
    Analyze stock ticker and return Finance Pulse data.

    Args:
        ticker: Stock ticker symbol (e.g., NVDA, AAPL)

    Returns:
        Dictionary containing historical prices and news sentiment.

    Raises:
        HTTPException: If analysis fails or ticker is invalid.
    """
    try:
        logger.info(f"Received Finance Pulse request for ticker: {ticker}")
        result = FinanceService.get_finance_pulse(ticker)
        logger.info(f"Finance Pulse analysis completed successfully for {ticker}")
        return result
    except FinanceServiceError as exc:
        logger.error(f"Finance Service error: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Finance Pulse analysis failed: {str(exc)}",
        ) from exc
