# TECH_STACK — Deep Owl

> Deep dive na stack technologiczny + uzasadnienia wyborów + parallelism strategy.

## Spis treści

1. [Overview](#1-overview)
2. [Język i runtime](#2-j%C4%99zyk-i-runtime)
3. [Concurrency & Parallelism](#3-concurrency--parallelism)
4. [Storage layer](#4-storage-layer)
5. [Data ingestion (WS + REST)](#5-data-ingestion)
6. [Data processing](#6-data-processing)
7. [API framework](#7-api-framework)
8. [Configuration](#8-configuration)
9. [Logging & observability](#9-logging--observability)
10. [Testing](#10-testing)
11. [Linting & type checking](#11-linting--type-checking)
12. [Co NIE używamy (świadome decyzje)](#12-co-nie-u%C5%BCywamy)
13. [Dependency table](#13-dependency-table)

---

## 1. Overview

```
┌──────────────────────────────────────────────────────────────┐
│  Język:       Python 3.11+                                   │
│  Concurrency: asyncio (I/O) + multiprocessing (CPU)          │
│  Storage:     DuckDB (embedded, columnar)                    │
│  WS:          websockets v12+                                │
│  REST:        aiohttp + tenacity                             │
│  Validation:  Pydantic v2                                    │
│  API:         FastAPI + uvicorn                              │
│  Frontend:    Jinja2 + HTMX + Plotly                         │
│  Testing:     pytest + pytest-asyncio + pytest-cov           │
│  Linting:     ruff + mypy strict                             │
└──────────────────────────────────────────────────────────────┘
```

Filozofia: **boring tech, proven libs, brak hype-driven choices.** Każdy wybór ma uzasadnienie — patrz sekcje poniżej.

---

## 2. Język i runtime

### 2.1 Python 3.11+

**Wybór:** Python 3.11 minimum, target 3.12.

**Dlaczego Python:**
- ✅ Match parent stack (`D:\Crypto\Claude\` używa Python 3.11+)
- ✅ Najbogatszy ekosystem dla quant finance (pandas, numpy, statsmodels)
- ✅ Async-native (asyncio) — krytyczne dla WS-first architecture
- ✅ Pydantic v2 dla type-safe configs (Rust-backed performance)
- ✅ Solo dev velocity > absolute perf

**Dlaczego 3.11+ (nie starsze):**
- TaskGroup (lepszy structured concurrency niż asyncio.gather)
- ExceptionGroup (multiple errors handling z asyncio)
- ~25% faster startup vs 3.10
- Better error messages (kluczowe przy debugging WS issues)
- `Self` type hint (cleaner Pydantic models)

**Dlaczego NIE Rust/Go:**
- Rust: solo dev velocity 3-5x niższy, brak quant ecosystem porównywalny do numpy/pandas
- Go: brak natywnego async iteratorów (channels są inne paradygm), słabszy quant ecosystem

**Co kompromitujemy:** absolute throughput. Ale dla naszej skali (~4000 tokens × 5m candles = ~13MB/h ingestion) Python wystarczy. Bottleneck to API rate limits, nie CPU.

### 2.2 Type checking — strict mode

**mypy strict** = każdy parameter, każdy return value MUSI mieć type hint. Krytyczne dla skalowania kodu (3 moduły, dziesiątki engines, setki connectors entry points).

```toml
[tool.mypy]
strict = true
warn_unused_ignores = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
no_implicit_optional = true
```

**Dlaczego strict:**
- Pre-commit catches 80% dumb bugs (None where int expected, missed return path)
- Dokumentacja w kodzie (type signatures lepsze niż docstrings dla shape API)
- Refactoring safety (mypy złapie consumer breakage)

---

## 3. Concurrency & Parallelism

**Strategy:** **dual-layer concurrency** — asyncio dla I/O-bound, multiprocessing dla CPU-bound. Ray jako optional w Faza 7+ jeśli scale-out wymusi.

### 3.1 asyncio — I/O concurrency

**Use cases:**
- 4× WebSocket connections per CEX (każda w osobnym Task)
- Bulk REST backfill (10-50 concurrent requests per CEX z rate limit awareness)
- Telegram bot (event loop)
- FastAPI dashboard (uvicorn worker)

**Pattern:**

```python
import asyncio

async def main():
    async with asyncio.TaskGroup() as tg:
        for cex in ["binance", "bybit", "okx", "coinbase"]:
            tg.create_task(run_ws_connector(cex))
        tg.create_task(run_orchestrator())
        tg.create_task(run_dashboard())
    # All tasks managed structured (cleanup on cancel)

asyncio.run(main())
```

**Dlaczego TaskGroup (Python 3.11+) zamiast `asyncio.gather`:**
- Structured concurrency: cancel propaguje cleanly
- ExceptionGroup: wszystkie failed tasks raised together (vs gather która gubi exceptions)
- Cleaner error handling

### 3.2 multiprocessing — CPU parallelism

**Use cases:**
- Module 1 scoring full universe (4000 tokens × 7 engines każdy 50ms = 1400s sequential, ~15s na 16 procesach)
- Backtest parallel (4000 tokens × walk-forward × 4 strategies = embarrassingly parallel)
- Aggregation/processing (numpy vectorized + multiprocessing dla per-token granularity)

**Pattern (process pool):**

```python
from multiprocessing import Pool
import numpy as np

def score_token_chunk(tokens_chunk: list[Token]) -> list[Signal]:
    """Pure compute — no I/O. Each worker process imports engines + computes."""
    return [score_token(t) for t in tokens_chunk]

def score_universe_parallel(universe: list[Token], n_workers: int = 16) -> list[Signal]:
    chunks = np.array_split(universe, n_workers)
    with Pool(n_workers) as pool:
        results = pool.map(score_token_chunk, chunks)
    return [s for chunk_signals in results for s in chunk_signals]
```

**Dlaczego multiprocessing zamiast threading:**
- GIL — Python threading ma GIL, NIE daje true CPU parallelism dla compute-heavy code
- Multiprocessing forkuje processes — każdy ma własny GIL, true parallelism

**Trade-offs multiprocessing:**
- Overhead startupu workerów (~100-500ms per worker init)
- IPC cost (pickle/unpickle danych) — minimalizujemy przez chunking
- Memory: każdy worker dostaje copy globalnego state

### 3.3 numpy vectorization — first level

**Zanim sięgniesz po multiprocessing — vectorize numpy.**

```python
# Zamiast loop per token:
scores = []
for kline in klines:  # 1000 iteracji
    scores.append((kline.close - kline.open) / kline.open)

# Vectorize:
scores = (closes - opens) / opens  # numpy single op, 100x szybsze
```

**Pattern dla engines:**
- Engine input: numpy arrays (NIE list[Pydantic])
- Engine compute: vectorized operations
- Engine output: scalar lub mała struktura

### 3.4 DuckDB parallel queries

DuckDB ma built-in **parallel query execution** (multi-threaded scans, parallel hash joins, parallel sorts). Bez setup — automatyczne.

**Pattern:**
```python
# Single query — DuckDB sam paraleluje pod hood
df = conn.execute("""
    SELECT symbol, AVG(volume_quote) as avg_vol
    FROM klines_5m
    WHERE ts > NOW() - INTERVAL 7 DAY
    GROUP BY symbol
""").fetch_df_chunk()  # streaming chunks
```

**Bonus:** DuckDB integruje się z Pandas/Polars/Arrow — zero copy gdy potrzebujemy.

### 3.5 Ray (opt, Faza 7+)

**Kiedy rozważyć:**
- Backtest universe rośnie do 50,000+ tokenów
- Distributed compute multi-node (GPU? cluster?)
- ML model training (jeśli kiedyś dodamy)

**Dlaczego NIE w Faza 0-6:**
- Dla solo dev na 1 maszynie multiprocessing wystarczy
- Ray ma steep learning curve, overhead setupu
- Premature optimization

### 3.6 Parallelism per layer

| Layer | Mechanizm | Granularity |
|---|---|---|
| Connectors (WS) | asyncio TaskGroup | 1 task per connection (~9 total) |
| Connectors (REST backfill) | asyncio Semaphore + tenacity | N concurrent requests, rate-limit aware |
| Processors (numerical) | numpy vectorize | per-token vectorized ops |
| Processors (text) | multiprocessing pool | parallel per-document |
| Engines (Module 1 scoring) | multiprocessing Pool | chunks of universe |
| Engines (Backtest) | multiprocessing Pool | parallel per-token × per-strategy |
| Storage writes | asyncio Queue + bulk INSERT | batched, single writer |

---

## 4. Storage layer

### 4.1 DuckDB (primary)

**Wybór:** DuckDB embedded (file-based, single binary).

**Dlaczego DuckDB:**
- ✅ **Columnar storage** — krytyczne dla time-series queries (aggregate volume across 5000 tokens × millions of klines)
- ✅ **Embedded** — brak serwera, brak network overhead, 1-file backup
- ✅ **Parallel queries** built-in (multi-threaded scans, hash joins)
- ✅ **Pandas/Arrow zero-copy** integration
- ✅ **Parquet partitioning** (cold storage tier dla danych >90d)
- ✅ **SQL standard** (ANSI SQL + extensions, krzywa uczenia minimalna)
- ✅ **Concurrent reads, single writer** — wystarcza dla nasz use case (1 ingester process writes, dashboard + scorer reads)
- ✅ **Free, open source** (MIT license)

**Trade-offs:**
- ⚠️ Single writer w danym czasie — multi-writer wymaga external coordinator (nie potrzebujemy w MVP)
- ⚠️ No replication out-of-the-box — backup = file copy
- ⚠️ < 100GB sweet spot per file — przy >100GB partition by month

### 4.2 Parquet (cold storage)

**Use:** archiwizacja klines starszych niż 90 dni → parquet files w `data/archive/{year}/{month}/`.

**Pattern:**
```python
# Co 90 dni:
conn.execute("""
    COPY (SELECT * FROM klines_5m WHERE ts < NOW() - INTERVAL 90 DAY)
    TO 'data/archive/2026/01/klines_5m.parquet' (FORMAT PARQUET, COMPRESSION 'zstd')
""")
conn.execute("DELETE FROM klines_5m WHERE ts < NOW() - INTERVAL 90 DAY")
```

**Dla queries na archiwum:**
```python
conn.execute("""
    SELECT * FROM read_parquet('data/archive/**/*.parquet')
    WHERE symbol = 'BTCUSDT' AND ts BETWEEN '2024-01-01' AND '2024-06-30'
""")
```

DuckDB transparently reads parquet — zero migration overhead.

### 4.3 In-memory buffer (asyncio Queue)

**Use:** WS frame buffering przed bulk INSERT do DuckDB.

```python
buffer: asyncio.Queue[Kline] = asyncio.Queue(maxsize=100_000)

# Producer (WS handler):
async def on_ws_frame(frame):
    kline = parse_frame(frame)
    await buffer.put(kline)

# Consumer (DB writer):
async def db_writer():
    batch = []
    while True:
        try:
            kline = await asyncio.wait_for(buffer.get(), timeout=30)
            batch.append(kline)
            if len(batch) >= 1000:
                await flush_batch(batch)
                batch = []
        except asyncio.TimeoutError:
            if batch:
                await flush_batch(batch)
                batch = []
```

**Backpressure:** `maxsize=100_000` — gdy DuckDB writes spowalniają, WS handlers blokują (await put). Lepsze niż OOM.

### 4.4 NIE używamy

- ❌ **Postgres / MySQL** — overhead serwera, nie potrzebujemy multi-writer ACID, columnar query speed Postgres słaby (no built-in columnar w community version)
- ❌ **SQLite** — row-oriented, słaby dla analytics queries, no parallel scans
- ❌ **Redis** — DuckDB + asyncio Queue wystarczą do scale ~1M ops/s
- ❌ **MongoDB** — schemaless = chaos przy strukturalnych time-series
- ❌ **InfluxDB / TimescaleDB** — dedykowane time-series ale: InfluxDB ma quirky query lang (Flux), Timescale wymaga Postgres setup. DuckDB columnar daje 80% benefits bez setup.
- ❌ **Kafka / RabbitMQ** — overengineering dla solo dev monolith

---

## 5. Data ingestion

### 5.1 WebSocket — `websockets` library

**Wybór:** `websockets >= 12, < 14`

**Dlaczego:**
- Async-native (asyncio integration)
- Battle-tested (pierwsze stable >2014)
- Zero-dependency (wbudowany w Python ekosystem)
- Reconnect lifecycle helpers built-in

**Alternative considered:**
- ❌ `aiohttp.WSClient` — działa ale ma więcej boilerplate dla reconnect
- ❌ `websocket-client` — synchronous, NIE pasuje do asyncio
- ❌ `socketio` — overkill (Socket.IO protocol wrap, my potrzebujemy raw WS)

**Pattern:**
```python
import websockets
from tenacity import retry, wait_exponential, stop_after_attempt

@retry(wait=wait_exponential(min=1, max=60), stop=stop_after_attempt(100))
async def ws_connect_loop(url: str, on_frame):
    async with websockets.connect(url, ping_interval=20, ping_timeout=10) as ws:
        async for frame in ws:
            await on_frame(frame)
```

### 5.2 REST — `aiohttp` + `tenacity`

**Wybór:** `aiohttp >= 3.9` (HTTP client) + `tenacity >= 8.2` (retry/backoff)

**Dlaczego aiohttp:**
- Async-native, integrates perfectly z asyncio
- Connection pooling built-in
- Streaming responses (krytyczne dla bulk klines pulls)

**Dlaczego tenacity:**
- Declarative retry decorators (clean code)
- Exponential backoff out of box
- Rate limit aware (custom wait strategies)

**Alternative considered:**
- ❌ `httpx` — popularniejsza alternative, podobna funkcjonalność, ale aiohttp ma lepszy track record dla WS-adjacent workloads
- ❌ `requests` — synchronous, killer dla async architecture

### 5.3 RSS — `feedparser`

**Wybór:** `feedparser >= 6.0` dla Binance Announcements RSS.

**Dlaczego:**
- Default Python RSS lib od 2002
- Zero-config, parse RSS/Atom/JSON Feed
- Małe footprint

---

## 6. Data processing

### 6.1 Numerical — `numpy` + `pyarrow`

**Wybór:**
- `numpy >= 1.26, < 3` — vectorized math
- `pyarrow >= 14, < 22` — columnar interchange (DuckDB ↔ pandas zero-copy)

**Dlaczego oba:**
- numpy dla in-memory compute (rolling stats, sigmoid normalization, weighted sums)
- pyarrow dla data movement (DuckDB → numpy → engines → DuckDB)
- DuckDB native arrow integration = zero serialization overhead

**Pattern:**
```python
import numpy as np

# DuckDB → arrow → numpy (zero copy)
arrow_table = conn.execute("SELECT volume_quote FROM klines_5m WHERE symbol = ?", [symbol]).arrow()
volumes_np = arrow_table['volume_quote'].to_numpy()

# Vectorized compute
rolling_avg = np.convolve(volumes_np, np.ones(20) / 20, mode='valid')
```

### 6.2 Pandas — TYLKO w reports/notebooks

**Wybór:** `pandas >= 2.2, < 3` (w `requirements-dev.txt`, NIE w `requirements.txt`)

**Dlaczego ograniczone:**
- Pandas jest convenient ale slower niż numpy/arrow dla hot path
- Pandas w hot path = źle (memory overhead, slow indexing)
- W reports/HTML generators, ad-hoc analyses — OK

**Hard rule:** żaden engine NIE używa pandas. Tylko `output/dashboard.py` może (dla rendering).

### 6.3 Polars — rozważone, NIE wybrane

Polars jest faster niż pandas (Rust-backed, lazy evaluation). Ale:
- Mniejsza społeczność, mniej Stack Overflow
- DuckDB + numpy daje 80% same benefits z standardowymi libs
- Nadkład learn (dla solo dev nowy język semantyczny)

Może w v2 jeśli ewident benefit.

### 6.4 Text/NLP — minimum viable

**Sentiment analysis:** parent `Social_media_scanner` ma już sentiment classifier. NIE duplikujemy.

**RSS parsing:** feedparser + manual extraction.

**Brak custom NLP libs (spaCy, transformers) w Faza 0-6.** Nadmiar dla scope. Może v2.

---

## 7. API framework

### 7.1 FastAPI

**Wybór:** `fastapi >= 0.110, < 1` + `uvicorn[standard] >= 0.27, < 1`

**Dlaczego:**
- Match parent stack (`D:\Crypto\Claude\analyzer\server.py` uses it)
- Async-native (kompatybilne z asyncio orchestrator)
- Automatic OpenAPI docs (free `/docs` endpoint)
- Pydantic-based request/response validation
- Type hints driven (mypy friendly)

**Alternative considered:**
- ❌ Flask — synchronous, źle pasuje do asyncio
- ❌ Django REST Framework — overkill dla solo dev tool
- ❌ Sanic, Quart — niche, mała społeczność

### 7.2 Frontend — Jinja2 + HTMX + Plotly

**Wybór:**
- `jinja2 >= 3.1, < 4` — templating
- HTMX (CDN, no npm) — server-side rendering z partial updates
- `plotly >= 5.20, < 7` — interactive charts

**Dlaczego anti-SPA:**
- Solo dev tool (1 user — ja). Nie potrzeba React/Vue/Svelte
- Server-side rendering = no JS build chain
- HTMX daje 80% reactivity SPA z 5% complexity
- Plotly self-contained chart rendering, brak dodatkowych libs

**Co tracimy:** mobile-friendly experience. Ale to local-only tool, bind 127.0.0.1 — mobile irrelevant.

---

## 8. Configuration

### 8.1 Pydantic Settings + .env

**Wybór:** `pydantic-settings >= 2.2, < 3`

**Dlaczego:**
- Type-safe config (mypy widzi shape config struct)
- .env loading (12-factor app)
- Validation at startup (fail fast, nie at runtime usage)
- Config nesting (universe, websocket, module1, module2, module3 — separate sub-configs)

**Pattern:**
```python
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Module1Config(BaseSettings):
    scoring_interval_min: int = 5
    weights: dict[str, float] = Field(default_factory=lambda: {"volume_rising": 0.20, ...})
    tier_thresholds: dict[int, dict] = Field(default_factory=dict)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="DEEPOWL_", case_sensitive=False)

    db_path: Path = Path("./data/deep_owl.duckdb")
    coinmarketcap_api_key: str = ""
    module1: Module1Config = Module1Config()
```

### 8.2 YAML overlay

Złożone configs (filter sets dla Module 3) w `config.yaml` (gitignored, defaults w `config.example.yaml`):

```yaml
module3_new_listings:
  filter_sets:
    - name: conservative
      enabled: true
      min_market_cap_usd: 10000000
      ...
```

Loaded via PyYAML → merged z Pydantic Settings.

---

## 9. Logging & observability

### 9.1 structlog + stdlib logging

**Wybór:** `structlog >= 24.1, < 26` (structured) + stdlib `logging` (standard)

**Dlaczego:**
- Structured logs = JSON output → parse-able przez dashboard, ELK, Grafana
- Context propagation (np. `with structlog.contextvars.bound_contextvars(connection_id="binance_spot_1"): ...`)
- Performance: structlog zero-copy gdy logs disabled

**Pattern:**
```python
import structlog

log = structlog.get_logger()

log.info("ws_frame_received", exchange="binance", symbol="BTCUSDT", frame_type="kline_5m", lag_ms=12)
# Output (JSON): {"event": "ws_frame_received", "exchange": "binance", ...}
```

### 9.2 Metrics — TYLKO w Faza 6+

W Faza 0-6: structured logs + DuckDB queries dla post-hoc analysis. **Brak Prometheus/Grafana w MVP.**

W Faza 7+ (jeśli go-live):
- Prometheus exporter (pull metrics z `ws_status` table)
- Grafana dashboard (read-only z DuckDB)
- Alertmanager dla disconnect storms

---

## 10. Testing

### 10.1 pytest stack

**Wybór:**
- `pytest >= 8.0, < 10` — runner
- `pytest-asyncio >= 0.23, < 2` — async tests
- `pytest-cov >= 4.1, < 7` — coverage
- `pytest-mock >= 3.12, < 4` — mocking
- `aioresponses >= 0.7, < 1` — mock aiohttp responses

**Coverage target:** **80% per hot path** (engines, processors, connectors). Output layer (dashboard, telegram) niższy target — UI testing trudniejsze.

**Test pyramid:**
- 70% unit (engines, processors — pure logic, mocked input)
- 25% integration (connectors → DB write paths, REST sanity reconcile)
- 5% end-to-end (CLI commands, full pipeline smoke tests)

### 10.2 Test patterns per layer

**Connectors:** mock HTTP/WS responses (aioresponses + custom WS mock server)
**Processors:** golden fixtures (input → known output)
**Engines:** unit tests z mocked DuckDB cursor (sample klines arrays)
**Orchestrator:** integration z in-memory DuckDB
**Output:** smoke tests (renders bez errorów, response 200)

### 10.3 Property-based testing — opcjonalnie

`hypothesis >= 6.0` może być dodane w Fazie 4+ dla strategy backtests (random klines → invariants check).

---

## 11. Linting & type checking

### 11.1 ruff

**Wybór:** `ruff >= 0.4, < 1` — linter + formatter w jednym

**Dlaczego ruff (nie black + flake8 + isort):**
- 10-100x szybszy (Rust-backed)
- Wszystko w jednym tool (formatter, linter, isort)
- Active development, najnowsze rules
- Match parent stack standard

**Konfiguracja:**
```toml
[tool.ruff.lint]
select = ["E", "W", "F", "I", "B", "C4", "UP", "SIM", "RUF"]
ignore = ["E501"]  # line too long handled by formatter
```

### 11.2 mypy strict

(patrz sekcja 2.2)

### 11.3 pre-commit hooks

```yaml
repos:
  - repo: local
    hooks:
      - id: ruff-check
        entry: ruff check --fix
      - id: ruff-format
        entry: ruff format
      - id: mypy
        entry: mypy src/deep_owl
        pass_filenames: false
      - id: pytest
        entry: pytest -x -q --timeout=10
        stages: [pre-push]
```

Pre-commit: ruff + mypy (fast). Pre-push: pytest (slower, full).

---

## 12. Co NIE używamy

| Tool | Dlaczego NIE |
|---|---|
| **Postgres / MySQL** | Overhead serwera, nie potrzeba multi-writer |
| **Redis** | DuckDB + asyncio Queue wystarczą |
| **Kafka / RabbitMQ** | Overengineering dla solo dev monolith |
| **Docker (Faza 0-6)** | Lokalne dev wystarczy; może w Faza 7+ jeśli deploy |
| **Kubernetes** | Overkill na zawsze (single-node deployment) |
| **React / Vue / Svelte** | Jinja2 + HTMX wystarczą dla solo dev tool |
| **Pandas w hot path** | Slower niż numpy/arrow, nadmiar memory |
| **Polars** | DuckDB + numpy daje 80% benefits, mniej learn |
| **Web3.py / ethers** | DEX interactions out of scope |
| **Solana web3** | Solana on-chain out of scope |
| **InfluxDB / TimescaleDB** | DuckDB columnar wystarczy, no extra infra |
| **Ray (Faza 0-6)** | Multiprocessing wystarczy; może Faza 7+ jeśli scale-out |
| **transformers / spaCy** | NLP custom out of scope; reuse parent scanner |
| **Celery / RQ** | Asyncio TaskGroup + multiprocessing pool wystarczą |

---

## 13. Dependency table

### 13.1 Runtime (`requirements.txt`)

| Package | Version | Purpose |
|---|---|---|
| `aiohttp` | >=3.9, <4 | HTTP client (REST adapters) |
| `tenacity` | >=8.2, <10 | Retry with exponential backoff |
| `websockets` | >=12, <14 | WebSocket client (PRIMARY data layer) |
| `feedparser` | >=6.0, <7 | RSS parser (Binance Announcements) |
| `duckdb` | >=1.0, <2 | Embedded analytics DB |
| `numpy` | >=1.26, <3 | Vectorized math |
| `pyarrow` | >=14, <22 | Columnar interchange (DuckDB ↔ numpy) |
| `pydantic` | >=2.6, <3 | Type-safe models |
| `pydantic-settings` | >=2.2, <3 | Config + .env loading |
| `pyyaml` | >=6.0, <7 | YAML config overlay |
| `fastapi` | >=0.110, <1 | API framework (dashboard) |
| `uvicorn[standard]` | >=0.27, <1 | ASGI server |
| `jinja2` | >=3.1, <4 | Dashboard templates |
| `python-telegram-bot` | >=20.7, <22 | Telegram bot (Faza 6) |
| `structlog` | >=24.1, <26 | Structured logging |
| `zstandard` | >=0.22, <1 | Read parent recorder zst archives |
| `click` | >=8.1, <9 | CLI |
| `rich` | >=13.7, <15 | Pretty terminal output |

### 13.2 Dev (`requirements-dev.txt`)

| Package | Version | Purpose |
|---|---|---|
| `pytest` | >=8.0, <10 | Test runner |
| `pytest-asyncio` | >=0.23, <2 | Async test support |
| `pytest-cov` | >=4.1, <7 | Coverage |
| `pytest-mock` | >=3.12, <4 | Mocking |
| `aioresponses` | >=0.7, <1 | Mock aiohttp responses |
| `ruff` | >=0.4, <1 | Linter + formatter |
| `mypy` | >=1.9, <2 | Type checker |
| `pre-commit` | >=3.6, <5 | Git hooks |
| `plotly` | >=5.20, <7 | Charts (reports) |
| `pandas` | >=2.2, <3 | Reports/notebooks ONLY (NIE hot path) |

### 13.3 Pin strategy

- **Major versions pinned** (`>=2.6, <3`) — łapie patches/minors automatycznie ale chroni przed breaking changes
- **Bump deliberately** — quartely audit, nie auto-upgrade
- **Lock file:** `pip-compile` z `pip-tools` dla `requirements.lock` (Faza 1+)
