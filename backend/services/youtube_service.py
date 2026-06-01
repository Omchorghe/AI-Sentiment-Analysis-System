"""Service layer for YouTube comments extraction and sentiment analysis."""

import os
from collections import Counter
from urllib.parse import parse_qs, urlparse

from dotenv import load_dotenv
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from services.sentiment_service import SentimentService

load_dotenv()


class YouTubeQuotaError(RuntimeError):
    """Raised when YouTube API quota is exhausted."""


class YouTubeCommentsDisabledError(RuntimeError):
    """Raised when a video has comments disabled."""


class YouTubeService:
    """YouTube integration service using YouTube Data API."""

    @staticmethod
    def extract_video_id(url: str) -> str:
        """Extract video ID from watch and short YouTube URL formats."""
        parsed = urlparse(url.strip())
        host = parsed.netloc.lower().replace("www.", "")

        if host == "youtu.be":
            return parsed.path.strip("/").split("/")[0]

        if host in {"youtube.com", "m.youtube.com"} and parsed.path == "/watch":
            return parse_qs(parsed.query).get("v", [""])[0]

        return ""

    @staticmethod
    def _create_client():
        api_key = os.getenv("YOUTUBE_API_KEY", "")
        if not api_key:
            raise ValueError("Missing YOUTUBE_API_KEY in .env.")
        return build("youtube", "v3", developerKey=api_key)

    @staticmethod
    def _handle_http_error(exc: HttpError) -> None:
        reason = str(exc).lower()
        if exc.resp.status == 403 and "quota" in reason:
            raise YouTubeQuotaError("YouTube API quota exceeded. Please try again later.") from exc
        if exc.resp.status == 403 and "commentsdisabled" in reason:
            raise YouTubeCommentsDisabledError("Comments are disabled for this video.") from exc
        raise RuntimeError(f"YouTube API request failed: {exc}") from exc

    @classmethod
    def fetch_video_info(cls, video_id: str) -> dict[str, str | int]:
        """Fetch video title/channel/statistics for dashboard summary."""
        youtube = cls._create_client()
        try:
            response = (
                youtube.videos()
                .list(
                    part="snippet,statistics",
                    id=video_id,
                )
                .execute()
            )
        except HttpError as exc:
            cls._handle_http_error(exc)

        items = response.get("items", [])
        if not items:
            raise ValueError("Video not found for this URL.")

        snippet = items[0].get("snippet", {})
        statistics = items[0].get("statistics", {})
        return {
            "title": str(snippet.get("title", "")),
            "description": str(snippet.get("description", "")),
            "channel": str(snippet.get("channelTitle", "")),
            "views": int(statistics.get("viewCount", 0) or 0),
            "likes": int(statistics.get("likeCount", 0) or 0),
            "total_comments": int(statistics.get("commentCount", 0) or 0),
        }

    @classmethod
    def fetch_comments(cls, video_id: str, max_results: int = 100) -> list[dict[str, str]]:
        """Fetch plain-text top-level comments and timestamps using YouTube Data API v3."""
        youtube = cls._create_client()
        comments: list[dict[str, str]] = []
        next_page_token = None

        try:
            while len(comments) < max_results:
                response = (
                    youtube.commentThreads()
                    .list(
                        part="snippet",
                        videoId=video_id,
                        maxResults=min(100, max_results - len(comments)),
                        textFormat="plainText",
                        pageToken=next_page_token,
                    )
                    .execute()
                )

                for item in response.get("items", []):
                    snippet = (
                        item.get("snippet", {})
                        .get("topLevelComment", {})
                        .get("snippet", {})
                    )
                    text = str(snippet.get("textDisplay", "")).strip()
                    published_at = str(snippet.get("publishedAt", "")).strip()
                    cleaned = text
                    if cleaned:
                        comments.append(
                            {
                                "text": cleaned,
                                "created_at": published_at,
                            }
                        )
                        if len(comments) >= max_results:
                            break

                next_page_token = response.get("nextPageToken")
                if not next_page_token:
                    break
        except HttpError as exc:
            cls._handle_http_error(exc)

        return comments

    @staticmethod
    def _derive_video_topic(title: str, description: str) -> str:
        text = (title or description or "").strip()
        if not text:
            return "General discussion"
        words = text.split()
        return " ".join(words[: min(8, len(words))])

    @classmethod
    def analyze_video_comments(cls, url: str) -> dict[str, object]:
        """Analyze YouTube comments sentiment and return frontend-ready payload."""
        video_id = cls.extract_video_id(url)
        if not video_id:
            raise ValueError("Invalid YouTube URL. Could not extract video ID.")

        video_info = cls.fetch_video_info(video_id=video_id)
        comments = cls.fetch_comments(video_id=video_id, max_results=100)

        sentiment_counts: Counter[str] = Counter()
        analyzed_comments: list[dict[str, str | float]] = []
        time_map: dict[str, dict[str, int]] = {}

        for comment in comments:
            text = str(comment.get("text", ""))
            created_at = str(comment.get("created_at", ""))
            analysis = SentimentService.analyze_text(text)
            sentiment = str(analysis["sentiment"])
            confidence = float(analysis["confidence"])

            sentiment_counts[sentiment] += 1
            analyzed_comments.append(
                {
                    "text": text,
                    "sentiment": sentiment,
                    "confidence": confidence,
                    "created_at": created_at,
                }
            )

            # Build day-level sentiment trend; skip invalid timestamps safely.
            if len(created_at) >= 10:
                date_key = created_at[:10]
                if date_key not in time_map:
                    time_map[date_key] = {"positive": 0, "negative": 0, "neutral": 0}
                if sentiment in time_map[date_key]:
                    time_map[date_key][sentiment] += 1

        positive_count = sentiment_counts.get("positive", 0)
        negative_count = sentiment_counts.get("negative", 0)
        if positive_count > negative_count:
            overall_opinion = "Audience response is mostly positive"
        elif negative_count > positive_count:
            overall_opinion = "Audience response is mostly negative"
        else:
            overall_opinion = "Mixed audience response"

        topic = cls._derive_video_topic(
            title=str(video_info.get("title", "")),
            description=str(video_info.get("description", "")),
        )
        sentiment_over_time = [
            {
                "date": date_key,
                "positive": counts["positive"],
                "negative": counts["negative"],
                "neutral": counts["neutral"],
            }
            for date_key, counts in sorted(time_map.items(), key=lambda item: item[0])
        ]

        return {
            "video_info": {
                "title": str(video_info.get("title", "")),
                "channel": str(video_info.get("channel", "")),
                "views": int(video_info.get("views", 0) or 0),
                "likes": int(video_info.get("likes", 0) or 0),
                "total_comments": int(video_info.get("total_comments", 0) or 0),
            },
            "sentiment_counts": {
                "positive": positive_count,
                "negative": negative_count,
                "neutral": sentiment_counts.get("neutral", 0),
            },
            "comments": analyzed_comments,
            "summary": {
                "video_topic": topic,
                "overall_public_opinion": overall_opinion,
            },
            "sentiment_over_time": sentiment_over_time,
        }

    @classmethod
    def analyze_youtube_video(cls, url: str) -> dict[str, object]:
        """Backward-compatible wrapper."""
        return cls.analyze_video_comments(url)
