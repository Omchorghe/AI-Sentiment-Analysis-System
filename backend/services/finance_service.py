"""Service layer for Finance Pulse module."""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any

import yfinance as yf
import finnhub
from transformers import pipeline

from models.finance import FinancePulseResponse, HistoricalPrice, NewsArticle
from utils.config import settings

logger = logging.getLogger(__name__)

class FinanceServiceError(Exception):
    """Raised when Finance Service operations fail."""
    pass

class FinanceService:
    """Encapsulates Finance Pulse logic for stock data and financial sentiment."""

    _finbert_pipeline = None
    _finnhub_client = None

    @classmethod
    def _get_finbert_pipeline(cls):
        """Lazy load the FinBERT pipeline."""
        if cls._finbert_pipeline is None:
            logger.info("Initializing ProsusAI/finbert model (this may take a moment)")
            try:
                cls._finbert_pipeline = pipeline("sentiment-analysis", model="ProsusAI/finbert")
            except Exception as e:
                logger.error(f"Failed to load FinBERT: {e}")
                raise FinanceServiceError(f"Failed to load sentiment model: {e}")
        return cls._finbert_pipeline

    @classmethod
    def _get_finnhub_client(cls):
        """Lazy load Finnhub client."""
        if cls._finnhub_client is None:
            if not settings.finnhub_api_key:
                raise FinanceServiceError("Finnhub API Key is not configured")
            cls._finnhub_client = finnhub.Client(api_key=settings.finnhub_api_key)
        return cls._finnhub_client

    @staticmethod
    def get_finance_pulse(ticker: str) -> Dict[str, Any]:
        """
        Fetch 7-day historical prices and top 5 recent news articles with sentiment.
        """
        ticker = ticker.upper()
        logger.info(f"Fetching Finance Pulse for ticker: {ticker}")
        
        try:
            # 1. Fetch 7-day historical prices via yfinance
            stock = yf.Ticker(ticker)
            hist = stock.history(period="7d")
            
            if hist.empty:
                raise FinanceServiceError(f"No historical data found for ticker: {ticker}")

            # 1b. Fetch "max" history for ATH, ATL, Average
            hist_max = stock.history(period="max")
            all_time_high = round(float(hist_max['High'].max()), 2) if not hist_max.empty else 0.0
            all_time_low = round(float(hist_max['Low'].min()), 2) if not hist_max.empty else 0.0
            average_price = round(float(hist_max['Close'].mean()), 2) if not hist_max.empty else 0.0
            
            # 1c. Fetch Company Info
            info = stock.info
            company_name = info.get("longName") or info.get("shortName") or ticker

            historical_prices_map = {}
            for date, row in hist.iterrows():
                date_str = date.strftime("%Y-%m-%d")
                historical_prices_map[date_str] = HistoricalPrice(
                    date=date_str, 
                    open=round(float(row['Open']), 2),
                    high=round(float(row['High']), 2),
                    low=round(float(row['Low']), 2),
                    price=round(float(row['Close']), 2)
                )

            # 2. Fetch latest company news via Finnhub
            finnhub_client = FinanceService._get_finnhub_client()
            
            end_date = datetime.now()
            start_date = end_date - timedelta(days=7)
            
            try:
                news_items = finnhub_client.company_news(
                    ticker, 
                    _from=start_date.strftime("%Y-%m-%d"), 
                    to=end_date.strftime("%Y-%m-%d")
                )
            except Exception as e:
                logger.warning(f"Failed to fetch Finnhub news for {ticker}: {e}")
                news_items = []

            # Take top 5 news for feed, but use up to 50 for daily averages
            news_feed = []
            ai_recommendation = "HOLD"
            if news_items:
                finbert = FinanceService._get_finbert_pipeline()
                
                # Sort news_items by datetime descending just in case
                news_items.sort(key=lambda x: x.get('datetime', 0), reverse=True)
                
                # Limit to 50 to avoid taking too long
                process_news = news_items[:50]
                
                headlines = [item.get('headline', '') for item in process_news]
                valid_indices = [i for i, h in enumerate(headlines) if h]
                valid_headlines = [headlines[i] for i in valid_indices]
                
                sentiments = finbert(valid_headlines) if valid_headlines else []
                
                label_map = {
                    "positive": "Bullish",
                    "negative": "Bearish",
                    "neutral": "Neutral"
                }
                
                daily_sentiment_sums = {}
                daily_sentiment_counts = {}

                sentiment_idx = 0
                for i in valid_indices:
                    item = process_news[i]
                    headline = item.get('headline', '')
                    url = item.get('url', '')
                    
                    # Finnhub datetime is unix timestamp
                    dt = datetime.fromtimestamp(item.get('datetime', 0))
                    date_str = dt.strftime("%Y-%m-%d")
                    
                    sentiment_result = sentiments[sentiment_idx]
                    raw_label = sentiment_result['label'].lower()
                    
                    # Convert to numeric score for chart: Bullish=1, Bearish=-1, Neutral=0
                    numeric_score = 0.0
                    if raw_label == "positive":
                        numeric_score = 1.0
                    elif raw_label == "negative":
                        numeric_score = -1.0
                        
                    daily_sentiment_sums[date_str] = daily_sentiment_sums.get(date_str, 0) + numeric_score
                    daily_sentiment_counts[date_str] = daily_sentiment_counts.get(date_str, 0) + 1
                    
                    # Populate the top 5 news feed
                    if len(news_feed) < 5:
                        mapped_label = label_map.get(raw_label, "Neutral")
                        news_feed.append(NewsArticle(
                            headline=headline,
                            url=url,
                            sentiment=mapped_label,
                            score=round(float(sentiment_result['score']), 4)
                        ))
                        
                    sentiment_idx += 1

                # Assign daily averages to historical prices
                total_sentiment = 0.0
                total_sentiment_count = 0

                for date_str, hp in historical_prices_map.items():
                    if date_str in daily_sentiment_sums:
                        # Only assign daily average if at least 5 news items
                        if daily_sentiment_counts.get(date_str, 0) >= 5:
                            avg = daily_sentiment_sums[date_str] / daily_sentiment_counts[date_str]
                            hp.sentiment_score = round(avg, 2)
                        
                        # Add to weekly aggregate
                        total_sentiment += daily_sentiment_sums[date_str]
                        total_sentiment_count += daily_sentiment_counts[date_str]

                # Determine AI Recommendation based on weekly aggregate
                weekly_avg_sentiment = 0.0
                if total_sentiment_count > 0:
                    weekly_avg_sentiment = total_sentiment / total_sentiment_count
                
                if weekly_avg_sentiment >= 0.15:
                    ai_recommendation = "BUY"
                elif weekly_avg_sentiment <= -0.15:
                    ai_recommendation = "SELL"

            response = FinancePulseResponse(
                ticker=ticker,
                company_name=company_name,
                all_time_high=all_time_high,
                all_time_low=all_time_low,
                average_price=average_price,
                ai_recommendation=ai_recommendation,
                historical_prices=list(historical_prices_map.values()),
                news_feed=news_feed
            )
            
            logger.info(f"Successfully processed Finance Pulse for {ticker}")
            return response.model_dump()
            
        except Exception as e:
            logger.error(f"Error processing Finance Pulse for {ticker}: {e}", exc_info=True)
            if isinstance(e, FinanceServiceError):
                raise e
            raise FinanceServiceError(f"Unexpected error: {str(e)}")
