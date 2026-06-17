from fastapi import FastAPI

app = FastAPI(
    title="SoSanhGia API",
    description="Backend API cho hệ thống tổng hợp và so sánh giá sản phẩm từ các sàn thương mại điện tử",
    version="1.0.0"
)

@app.get("/")
def read_root():
    return{
        "message":"Welcom to SoSanhGia API",
        "status": "running"
    }