"""ProcessPool wrapper — CPU parallelism, async-friendly.

Wraps concurrent.futures.ProcessPoolExecutor z asyncio integration.
Used dla CPU-bound work (engines compute, backtest).

Stub Fazy 0. Implementacja Faza 1.
"""

from __future__ import annotations

from typing import Any


class ProcessPool:
    """Process pool dla CPU-bound work, async-friendly.

    TODO Faza 1:
    - __init__: ProcessPoolExecutor max_workers
    - map_async(func, items): asyncio.gather over executor
    - shutdown()
    """

    def __init__(self, workers: int) -> None:
        self.workers = workers
        raise NotImplementedError("ProcessPool — implementacja w Fazie 1")

    async def map_async(self, func: Any, items: Any) -> list[Any]:
        raise NotImplementedError
