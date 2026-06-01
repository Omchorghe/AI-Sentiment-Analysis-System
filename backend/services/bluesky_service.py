"""Service layer for Bluesky post sentiment analysis."""

import logging
import os
from typing import Optional

from atproto import Client

from .sentiment_service import SentimentService

logger = logging.getLogger(__name__)

def get_bluesky_client() -> Client:
    handle = os.getenv("BLUESKY_HANDLE")
    password = os.getenv("BLUESKY_APP_PASSWORD")

    if not handle or not password:
        raise ValueError("Bluesky credentials not configured")

    client = Client()

    try:
        client.login(handle, password)
        print("Bluesky login successful")
    except Exception as e:
        print("Bluesky login failed:", str(e))
        raise ValueError("Bluesky authentication failed")

    return client


class BlueskyAuthError(Exception):
    """Raised when Bluesky authentication fails."""

    pass


class BlueskyAPIError(Exception):
    """Raised when Bluesky API operations fail."""

    pass


class BlueskyService:
    """Encapsulates Bluesky sentiment analysis logic."""

    _client: Optional[Client] = None
    _is_authenticated: bool = False



    @staticmethod
    def _extract_post_text(post) -> str:
        """
        Safely extract text from a Bluesky post object.

        Args:
            post: Bluesky post object

        Returns:
            Post text, or empty string if extraction fails
        """
        try:
            if hasattr(post, "record") and hasattr(post.record, "text"):
                return post.record.text
            elif hasattr(post, "text"):
                return post.text
        except (AttributeError, TypeError):
            pass
        return ""

    @staticmethod
    def _extract_post_metadata(post) -> dict:
        """
        Safely extract metadata from a Bluesky post object.

        Args:
            post: Bluesky post object

        Returns:
            Dictionary with author and created_at fields
        """
        metadata = {"author": "unknown", "created_at": None}

        try:
            if hasattr(post, "author") and hasattr(post.author, "handle"):
                metadata["author"] = post.author.handle
        except (AttributeError, TypeError):
            pass

        try:
            if hasattr(post, "record") and hasattr(post.record, "created_at"):
                metadata["created_at"] = post.record.created_at
        except (AttributeError, TypeError):
            pass

        return metadata

    @staticmethod
    def analyze_posts(keyword: str, limit: int = 10) -> dict[str, object]:
        """
        Fetch Bluesky posts by keyword and analyze their sentiment.

        Args:
            keyword: Search keyword for posts
            limit: Maximum number of posts to fetch (1-100)

        Returns:
            Dictionary with sentiment counts, posts data, and summary statistics

        Raises:
            BlueskyAuthError: If authentication fails
            BlueskyAPIError: If API operations fail
        """
        if not keyword or not keyword.strip():
            error_msg = "Keyword cannot be empty"
            logger.warning(error_msg)
            raise BlueskyAPIError(error_msg)

        limit = max(1, min(limit, 100))  # Clamp between 1-100

        try:
            # Authenticate and get client
            try:
                client = get_bluesky_client()
            except ValueError as e:
                logger.error(f"Bluesky login failed: {str(e)}")
                raise BlueskyAuthError(str(e))

            logger.info(f"Searching Bluesky posts with keyword: '{keyword}', limit: {limit}")

            # Search for posts
            posts_data = client.app.bsky.feed.search_posts(
                {"q": keyword, "limit": limit, "sort": "latest"}
            )

            posts = posts_data.posts if hasattr(posts_data, "posts") else []

            logger.info(f"Retrieved {len(posts)} posts from Bluesky")

            # Handle empty results
            if not posts:
                logger.info("No posts found for keyword: " + keyword)
                return {
                    "total": 0,
                    "positive": 0,
                    "neutral": 0,
                    "negative": 0,
                    "posts": []
                }

            # Analyze sentiment for each post
            analyzed_posts = []
            sentiment_counts = {"positive": 0, "neutral": 0, "negative": 0}
            total_confidence = 0.0

            for idx, post in enumerate(posts, 1):
                try:
                    # Extract post text
                    text = BlueskyService._extract_post_text(post)

                    if not text or not text.strip():
                        logger.debug(f"Post {idx}: skipping (no text)")
                        continue

                    # Perform sentiment analysis
                    analysis = SentimentService.analyze_text(text)

                    sentiment = analysis.get("sentiment", "neutral")
                    confidence = analysis.get("confidence", 0.0)

                    # Update counts
                    sentiment_counts[sentiment] += 1
                    total_confidence += confidence

                    # Extract metadata
                    metadata = BlueskyService._extract_post_metadata(post)

                    # Add to results
                    analyzed_posts.append({
                        "text": text[:280],  # Limit text length in response
                        "sentiment": sentiment,
                        "confidence": round(confidence, 4)
                    })

                    logger.debug(
                        f"Post {idx}: {sentiment.upper()} "
                        f"(confidence: {confidence:.2%}) - Author: {metadata['author']}"
                    )

                except Exception as exc:
                    logger.warning(f"Post {idx}: analysis failed: {str(exc)}")
                    continue


            logger.info(
                f"Analysis complete: {len(analyzed_posts)} posts analyzed. "
                f"Positive: {sentiment_counts['positive']}, "
                f"Neutral: {sentiment_counts['neutral']}, "
                f"Negative: {sentiment_counts['negative']}"
            )

            return {
                "total": len(analyzed_posts),
                "positive": sentiment_counts["positive"],
                "neutral": sentiment_counts["neutral"],
                "negative": sentiment_counts["negative"],
                "posts": analyzed_posts
            }

        except BlueskyAuthError:
            # Re-raise auth errors as-is
            raise
        except Exception as exc:
            error_msg = f"Bluesky API error: {str(exc)}"
            logger.error(error_msg)
            raise BlueskyAPIError(error_msg) from exc
