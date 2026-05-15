"""Parallelism layer — concurrency primitives.

Hexagonal layer: technical foundation. Engines i orchestrators NIE używają
multiprocessing/asyncio bezpośrednio — przez te primitives.

Strategia dual-layer:
- asyncio (I/O concurrency) — WS connections, REST batched
- multiprocessing (CPU parallelism) — engines compute, backtest

Pliki:
- pool.py — ProcessPool wrapper (async-friendly)
- batch_executor.py — batched parallel operations
- stream_multiplexer.py — multiplex N WS streams → asyncio.Queue
- rate_limiter.py — token bucket dla REST APIs
"""
