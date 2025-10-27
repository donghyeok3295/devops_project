# app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # --- LLM ---
    llm_base_url: str = Field("http://localhost:1234/v1", alias="LLM_BASE_URL")
    llm_api_key: str | None = Field(None, alias="LLM_API_KEY")
    llm_model: str = Field("gpt-4o-mini", alias="LLM_MODEL")
    llm_timeout_seconds: float = Field(5.0, alias="LLM_TIMEOUT_SECONDS")
    llm_retry: int = Field(1, alias="LLM_RETRY")

    # --- Rules / Pipeline ---
    sigma_km: float = Field(2.0, alias="SIGMA_KM")
    half_life_hours: float = Field(72.0, alias="HALF_LIFE_HOURS")
    topk_limit: int = Field(50, alias="TOPK_LIMIT")
    cache_ttl_seconds: int = Field(900, alias="CACHE_TTL_SECONDS")
    log_level: str = Field("INFO", alias="LOG_LEVEL")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",   # ← 추후 .env에 키 추가돼도 즉시 죽지 않게
    )

settings = Settings()
