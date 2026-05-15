"""DuckDB storage layer.

Hexagonal core: jedyna warstwa rozmawiająca z DuckDB. Engines i processors
NIGDY nie wykonują queries bezpośrednio — używają orchestrator/repository pattern.
"""
