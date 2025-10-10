from pydantic import BaseModel
import os

class Settings(BaseModel):
    ORACLE_DSN: str
    ORACLE_USER: str
    ORACLE_PASSWORD: str
    JWT_SECRET: str

def get_settings():
    return Settings(
        ORACLE_DSN=os.getenv('ORACLE_DSN','localhost:1521/FREEPDB1'),
        ORACLE_USER=os.getenv('ORACLE_USER','lostfound'),
        ORACLE_PASSWORD=os.getenv('ORACLE_PASSWORD','secret'),
        JWT_SECRET=os.getenv('JWT_SECRET','change-me'),
    )