# services/ai/app/main.py

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import rerank, health, search

app = FastAPI(
    title="AI Matcher Rerank API",
    version="0.1.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # 프론트 어디든 허용
    allow_credentials=False,      # "*" 사용 위해 False 유지
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(search.router)
app.include_router(rerank.router)    # ← 매칭 엔진 호출 API
app.include_router(health.router)

@app.get("/healthz")
def healthz():
    return {
        "status": "ok",
        "service": "ai-matcher",
        "version": "0.1.0"
    }
