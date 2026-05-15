"""DuckDB client wrapper.

Stub Fazy 0. Pelna implementacja Faza 1 (connection mgmt, schema apply, query helpers).
"""

from __future__ import annotations

from pathlib import Path


class DuckDBClient:
    """Wrapper nad duckdb.connect() z lifecycle management.

    TODO Faza 1:
    - __enter__/__exit__ ctx manager
    - apply_schema() — read schema.sql i exec idempotent
    - query() / execute() helpers z parametrami
    - migration runner (read _meta.schema_version, apply diffs)
    - backup() — copy file before destructive ops
    """

    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        # self._conn: duckdb.DuckDBPyConnection | None = None  # Faza 1
        raise NotImplementedError("DuckDBClient — implementacja w Fazie 1")
