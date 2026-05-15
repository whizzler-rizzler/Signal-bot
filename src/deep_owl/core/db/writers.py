"""Bulk INSERT pipeline (asyncio Queue → batched arrow → DuckDB).

Stub Fazy 0. Pelna implementacja Faza 3a (WS ingestion).

Hexagonal layer: core/db. Single writer pattern (1 process pisze, multi readers).
"""

from __future__ import annotations


class BulkWriter:
    """Pipeline async-friendly bulk INSERT.

    TODO Faza 3a:
    - asyncio.Queue z maxsize backpressure
    - flush trigger: 30s lub 1000 events
    - convert to arrow Table → DuckDB INSERT
    - retry on transient errors (DB locked)
    - graceful shutdown (drain queue before exit)
    """

    def __init__(self, table_name: str, batch_size: int = 1000, flush_interval_s: int = 30) -> None:
        self.table_name = table_name
        self.batch_size = batch_size
        self.flush_interval_s = flush_interval_s
        raise NotImplementedError("BulkWriter — implementacja w Fazie 3a")
