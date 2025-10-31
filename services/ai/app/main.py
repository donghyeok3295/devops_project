from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from app.routers import rerank, health

app = FastAPI(title="AI Matcher Rerank API", version="0.1.0")

app.include_router(rerank.router)
app.include_router(health.router)

@app.get("/healthz")
def healthz():
    return {"status": "ok", "service": "ai-matcher"}
