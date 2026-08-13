from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./signal.db"
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 30
    mock_otp: str = "123456"
    frontend_origin: str = "https://scaler-sde.anuragmaurya.com"
    frontend_origins: str = (
        "http://localhost:3000,https://scaler-sde.anuragmaurya.com"
    )
    cookie_secure: bool = False
    cookie_samesite: str = "lax"

    def cors_origins(self) -> list[str]:
        raw = [self.frontend_origin, *self.frontend_origins.split(",")]
        return list(dict.fromkeys(item.strip().rstrip("/") for item in raw if item.strip()))

    s3_endpoint_url: str | None = None
    s3_bucket: str | None = None
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None
    s3_region: str = "auto"
    s3_public_base_url: str | None = None
    upload_max_bytes: int = 15 * 1024 * 1024


settings = Settings()
