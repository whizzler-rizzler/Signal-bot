"""Pydantic Settings — typed config z .env loading.

Stub Fazy 0. Pełna implementacja Faza 1.
"""

from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration. Override przez env vars (TRUMP yaml)."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="DEEPOWL_",
        case_sensitive=False,
        extra="ignore",
    )

    # === API keys (z env) ===
    coinmarketcap_api_key: str = Field(default="", description="CoinMarketCap API key (faza 2)")
    coingecko_api_key: str = Field(default="", description="CoinGecko Pro key (faza 2 opt)")
    telegram_bot_token: str = Field(default="", description="Telegram bot token (faza 6)")
    telegram_chat_id: str = Field(default="", description="Telegram chat id (faza 6)")

    # === Runtime ===
    db_path: Path = Field(default=Path("./data/deep_owl.duckdb"))
    log_level: str = Field(default="INFO")
    dashboard_port: int = Field(default=8001, ge=1024, le=65535)

    # === Parent integration ===
    parent_recorder_data_path: Path = Field(
        default=Path("D:/Crypto/Claude/data"),
        description="Read-only path to parent CEX recorder archives (faza 3 backtest)",
    )


def load_settings() -> Settings:
    """Load and validate settings. Raises ValidationError on bad config."""
    return Settings()
