"""DuckDB client wrapper.

Stub Fazy 0. Pelna implementacja Faza 1 (connection mgmt, schema apply, query helpers, migrations).

Hexagonal layer: core/db. Single point of contact dla DB operations.
"""

from __future__ import annotations

from pathlib import Path


class DuckDBClient:
    """Wrapper nad duckdb.connect() z lifecycle management.

    TODO Faza 1:
    - __enter__/__exit__ ctx manager
    - apply_schema() — read schema.sql i exec idempotent
    - run_migrations() — version-aware migration runner
    - query() / execute() helpers z parametrami
    - bulk_insert(table, arrow_table) — bulk arrow INSERT
    - backup() — EXPORT DATABASE before destructive ops
    """

    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        raise NotImplementedError("DuckDBClient — implementacja w Fazie 1")
