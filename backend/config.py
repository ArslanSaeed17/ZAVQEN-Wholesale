import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Railway injects DATABASE_URL automatically when you add a Postgres plugin.
    database_url: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/zavqen")

    jwt_secret: str = os.getenv("JWT_SECRET", "change-this-in-railway-env-vars")
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    # comma-separated list, e.g. "https://zavqen.vercel.app,http://localhost:5500"
    cors_origins: str = os.getenv("CORS_ORIGINS", "*")

    # public base URL of THIS backend, used to build absolute image URLs
    # e.g. https://zavqen-backend.up.railway.app
    public_base_url: str = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")

    # your Vercel frontend URL, used to build the password-reset link that
    # gets emailed to users — e.g. https://zavqen.vercel.app
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5500")

    # set to "production" on Railway; controls whether verify/reset links
    # are echoed back in API responses (dev convenience) or only logged
    env: str = os.getenv("ENV", "development")

    # first account registered with this email is auto-promoted to admin
    # (simpler than a manual SQL command — set this in Railway env vars
    # to your own email before first registering)
    bootstrap_admin_email: str = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "")

    class Config:
        env_file = ".env"


settings = Settings()
