import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    llm_base_url: str = os.getenv("LLM_BASE_URL", "http://localhost:1234/v1")
    llm_model: str = os.getenv("LLM_MODEL", "exaone-3.5-7.8b-instruct")
    llm_temperature: float = float(os.getenv("LLM_TEMPERATURE", "0.2"))
    llm_timeout_seconds: float = float(os.getenv("LLM_TIMEOUT_SECONDS", "10.0"))
    llm_api_key: str | None = os.getenv("LLM_API_KEY")

    ai_internal_token: str | None = os.getenv("AI_INTERNAL_TOKEN")

    # 규칙점수 파라미터
    sigma_km: float = float(os.getenv("SIGMA_KM", "1.0"))          # 거리 감쇠 표준편차(km)
    half_life_hours: float = float(os.getenv("HALF_LIFE_HOURS", "72"))  # 시간 감쇠 half-life(시간)

settings = Settings()
