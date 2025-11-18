from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, rerank, preprocess

print("[BOOT] main loaded from:", __file__)

app = FastAPI(title="AI Matcher Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(rerank.router)
app.include_router(preprocess.router)

from app.routers import search
app.include_router(search.router)

@app.middleware("http")
async def log_request(request: Request, call_next):
    body = await request.body()
    print("📨 Incoming body:", body.decode("utf-8"))
    response = await call_next(request)
    return response
