from pydantic import BaseModel
import os
from dotenv import load_dotenv   # ✅ 추가

# .env 파일 로드
load_dotenv()  # 같은 디렉토리에 .env 있으면 자동 로드됨

class Settings(BaseModel):
    ORACLE_DSN: str
    ORACLE_USER: str
    ORACLE_PASSWORD: str
    JWT_SECRET: str

def get_settings():
    return Settings(
        ORACLE_DSN=os.getenv('ORACLE_DSN', 'localhost:1521/XEPDB1'),
        ORACLE_USER=os.getenv('ORACLE_USER', 'lostfound'),
        ORACLE_PASSWORD=os.getenv('ORACLE_PASSWORD', 'secret'),
        JWT_SECRET=os.getenv('JWT_SECRET', 'change-me'),
    )
