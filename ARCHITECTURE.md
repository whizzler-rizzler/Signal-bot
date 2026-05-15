# ARCHITECTURE — Deep Owl

> **Single source of truth** dla architektury systemu. Hexagonal architecture z żelazną separacją connectors / processors / engines / orchestrator.

## Spis treści

1. [Filozofia — hexagonal architecture](#1-filozofia)
2. [Layered architecture (6 layers)](#2-layered-architecture)
3. [Connectors layer (per source)](#3-connectors-layer)
4. [Processors layer (per data type)](#4-processors-layer)
5. [Engines layer (per signal)](#5-engines-layer)
6. [Orchestrator layer](#6-orchestrator-layer)
7. [Parallelism layer](#7-parallelism-layer)
8. [Output layer](#8-output-layer)
9. [Data flow end-to-end](#9-data-flow)
10. [Module 1 / 2 / 3 mapping](#10-modules-mapping)
11. [Decyzje i tradeoffs](#11-decyzje)
12. [Skala i performance](#12-skala)

---

## 1. Filozofia

### 1.1 Top of the top — żelazna separacja

Deep Owl używa **hexagonal architecture** (znaną też jako "Ports & Adapters", Alistair Cockburn 2005) — strict separation między:

- **I/O layer** (connectors) — komunikacja z external world
- **Transformation layer** (processors) — surowe dane → znormalizowane przygotowane do compute
- **Computation layer** (engines) — pure logic, NIE I/O, NIE DB
- **Orchestration layer** — combinuje engines w pipelines, decyduje parallelism

Każda warstwa zna TYLKO warstwy poniżej. **Engine NIGDY nie wywołuje API.** **Connector NIGDY nie liczy biznesowej metryki.** **Processor NIGDY nie zapisuje do DB.**

### 1.2 Dlaczego hexagonal

**Problem klasycznego monolitu:**
```python
def detect_accumulation(token_symbol):
    # I/O
    klines = binance_client.get_klines(token_symbol, "5m")
    funding = binance_client.get_funding(token_symbol)
    # Transformation
    avg_volume = sum(k.volume for k in klines[-20:]) / 20
    # Logic
    score = calculate_score(klines, funding, avg_volume)
    # I/O
    db.insert(score)
    telegram.alert(score)
```

To violation hexagonal. Niemożliwe testować bez prawdziwego Binance + DB + Telegram. Refactoring jednej warstwy łamie wszystko.

**Hexagonal pattern:**
```python
# Connector: tylko I/O
async def binance_klines(symbol: str) -> list[Kline]:
    return await binance_client.get_klines(symbol)

# Processor: tylko transform
def compute_volume_profile(klines: list[Kline]) -> VolumeProfile:
    return VolumeProfile(rolling_avg=numpy_avg(klines, 20))

# Engine: pure logic
def volume_rising_engine(profile: VolumeProfile, current_kline: Kline) -> float:
    ratio = current_kline.volume / profile.rolling_avg
    return sigmoid(ratio - 2.0)  # 0..1

# Orchestrator: combine
async def score_token(symbol: str) -> Signal:
    klines = await binance_klines(symbol)
    profile = compute_volume_profile(klines)
    score = volume_rising_engine(profile, klines[-1])
    # Persist via separate writer
    return Signal(token=symbol, score=score)
```

**Korzyści:**
- ✅ Test każdą warstwę osobno (mocked input, no I/O)
- ✅ Wymień connector bez zmiany engines (Binance → Bybit)
- ✅ Dodaj nowy engine bez zmiany infrastruktury
- ✅ Parallelize engines niezależnie (każdy w własnym process)

### 1.3 Niezależność engines — KRYTYCZNE

**Reguła:** każdy engine MUSI być uruchamialny SAM, z mocked input, bez DB i bez API. Test:

```python
# Test każdego engine — NIE potrzebuje DB ani API:
def test_volume_rising_engine():
    profile = VolumeProfile(rolling_avg=100.0)
    current = Kline(volume_base=250.0, ...)  # 2.5x avg
    score = volume_rising_engine(profile, current)
    assert 0.7 < score < 0.9  # sigmoid(0.5) ~= 0.62, sigmoid(2.5) ~= 0.92

# Engine NIE ma żadnego import z connectors/ ani db/
```

Engines są **NIE wpinalne automatycznie do pipeline'u** — orchestrator decyduje który engine kiedy uruchomić, jak je sparallelizować, jak agregować outputs.

---

## 2. Layered architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                          │
│  CLI (deep-owl)  │  FastAPI Dashboard  │  Telegram Bot          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                      ORCHESTRATOR LAYER                          │
│  Module 1 Orchestrator (combines 7 engines)                      │
│  Module 2 Orchestrator (backtest pipeline)                       │
│  Module 3 Orchestrator (new listings detector)                   │
│  Pipeline executor (parallel coordination)                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐
│  ENGINES       │    │  PROCESSORS     │    │  PARALLELISM    │
│  (pure logic)  │    │  (transform)    │    │  (concurrency)  │
│                │    │                 │    │                 │
│  volume_       │    │  numerical/     │    │  asyncio        │
│  funding_      │    │  timeseries/    │    │  multiprocess   │
│  oi_           │    │  text/          │    │  pool           │
│  cross_ex_     │    │  events/        │    │  batch_executor │
│  liquidation_  │    │                 │    │                 │
│  social_       │    │                 │    │                 │
│  bid_ask_      │    │                 │    │                 │
│  + backtest_*  │    │                 │    │                 │
│  + new_list_   │    │                 │    │                 │
└────────┬───────┘    └────────┬────────┘    └─────────────────┘
         │                     │
         │  consumes processed │
         │                     │
         ▼                     ▼
┌──────────────────────────────────────────────────────────────────┐
│                       DATA MODELS LAYER                          │
│  connectors.py (raw frames)  │  normalized.py (Kline, Funding)   │
│  processed.py (VolumeProfile)│  signals.py (Signal output)       │
└──────────────────────────────┬───────────────────────────────────┘
                               │
        ┌──────────────────────┼───────────────────────┐
        │                      │                       │
┌───────▼────────┐    ┌────────▼────────┐    ┌─────────▼────────┐
│  CONNECTORS    │    │  STORAGE (DB)   │    │  CORE            │
│  (I/O only)    │    │                 │    │  (foundation)    │
│                │    │  DuckDB client  │    │                  │
│  cex/          │    │  Schema mgmt    │    │  config.py       │
│   binance/     │    │  Migration run  │    │  logger.py       │
│   bybit/       │    │  Bulk INSERT    │    │  types.py        │
│   okx/         │    │                 │    │                  │
│   coinbase/    │    │                 │    │                  │
│  universe/     │    │                 │    │                  │
│   coingecko    │    │                 │    │                  │
│   coinmarketcap│    │                 │    │                  │
│  announcements/│    │                 │    │                  │
│   binance_rss  │    │                 │    │                  │
│  social/       │    │                 │    │                  │
│   parent_scan  │    │                 │    │                  │
└────────────────┘    └─────────────────┘    └──────────────────┘
```

**6 warstw w `src/deep_owl/`:**

| Layer | Lokalizacja | Odpowiedzialność |
|---|---|---|
| **CORE** | `src/deep_owl/core/` | Foundation: config, logger, types, db client |
| **CONNECTORS** | `src/deep_owl/connectors/` | I/O adapters per source (CEX WS+REST, CoinGecko, RSS) |
| **DATA MODELS** | `src/deep_owl/data_models/` | Pydantic models per layer (raw, normalized, processed, signals) |
| **PROCESSORS** | `src/deep_owl/processors/` | Data transformers per data type (numerical, timeseries, text, events) |
| **ENGINES** | `src/deep_owl/engines/` | Computational engines (1 per signal/strategy, niezależne) |
| **ORCHESTRATOR** | `src/deep_owl/orchestrator/` | Pipeline executors, parallelism coordination |
| **PARALLELISM** | `src/deep_owl/parallelism/` | Concurrency primitives (process pool, async pool, batch) |
| **OUTPUT** | `src/deep_owl/output/` | Telegram, dashboard, paper trader |

---

## 3. Connectors layer

### 3.1 Reguły żelaznej separacji

- ✅ **TYLKO I/O** — pull data z external API/source
- ✅ **TYLKO normalize** do `data_models/normalized.py` shape
- ❌ **NIE liczy** żadnej biznesowej metryki (avg, ratio, score)
- ❌ **NIE pisze** do DB (orchestrator decyduje)
- ❌ **NIE wywołuje** innych connectorów

### 3.2 Struktura

```
src/deep_owl/connectors/
├── cex/                          # Centralized exchanges
│   ├── binance/
│   │   ├── ws_spot.py            # Binance Spot WebSocket client
│   │   ├── ws_futures.py         # Binance Futures WebSocket client
│   │   ├── rest_spot.py          # Binance Spot REST (backfill + sanity)
│   │   ├── rest_futures.py       # Binance Futures REST
│   │   ├── exchange_info.py      # /exchangeInfo per market
│   │   └── parsers.py            # Frame → normalized model parsing
│   ├── bybit/
│   │   ├── ws_spot.py
│   │   ├── ws_linear.py          # Linear perpetual WebSocket
│   │   ├── rest_spot.py
│   │   ├── rest_linear.py
│   │   ├── exchange_info.py
│   │   └── parsers.py
│   ├── okx/
│   │   ├── ws_public.py          # OKX one public WS endpoint
│   │   ├── rest_public.py
│   │   ├── exchange_info.py
│   │   └── parsers.py
│   └── coinbase/
│       ├── ws_public.py
│       ├── rest_public.py
│       ├── exchange_info.py
│       └── parsers.py
├── universe/                     # Token universe sources
│   ├── coingecko.py              # /coins/markets — tier rankings
│   └── coinmarketcap.py          # /listings/latest — cross-check
├── announcements/                # New listings detection (Module 3)
│   ├── binance_rss.py            # RSS feed parser
│   ├── bybit_scrape.py           # Web scrape
│   ├── okx_scrape.py
│   └── coinbase_scrape.py
└── social/                       # Optional sentiment (Module 1 signal #6)
    └── parent_scanner_reader.py  # Read parent Social_media_scanner output
```

### 3.3 Connector interface (Protocol)

```python
# src/deep_owl/connectors/base.py
from typing import Protocol, AsyncIterator

class WSConnector(Protocol):
    """WebSocket connector — async iterator yielding normalized frames."""

    async def connect(self, symbols: list[str]) -> None: ...
    async def stream(self) -> AsyncIterator[Kline | FundingRate | OpenInterest | Liquidation]: ...
    async def disconnect(self) -> None: ...

class RESTConnector(Protocol):
    """REST connector — request/response per call."""

    async def fetch_klines(self, symbol: str, interval: str, limit: int) -> list[Kline]: ...
    async def fetch_funding(self, symbol: str) -> list[FundingRate]: ...
    async def fetch_open_interest(self, symbol: str) -> OpenInterest: ...
```

### 3.4 Per-CEX implementation pattern

```python
# src/deep_owl/connectors/cex/binance/ws_spot.py
import websockets
from tenacity import retry, wait_exponential

from deep_owl.data_models.normalized import Kline
from deep_owl.connectors.cex.binance.parsers import parse_kline_frame

class BinanceSpotWS:
    URL = "wss://stream.binance.com:9443/stream"

    def __init__(self, on_kline: Callable[[Kline], Awaitable[None]]):
        self.on_kline = on_kline

    @retry(wait=wait_exponential(min=1, max=60))
    async def connect(self, symbols: list[str]) -> None:
        streams = [f"{s.lower()}@kline_5m" for s in symbols] + \
                  [f"{s.lower()}@kline_15m" for s in symbols]
        url = f"{self.URL}?streams={'/'.join(streams)}"

        async with websockets.connect(url, ping_interval=20) as ws:
            async for raw_frame in ws:
                kline = parse_kline_frame(raw_frame)  # parser w osobnym pliku
                await self.on_kline(kline)            # callback do orchestrator buffer
```

**Charakterystyka:**
- Wszystko async
- Frame parsing OSOBNY plik (`parsers.py`) — testowalny bez WS
- Zero biznesowej logiki — tylko I/O + normalize

---

## 4. Processors layer

### 4.1 Reguły żelaznej separacji

- ✅ **TYLKO transform** — przyjmuje normalized data, zwraca processed data
- ✅ **Vectorized gdzie możliwe** (numpy)
- ❌ **NIE rozmawia z API** (zero I/O)
- ❌ **NIE rozmawia z DB** (zero queries)
- ❌ **NIE liczy biznesowych signal scores** (to engines)

### 4.2 Struktura

```
src/deep_owl/processors/
├── numerical/                    # Liczbowe operacje
│   ├── ohlcv_aggregator.py       # Tick → 5m/15m candles
│   ├── volume_profiler.py        # Rolling volume stats
│   ├── orderbook_l5_extractor.py # Bid/ask aggregation
│   └── liquidation_aggregator.py # Liquidation 24h sums
├── timeseries/                   # Time-series-specific
│   ├── rolling_stats.py          # SMA, EMA, std dev
│   ├── pivot_tables.py           # Per-symbol pivot
│   ├── resampler.py              # 5m → 1h conversion
│   ├── correlation_matrix.py     # Cross-symbol correlations
│   └── divergence_detector.py    # Price/indicator divergence
├── text/                         # Tekstowe processing (announcements, social)
│   ├── rss_parser.py             # RSS XML → structured
│   ├── announcement_classifier.py # Detect "new listing" intent
│   ├── sentiment_extractor.py    # Polarity score (jeśli dodajemy NLP)
│   └── nlp_keyword_extractor.py  # Meme keyword detection
└── events/                       # Event-driven
    ├── new_listing_extractor.py  # Daily diff symbols → new_listings
    ├── delisting_detector.py
    └── funding_cycle_detector.py # Detect funding payment events
```

### 4.3 Processor interface

```python
# src/deep_owl/processors/numerical/volume_profiler.py
import numpy as np
from deep_owl.data_models.normalized import Kline
from deep_owl.data_models.processed import VolumeProfile

def compute_volume_profile(klines: list[Kline], window: int = 2016) -> VolumeProfile:
    """
    Pure function. Input: list of Kline. Output: VolumeProfile.
    No I/O, no side effects, deterministic.

    window: 2016 = 7 days × 288 5min candles
    """
    volumes = np.array([k.volume_quote for k in klines])
    rolling_avg = np.convolve(volumes, np.ones(window) / window, mode='valid')[-1] if len(volumes) >= window else volumes.mean()
    last_24h_avg = volumes[-288:].mean() if len(volumes) >= 288 else volumes.mean()
    return VolumeProfile(
        rolling_7d_avg=float(rolling_avg),
        last_24h_avg=float(last_24h_avg),
        ratio=float(last_24h_avg / rolling_avg) if rolling_avg > 0 else 1.0,
    )
```

**Charakterystyka:**
- Pure function (no side effects)
- Numpy vectorized
- Output to Pydantic model (validated)
- Easy to unit test (mocked klines list → assert output)

---

## 5. Engines layer

### 5.1 Reguły żelaznej separacji

- ✅ **TYLKO compute** — przyjmuje processed data, zwraca Signal
- ✅ **Każdy engine = osobny plik** (NIE konsoliduj)
- ✅ **Niezależny** — można uruchomić sam z mocked input
- ❌ **NIE rozmawia z API**
- ❌ **NIE rozmawia z DB**
- ❌ **NIE wywołuje** innych engines bezpośrednio (orchestrator je composuje)

### 5.2 Struktura

```
src/deep_owl/engines/
├── base.py                              # Engine Protocol
│
├── # Module 1 — Big Cap Accumulation Detector (7 engines)
├── volume_profile_engine.py             # Sygnał #1
├── funding_skew_engine.py               # Sygnał #2
├── oi_buildup_engine.py                 # Sygnał #3
├── cross_exchange_engine.py             # Sygnał #4
├── liquidation_imbalance_engine.py      # Sygnał #5
├── social_velocity_engine.py            # Sygnał #6 (opt)
├── bid_ask_imbalance_engine.py          # Sygnał #7 (opt)
│
├── # Module 2 — Backtesting strategies (4 engines)
├── backtest_breakout_consolidation.py   # Bollinger Squeeze
├── backtest_volume_spike.py             # Volume spike + price confirmation
├── backtest_funding_squeeze.py          # Negative funding + consolidation
├── backtest_rsi_divergence.py           # RSI oversold + bullish divergence
│
├── # Module 2 — Backtest infrastructure
├── walk_forward_engine.py               # Walk-forward windows orchestration
├── metrics_engine.py                    # Sharpe, Sortino, Calmar, max DD
├── slippage_engine.py                   # Linear slippage model
├── fees_engine.py                       # Per-CEX fee table
│
├── # Module 3 — New Listings (2 engines)
├── new_listings_detector_engine.py      # CEX symbols diff → new listings
└── filter_set_engine.py                 # Apply user filter sets
```

**Total: ~17 engines w v0.1.3.** Każdy max 200 linii (żelazna reguła z FILE_HYGIENE).

### 5.3 Engine interface (Protocol)

```python
# src/deep_owl/engines/base.py
from typing import Protocol, Any
from dataclasses import dataclass

@dataclass(frozen=True)
class EngineResult:
    """Output engine — znormalizowany score 0..1 + raw value."""
    engine_name: str
    raw_value: float           # Surowa wartość (np. funding rate -0.024%)
    normalized_score: float    # Sigmoid normalized 0..1
    threshold: float           # Aktywny threshold użyty
    metadata: dict[str, Any]   # Optional debug info

class Engine(Protocol):
    """Każdy engine implementuje ten Protocol."""
    name: str
    weight: float

    def warmup_window_bars(self) -> int:
        """Ile bars data wymagane dla pełnego scoring."""

    def compute(self, processed_data: Any) -> EngineResult | None:
        """Pure function. Input processed data, output result lub None jeśli data niedostępna."""
```

### 5.4 Engine implementation pattern

```python
# src/deep_owl/engines/volume_profile_engine.py
import math
from deep_owl.data_models.processed import VolumeProfile
from deep_owl.engines.base import EngineResult

NAME = "volume_rising"
WEIGHT = 0.20
THRESHOLD = 2.0  # ratio > 2.0 = signal

def sigmoid(x: float, scale: float = 1.0) -> float:
    return 1.0 / (1.0 + math.exp(-x / scale))

def warmup_window_bars() -> int:
    return 2016  # 7 days × 288 5min candles

def compute(profile: VolumeProfile, price_change_24h_pct: float) -> EngineResult | None:
    """
    Pure compute. NIE I/O.

    Sygnał #1: Volume rising on flat/down price.
    Threshold: vol_24h / vol_7d_avg > 2.0 ORAZ |Δp_24h| < 5%
    """
    if abs(price_change_24h_pct) > 5.0:
        return None  # Price ruchome za bardzo — signal niewazne

    if profile.rolling_7d_avg <= 0:
        return None  # No data

    raw = profile.ratio
    normalized = sigmoid(raw - THRESHOLD, scale=0.5)

    return EngineResult(
        engine_name=NAME,
        raw_value=raw,
        normalized_score=normalized,
        threshold=THRESHOLD,
        metadata={"price_change_24h": price_change_24h_pct},
    )
```

### 5.5 Test każdego engine — niezależny

```python
# tests/unit/engines/test_volume_profile_engine.py
from deep_owl.data_models.processed import VolumeProfile
from deep_owl.engines.volume_profile_engine import compute

def test_volume_above_threshold_with_flat_price():
    profile = VolumeProfile(rolling_7d_avg=100.0, last_24h_avg=250.0, ratio=2.5)
    result = compute(profile, price_change_24h_pct=2.0)
    assert result is not None
    assert result.raw_value == 2.5
    assert 0.7 < result.normalized_score < 0.95

def test_volume_above_threshold_but_price_jumped():
    profile = VolumeProfile(rolling_7d_avg=100.0, last_24h_avg=250.0, ratio=2.5)
    result = compute(profile, price_change_24h_pct=10.0)
    assert result is None  # price_change_24h > 5% → signal nieaktywny

def test_no_data():
    profile = VolumeProfile(rolling_7d_avg=0.0, last_24h_avg=0.0, ratio=1.0)
    result = compute(profile, price_change_24h_pct=0.0)
    assert result is None
```

**Test wykonywany BEZ DB, BEZ API, BEZ network.** Pure function testing.

---

## 6. Orchestrator layer

### 6.1 Co robi

Orchestrator **composes** engines w pipeline. Decyduje:
- Który engine kiedy uruchomić
- Jak je równolegle wykonać
- Jak agregować outputs (weighted sum dla Module 1)
- Co zrobić gdy engine zwróci None (redystrybucja wagi)
- Kiedy alert/persist

### 6.2 Struktura

```
src/deep_owl/orchestrator/
├── module1_orchestrator.py    # Combines 7 engines → score 0-100
├── module2_orchestrator.py    # Backtest pipeline (walk-forward + strategies + metrics)
├── module3_orchestrator.py    # New listings + filter sets matching
└── pipeline.py                 # General parallel pipeline executor
```

### 6.3 Module 1 orchestrator pattern

```python
# src/deep_owl/orchestrator/module1_orchestrator.py
import asyncio
from typing import Sequence

from deep_owl.engines import (
    volume_profile_engine,
    funding_skew_engine,
    oi_buildup_engine,
    cross_exchange_engine,
    liquidation_imbalance_engine,
    social_velocity_engine,
    bid_ask_imbalance_engine,
)
from deep_owl.engines.base import EngineResult
from deep_owl.processors.numerical import volume_profiler
from deep_owl.processors.timeseries import rolling_stats
# ... reszta processors

class Module1Orchestrator:
    """Combines 7 engines into Module 1 score."""

    ENGINES = {
        volume_profile_engine.NAME: volume_profile_engine,
        funding_skew_engine.NAME: funding_skew_engine,
        oi_buildup_engine.NAME: oi_buildup_engine,
        cross_exchange_engine.NAME: cross_exchange_engine,
        liquidation_imbalance_engine.NAME: liquidation_imbalance_engine,
        social_velocity_engine.NAME: social_velocity_engine,
        bid_ask_imbalance_engine.NAME: bid_ask_imbalance_engine,
    }

    def score_token(self, token_data: TokenData) -> Signal:
        """
        Run all engines in PARALLEL (process pool dla CPU-bound),
        aggregate results, produce final Signal.
        """
        # Każdy engine może być policzony niezależnie
        results: list[EngineResult] = []
        for engine_name, engine in self.ENGINES.items():
            result = engine.compute(token_data.get_processed_data(engine_name))
            if result is not None:
                results.append(result)

        # Weighted sum + normalize
        total_weight = sum(self.ENGINES[r.engine_name].WEIGHT for r in results)
        if total_weight == 0:
            return Signal(score=0, ...)

        weighted_sum = sum(r.normalized_score * self.ENGINES[r.engine_name].WEIGHT for r in results)
        score = (weighted_sum / total_weight) * 100

        return Signal(
            token_id=token_data.token_id,
            score=score,
            tier=token_data.tier,
            breakdown={r.engine_name: r.normalized_score for r in results},
            timestamp=now(),
        )
```

### 6.4 Pipeline parallel executor

```python
# src/deep_owl/orchestrator/pipeline.py
from deep_owl.parallelism.pool import ProcessPool

async def run_module1_full_universe(universe: list[Token]) -> list[Signal]:
    """Run Module 1 scoring na całym universe przy maksymalnej parallelism."""
    orchestrator = Module1Orchestrator()
    pool = ProcessPool(workers=os.cpu_count())  # all cores

    # Chunked work distribution
    chunks = split_into_chunks(universe, n=os.cpu_count() * 4)
    signals = await pool.map_async(orchestrator.score_chunk, chunks)
    return [s for chunk in signals for s in chunk]
```

---

## 7. Parallelism layer

### 7.1 Cel

Centralizacja primitives concurrency. Engines i orchestrators NIE używają bezpośrednio `multiprocessing` — używają primitives z tej warstwy. Dzięki temu można zmienić strategy (np. dodać Ray w Faza 7+) bez zmian w engines.

### 7.2 Struktura

```
src/deep_owl/parallelism/
├── pool.py                      # Process pool wrapper
├── batch_executor.py            # Batch operations parallel
├── stream_multiplexer.py        # WS streams multiplexing
└── rate_limiter.py              # Token bucket dla REST APIs
```

### 7.3 Process pool wrapper

```python
# src/deep_owl/parallelism/pool.py
import asyncio
from concurrent.futures import ProcessPoolExecutor
from typing import Callable, TypeVar, Iterable

T = TypeVar("T")
R = TypeVar("R")

class ProcessPool:
    """Process pool dla CPU-bound work, async-friendly."""

    def __init__(self, workers: int):
        self.workers = workers
        self.executor = ProcessPoolExecutor(max_workers=workers)

    async def map_async(self, func: Callable[[T], R], items: Iterable[T]) -> list[R]:
        loop = asyncio.get_event_loop()
        futures = [loop.run_in_executor(self.executor, func, item) for item in items]
        return await asyncio.gather(*futures)

    def shutdown(self) -> None:
        self.executor.shutdown(wait=True)
```

### 7.4 Stream multiplexer (WS)

```python
# src/deep_owl/parallelism/stream_multiplexer.py
import asyncio

class StreamMultiplexer:
    """
    Multiplex N WebSocket streams into single asyncio.Queue.
    Każdy stream w osobnym asyncio task.
    """

    def __init__(self):
        self.queue: asyncio.Queue = asyncio.Queue(maxsize=100_000)
        self.tasks: list[asyncio.Task] = []

    async def add_stream(self, name: str, stream_iterator) -> None:
        async def consume():
            async for frame in stream_iterator:
                await self.queue.put((name, frame))

        task = asyncio.create_task(consume(), name=name)
        self.tasks.append(task)

    async def consume(self):
        while True:
            yield await self.queue.get()
```

### 7.5 Rate limiter (REST)

```python
# src/deep_owl/parallelism/rate_limiter.py
import asyncio
import time

class TokenBucketRateLimiter:
    """Token bucket dla per-CEX REST rate limits."""

    def __init__(self, rate_per_second: float, burst: int):
        self.rate = rate_per_second
        self.burst = burst
        self.tokens = burst
        self.last_refill = time.monotonic()
        self.lock = asyncio.Lock()

    async def acquire(self, n: int = 1) -> None:
        async with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_refill
            self.tokens = min(self.burst, self.tokens + elapsed * self.rate)
            self.last_refill = now

            if self.tokens < n:
                wait = (n - self.tokens) / self.rate
                await asyncio.sleep(wait)
                self.tokens = 0
            else:
                self.tokens -= n
```

---

## 8. Output layer

### 8.1 Struktura

```
src/deep_owl/output/
├── telegram_bot.py              # python-telegram-bot integration
├── dashboard/
│   ├── app.py                   # FastAPI main
│   ├── routes/
│   │   ├── universe.py          # /universe endpoints
│   │   ├── signals.py           # /signals
│   │   ├── new_listings.py      # /listings + filter sets
│   │   ├── paper_trades.py
│   │   ├── backtests.py
│   │   └── settings.py
│   ├── templates/               # Jinja2 templates
│   │   ├── base.html
│   │   ├── universe.html
│   │   └── ...
│   └── static/                  # CSS, HTMX, plotly bundle
└── paper_trader.py              # Simulated fill engine
```

### 8.2 Output reads from DB only

Output layer **NIE** wywołuje connectors ani engines bezpośrednio. Wyłącznie:
- Read z DuckDB (signals, paper_trades, new_listings, etc.)
- Render HTML lub send Telegram messages
- Accept user actions (POST endpoints) → dispatch do orchestrator queue

---

## 9. Data flow end-to-end

### Flow A: Live data ingestion (continuous)

```
┌────────────────┐ raw frames    ┌──────────────────┐
│ 4× WebSocket   │ ────────────> │ Connectors layer │
│ connections    │               │ binance/ws_spot  │
│ (Binance/Bybit/│               │ binance/ws_futures│
│ OKX/Coinbase)  │               │ bybit/ws_*       │
└────────────────┘               │ okx/ws_public    │
                                 │ coinbase/ws_pub  │
                                 └────────┬─────────┘
                                          │ parsed → Kline/FundingRate/OI
                                          ▼
                                 ┌──────────────────┐
                                 │ stream_          │
                                 │ multiplexer      │
                                 │ (asyncio.Queue)  │
                                 └────────┬─────────┘
                                          │ batched
                                          ▼
                                 ┌──────────────────┐
                                 │ db client        │
                                 │ bulk INSERT      │
                                 └────────┬─────────┘
                                          ▼
                                 ┌──────────────────┐
                                 │ DuckDB           │
                                 │ klines_5m        │
                                 │ klines_15m       │
                                 │ funding_history  │
                                 │ open_interest    │
                                 │ liquidations     │
                                 └──────────────────┘
```

### Flow B: Module 1 scoring (every 5min)

```
┌──────────────────┐  every 5m      ┌──────────────────────┐
│ Cron task        │ ────────────>  │ Module1 Orchestrator │
└──────────────────┘                └──────────┬───────────┘
                                               │ pull universe
                                               ▼
                                    ┌──────────────────────┐
                                    │ DuckDB: tokens       │
                                    │ WHERE is_active=TRUE │
                                    └──────────┬───────────┘
                                               │ ~4000 tokens
                                               ▼
                                    ┌──────────────────────┐
                                    │ ProcessPool          │
                                    │ (multiprocessing)    │
                                    │ chunk distribution   │
                                    └──────────┬───────────┘
                                               │ per chunk
                                               ▼
                                    ┌──────────────────────┐
                                    │ Per token:           │
                                    │   - Pull processed   │
                                    │     data             │
                                    │   - Run 7 engines    │
                                    │   - Aggregate score  │
                                    └──────────┬───────────┘
                                               │ Signals
                                               ▼
                                    ┌──────────────────────┐
                                    │ DuckDB: INSERT       │
                                    │ INTO signals         │
                                    │ WHERE score>tier_th  │
                                    └──────────┬───────────┘
                                               ▼
                                    ┌──────────────────────┐
                                    │ Telegram bot         │
                                    │ (alert worker        │
                                    │  reads pending)      │
                                    └──────────────────────┘
```

### Flow C: Module 3 New Listings detection (every 1h)

```
┌──────────────────┐  cron 1h     ┌──────────────────────┐
│ Module3          │ ──────────>  │ Connectors:          │
│ Orchestrator     │              │ cex/exchange_info    │
└──────────────────┘              │ announcements/       │
                                  │ binance_rss          │
                                  └──────────┬───────────┘
                                             │ today symbols
                                             ▼
                                  ┌──────────────────────┐
                                  │ Processors:          │
                                  │ events/new_listing_  │
                                  │ extractor            │
                                  │ (diff today vs       │
                                  │  yesterday)          │
                                  └──────────┬───────────┘
                                             │ new listings
                                             ▼
                                  ┌──────────────────────┐
                                  │ Engine:              │
                                  │ filter_set_engine    │
                                  │ (apply user filters) │
                                  └──────────┬───────────┘
                                             │ matches
                                             ▼
                                  ┌──────────────────────┐
                                  │ DuckDB: INSERT       │
                                  │ new_listings +       │
                                  │ new_listing_matches  │
                                  └──────────┬───────────┘
                                             ▼
                                  ┌──────────────────────┐
                                  │ Telegram + Dashboard │
                                  └──────────────────────┘
```

---

## 10. Modules mapping

Mapowanie biznesowych "modułów" (Module 1/2/3) na hexagonal layers:

### Module 1 — Big Cap Accumulation Detector

| Layer | Komponenty |
|---|---|
| Connectors | `cex/binance/ws_spot`, `ws_futures` (klines + funding + OI), `cex/bybit/*`, `cex/okx/*`, `cex/coinbase/*` |
| Processors | `numerical/volume_profiler`, `numerical/orderbook_l5_extractor`, `timeseries/rolling_stats`, `timeseries/divergence_detector`, `numerical/liquidation_aggregator` |
| Engines | `volume_profile_engine`, `funding_skew_engine`, `oi_buildup_engine`, `cross_exchange_engine`, `liquidation_imbalance_engine`, `social_velocity_engine` (opt), `bid_ask_imbalance_engine` (opt) |
| Orchestrator | `module1_orchestrator` (combines 7 engines, weighted sum, tier-aware threshold) |
| Output | Telegram alerts, Dashboard "Live Signals" + "Top Movers" tabs |

### Module 2 — Backtesting Engine

| Layer | Komponenty |
|---|---|
| Connectors | `cex/*/rest_*` (historical klines pull) |
| Processors | `numerical/ohlcv_aggregator`, `timeseries/resampler`, `timeseries/rolling_stats` |
| Engines | `backtest_breakout_consolidation`, `backtest_volume_spike`, `backtest_funding_squeeze`, `backtest_rsi_divergence`, `walk_forward_engine`, `metrics_engine`, `slippage_engine`, `fees_engine` |
| Orchestrator | `module2_orchestrator` (walk-forward windows × strategies × universe parallel) |
| Output | HTML reports w `data/reports/`, Dashboard "Backtests" tab |

### Module 3 — New Listings Monitor

| Layer | Komponenty |
|---|---|
| Connectors | `cex/*/exchange_info`, `announcements/binance_rss`, `announcements/bybit_scrape`, ... |
| Processors | `events/new_listing_extractor`, `text/announcement_classifier`, `text/nlp_keyword_extractor` |
| Engines | `new_listings_detector_engine`, `filter_set_engine` |
| Orchestrator | `module3_orchestrator` (1h cron + filter matching) |
| Output | Telegram alerts (per filter set), Dashboard "New Listings" + "Filter Sets" tabs |

---

## 11. Decyzje

| Decyzja | Wybór | Alternatywa | Rationale |
|---|---|---|---|
| Architecture | Hexagonal (ports & adapters) | Monolith | Niezależne testowanie + parallelism |
| Język | Python 3.11+ | Rust dla perf | Match parent, asyncio, ecosystem |
| Concurrency | asyncio (I/O) + multiprocessing (CPU) | asyncio only | True CPU parallelism dla scoring |
| DB | DuckDB | Postgres / SQLite | Embedded, columnar, parallel queries |
| Universe scope | ~3-4k z 4 priorytetowych CEX | Top 5000 z CMC | User: full CEX coverage |
| Data primary | WebSocket | REST polling | $0, no rate limit, real-time |
| Engines per file | 1 (każdy osobny) | Konsolidacja | Niezależność, testability, parallel |
| Module count | 3 | 2 lub 5 | Accumulation + Backtest + New Listings |
| Tier classification | 1-4 | 1-3 | Full universe wymaga tail tier |
| Output | Sygnały + paper trading | Auto-trading | User wybór, niskie ryzyko |
| Repo | Standalone | Worktree parent | Czysta izolacja od market_maker |

---

## 12. Skala i performance

### Storage (DuckDB hot tier)

| Komponent | Skala/rok |
|---|---|
| klines_5m + klines_15m | ~17.5GB |
| funding + OI + liquidations | ~3GB |
| signals + paper_trades + backtest_runs | ~0.05GB |
| new_listings + filters + matches | ~0.01GB |
| **Total** | **~21GB** (worst case ~30GB) |

Po 90 dni archive do parquet → hot ~5GB + cold ~16GB.

### Performance targets

| Operacja | Target |
|---|---|
| WS frame ingestion (single) | <100ms (frame → buffer) |
| Bulk INSERT batch (1000 events) | <500ms |
| Universe rebuild (4000 tokens) | <10 min |
| Module 1 scoring per token | <50ms (CPU) |
| Module 1 scoring full universe | <2 min (16 cores parallel) |
| New listings detection (daily) | <30s |
| Backtest 1 strategy × top_100 × 1y | <5 min |
| Backtest full universe (top_5000) | <2h |
| Dashboard page load | <500ms |

### Bottlenecks

- **WS connection limit:** ~9 trwałych connections — wszystkie CEX-y obsłużą
- **DuckDB writes:** ~50k rows/sec (bulk arrow INSERT)
- **Memory:** WS buffer max ~200MB
- **CPU:** Module 1 scoring całego universe = ~16 cores × 100% przez 2 min co 5 min cycle

### Cost (Faza 0-6)

**$0.** WebSocket unlimited, CoinGecko free 30/min wystarczy, CMC 333/d wystarczy. Server lokalny dev.

W Faza 7+ (deployment): ~$20-50/mo VPS + opcjonalnie CoinGecko Pro $129/mo gdy skala wymusi.
