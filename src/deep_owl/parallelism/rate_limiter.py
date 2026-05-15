"""Rate limiter — token bucket dla per-CEX REST APIs.

Used przez REST connectors w Faza 3b.

Stub Fazy 0. Implementacja Faza 1 (foundation).
"""

from __future__ import annotations

import asyncio


class TokenBucketRateLimiter:
    """Token bucket dla per-CEX REST rate limits.

    TODO Faza 1:
    - __init__(rate_per_second, burst): initial tokens, refill rate
    - acquire(n=1): wait if not enough tokens, decrement
    - asyncio.Lock dla thread safety
    """

    def __init__(self, rate_per_second: float, burst: int) -> None:
        self.rate = rate_per_second
        self.burst = burst
        self.lock = asyncio.Lock()
        raise NotImplementedError("TokenBucketRateLimiter — implementacja w Fazie 1")

    async def acquire(self, n: int = 1) -> None:
        raise NotImplementedError
