"""Binance frame parsers — raw WS/REST → normalized models.

Hexagonal layer: connectors. ZERO biznesowej logiki — TYLKO mapping z raw shape do normalized.

Tests: golden fixtures (real frame samples → assert normalized output).

Stub Fazy 0. Implementacja Faza 3a.
"""

from __future__ import annotations

# Per-frame parsers dodawane w Faza 3a:
# - parse_kline_ws_frame(raw: dict) -> Kline
# - parse_mark_price_arr_frame(raw: list) -> list[FundingRate]
# - parse_open_interest_frame(raw: dict) -> OpenInterest
# - parse_force_order_frame(raw: dict) -> Liquidation
# - parse_kline_rest_response(raw: list) -> list[Kline]
