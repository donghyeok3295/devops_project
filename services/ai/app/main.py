from dotenv import load_dotenv
load_dotenv()


from fastapi import FastAPI
from app.routers import rerank, health


app = FastAPI(title="AI Matcher /rerank API")

app.include_router(rerank.router)
app.include_router(health.router)

@app.get("/healthz")
def healthz():
    return {"status": "ok"}