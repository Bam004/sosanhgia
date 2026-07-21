from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.app.api.items import router as items_router
from backend.app.api.products import router as products_router
from backend.app.api.scraping import router as scraping_router
from backend.app.api.search import router as search_router
from backend.app.api.search_jobs import router as search_jobs_router
from backend.app.api.scrape import router as scrape_router
from backend.app.api.auth import router as auth_router
from backend.app.api.theo_doi_gia import router as theo_doi_gia_router
from backend.app.services.scheduled_scraping_runner import (
    bat_scheduler_cao_dinh_ky,
    tat_scheduler_cao_dinh_ky,
)
from backend.app.core.config import settings
from backend.app.api.admin_accounts import router as admin_accounts_router
from backend.app.api.admin_price_tracking import (
    router as admin_price_tracking_router,
)
from backend.app.api.admin_email_logs import (
    router as admin_email_logs_router,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    bat_scheduler_cao_dinh_ky()

    try:
        yield
    finally:
        await tat_scheduler_cao_dinh_ky()

app = FastAPI(
    title="SoSanhGia API",
    description="API cho website tổng hợp và so sánh giá sản phẩm",
    version="1.0.0",
    lifespan=lifespan,
)

default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

environment_origins = [
    origin.strip().rstrip("/")
    for origin in settings.CORS_ORIGINS.split(",")
    if origin.strip()
]

frontend_origin = settings.FRONTEND_URL.strip().rstrip("/")

allowed_origins = list(
    dict.fromkeys(
        default_origins
        + environment_origins
        + ([frontend_origin] if frontend_origin else [])
    )
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "error": str(exc),
        },
    )


app.include_router(items_router)
app.include_router(products_router)
app.include_router(scraping_router)
app.include_router(search_router)
app.include_router(search_jobs_router)
app.include_router(scrape_router)
app.include_router(auth_router)
app.include_router(theo_doi_gia_router)
app.include_router(admin_accounts_router)
app.include_router(admin_price_tracking_router)
app.include_router(admin_email_logs_router)

@app.get("/")
def root():
    return {
        "message": "SoSanhGia API",
        "version": "1.0.0",
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
    }
