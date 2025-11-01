from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import search

app = FastAPI(title='Smart Lost&Found API')

# CORS 설정 - 다른 PC의 프론트엔드에서 접근 가능하도록
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발: 모든 오리진 허용, 프로덕션: 특정 도메인만 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(search.router)

@app.get('/health')
def health():
    return {'status': 'ok'}
