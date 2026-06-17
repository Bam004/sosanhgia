from fastapi import FastAPI

app = FastAPI(
    title="SoSanhGia API",
    description="Backend API cho hệ thống tổng hợp và so sánh giá sản phẩm từ các sàn TMĐT",
    version="1.0.0"
)


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