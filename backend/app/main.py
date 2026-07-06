from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.items import router as items_router
from backend.app.api.products import router as products_router
from backend.app.api.search import router as search_router
from backend.app.api.scrape import router as scrape_router
from backend.app.api.auth import router as auth_router
from backend.app.api.theo_doi_gia import router as theo_doi_gia_router


app = FastAPI(
    title="SoSanhGia API",
    description="Backend API for product price aggregation and comparison system",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request: Request,
    exc: RequestValidationError
):
    errors = exc.errors()
    first_error = errors[0] if errors else {}

    location = ".".join(
        str(part) for part in first_error.get("loc", [])
    )
    message = first_error.get("msg", "Invalid input")

    detail = f"{location}: {message}" if location else message

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "error": f"Validation failed: {detail}"
        }
    )


app.include_router(items_router)
app.include_router(products_router)
app.include_router(search_router)
app.include_router(scrape_router)
app.include_router(auth_router)
app.include_router(theo_doi_gia_router)


@app.get("/")
def root():
    return {
        "message": "SoSanhGia API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }