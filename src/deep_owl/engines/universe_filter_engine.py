"""Universe Filter Engine — łagodny filter dla universe builder (Faza 2).

Wyklucza: stablecoins, wrapped/synthetic, dead tokens, no CEX listing.
NIE filtruje aggressive cap (no market cap minimum, no age minimum).

Stub Fazy 0. Implementacja Faza 2.
"""

from __future__ import annotations

NAME = "universe_filter"


STABLECOIN_BLACKLIST = frozenset([
    "USDT", "USDC", "DAI", "FDUSD", "TUSD", "USDD", "PYUSD", "FRAX", "USDe", "USDS",
])
WRAPPED_BLACKLIST = frozenset([
    "WBTC", "WETH", "stETH", "weETH", "jupSOL", "jitoSOL", "cbETH", "LsETH",
])


def passes_filter(token: object) -> bool:
    raise NotImplementedError("universe_filter_engine.passes_filter — Faza 2")
