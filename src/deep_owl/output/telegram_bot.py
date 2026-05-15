"""Telegram bot — alerts + interactive komendy.

Library: python-telegram-bot v20+ (async-native).
Komendy: /start /help /signals /top /paper /backtest /listings /mute /tier.
Rate limit: 30 msg/s globalny + per-tier cooldown.

Stub Fazy 0. Implementacja Faza 6.
"""

from __future__ import annotations


class TelegramBot:
    def __init__(self, bot_token: str, chat_id: str) -> None:
        if not bot_token or not chat_id:
            raise ValueError("Telegram bot wymaga TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID")
        self.bot_token = bot_token
        self.chat_id = chat_id
        raise NotImplementedError("TelegramBot — implementacja w Fazie 6")
