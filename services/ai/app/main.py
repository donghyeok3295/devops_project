from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import rerank, health, search

app = FastAPI(title="AI Matcher Rerank API", version="0.1.0")

# CORS 설정
# credentials 사용 시 "*" 불가, 명시적 오리진 필요
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # credentials 비활성화하여 "*" 허용
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router)
app.include_router(rerank.router)
app.include_router(health.router)

@app.get("/healthz")
def healthz():
    return {"status": "ok", "service": "ai-matcher"}
