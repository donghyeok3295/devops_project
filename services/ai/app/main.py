from fastapi import FastAPI

app = FastAPI(title='Smart Lost&Found AI')

@app.post('/rerank')
def rerank():
    # TODO: 규칙 점수 기반 후보 N개 + LLM rerank 반환
    return {'items': []}