from fastapi import FastAPI, Request
import uvicorn, json

app = FastAPI()

@app.post("/v1/chat/completions")
async def chat(req: Request):
    content = json.dumps(
        {"scores":[0.93,0.12], "reasons":["색/브랜드/장소 일치","불일치"]},
        ensure_ascii=False
    )
    return {"choices":[{"message":{"content":content}}]}

if __name__=="__main__":
    uvicorn.run(app, host="0.0.0.0", port=1234)
