"""FastAPI application entrypoint."""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from routes.bluesky_analysis import router as bluesky_analysis_router
from routes.finance_analysis import router as finance_analysis_router
from routes.health import router as health_router
from routes.text_analysis import router as text_analysis_router
from routes.youtube_analysis import router as youtube_analysis_router
from utils.config import settings

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Server starting up: {settings.app_name} v{settings.app_version}")
    yield
    logger.info("Server shutting down")

app = FastAPI(
    title=settings.app_name, 
    version=settings.app_version,
    lifespan=lifespan
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        logger.info(
            f"API Call: {request.method} {request.url.path} - "
            f"Status: {response.status_code} - "
            f"Time: {process_time:.4f}s"
        )
        return response
    except Exception as exc:
        process_time = time.time() - start_time
        logger.error(
            f"API Error: {request.method} {request.url.path} - "
            f"Error: {str(exc)} - "
            f"Time: {process_time:.4f}s",
            exc_info=True
        )
        raise

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(text_analysis_router)
app.include_router(bluesky_analysis_router)
app.include_router(youtube_analysis_router)
app.include_router(finance_analysis_router)
