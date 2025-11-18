from typing import Optional
from pydantic import BaseModel, Field, AliasChoices
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # .env 읽고(대소문자 무시), 정의하지 않은 값은 무시
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=False,
    )

    llm_use_json_schema: bool = True

    # ✅ 대문자/소문자 모두 매핑되도록 Alias 설정
    admin_token: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("ADMIN_TOKEN", "admin_token"),
    )
    ai_internal_token: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("AI_INTERNAL_TOKEN", "ai_internal_token"),
    )

    llm_base_url: str = Field(
        default="http://localhost:1234/v1",
        validation_alias=AliasChoices("LLM_BASE_URL", "llm_base_url"),
    )
    llm_model: str = Field(
        default="exaone-3.5-7.8b-instruct",
        validation_alias=AliasChoices("LLM_MODEL", "llm_model"),
    )
    llm_temperature: float = Field(
        default=0.2,
        validation_alias=AliasChoices("LLM_TEMPERATURE", "llm_temperature"),
    )
    llm_timeout_seconds: float = Field(
        default=30.0,
        validation_alias=AliasChoices("LLM_TIMEOUT_SECONDS", "llm_timeout_seconds"),
    )

    sigma_km: float = Field(
        default=2.0,
        validation_alias=AliasChoices("SIGMA_KM", "sigma_km"),
    )
    half_life_hours: float = Field(
        default=24.0,
        validation_alias=AliasChoices("HALF_LIFE_HOURS", "half_life_hours"),
    )

settings = Settings()

# ✅ FastAPI response_model 에 사용 가능한 Pydantic 모델
class ServiceInfo(BaseModel):
    status: str = "ok"
    service: str = "ai-matcher"
