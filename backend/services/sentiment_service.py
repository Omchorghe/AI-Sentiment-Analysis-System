"""Service layer for sentiment analysis operations."""

from textblob import TextBlob
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from models.health import HealthResponse
from utils.text_preprocessing import preprocess_text


class SentimentService:
    """Encapsulates sentiment domain logic."""

    _vader_analyzer = SentimentIntensityAnalyzer()

    @staticmethod
    def get_health_status() -> HealthResponse:
        """Return basic service health state."""
        return HealthResponse(status="ok", service="sentiment-analysis-backend")

    @classmethod
    def analyze_text(cls, text: str) -> dict[str, float | str]:
        """
        Analyze text using VADER and TextBlob.

        Returns cleaned text, individual model scores, fused sentiment label,
        and confidence.
        """
        cleaned_text = preprocess_text(text)
        if not cleaned_text:
            return {
                "cleaned_text": "",
                "vader_score": 0.0,
                "textblob_score": 0.0,
                "sentiment": "neutral",
                "confidence": 0.0,
            }

        vader_score = cls._vader_analyzer.polarity_scores(cleaned_text)["compound"]
        textblob_score = TextBlob(cleaned_text).sentiment.polarity

        # VADER is typically stronger on short/social content; use higher weight.
        final_score = (0.6 * vader_score) + (0.4 * textblob_score)
        sentiment = cls._label_sentiment(final_score)
        confidence = cls._calculate_confidence(vader_score, textblob_score, final_score)

        return {
            "cleaned_text": cleaned_text,
            "vader_score": round(vader_score, 4),
            "textblob_score": round(textblob_score, 4),
            "sentiment": sentiment,
            "confidence": round(confidence, 4),
        }

    @staticmethod
    def _label_sentiment(score: float) -> str:
        """Map a compound score to sentiment class."""
        if score >= 0.05:
            return "positive"
        if score <= -0.05:
            return "negative"
        return "neutral"

    @staticmethod
    def _calculate_confidence(vader_score: float, textblob_score: float, final_score: float) -> float:
        """Estimate confidence from model agreement and final score strength."""
        magnitude = min(abs(final_score), 1.0)
        agreement = max(0.0, 1.0 - (abs(vader_score - textblob_score) / 2.0))
        confidence = (0.7 * magnitude) + (0.3 * agreement)
        return max(0.0, min(confidence, 1.0))
