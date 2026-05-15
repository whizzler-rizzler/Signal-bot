# Architektura — Deep Owl

> **Single source of truth** dla architektury systemu. Wszelkie zmiany strukturalne MUSZĄ być najpierw odzwierciedlone tutaj.

## Spis treści

1. [System overview](#system-overview)
2. [Layered architecture](#layered-architecture)
3. [Universe building — co skanujemy](#universe-building)
4. [Data ingestion — WebSocket-first](#data-ingestion)
5. [Module 1: Big Cap Accumulation Detector](#module-1)
6. [Module 2: Backtesting Engine](#module-2)
7. [Module 3: New Listings Monitor](#module-3)
8. [Output layer](#output-layer)
9. [Storage — DuckDB schema](#storage)
10. [Data flow end-to-end](#data-flow)
11. [Configuration model](#configuration)
12. [Decyzje i tradeoffs](#decyzje)
13. [Skala i performance](#skala)

---

## System overview

```
            ┌────────────────────────────────────────────────────────────┐
            │                  DEEP OWL (standalone repo)                │
            │      BIG CAPS CEX-FIRST — wszystko z 4 priorytetowych      │
            │              CEX (~3000-4000 tokens) — WebSocket           │
            └────────────────────────────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
   ┌────▼─────┐                  ┌─────▼─────┐                  ┌─────▼─────┐
   │  DATA    │                  │  ENGINE   │                  │  OUTPUT   │
   │  LAYER   │                  │  LAYER    │                  │  LAYER    │
   └──────────┘                  └───────────┘                  └───────────┘
        │                              │                              │
        │ 4× WebSocket (PRIMARY)       │ Universe Builder             │ Telegram bot
        │   Binance/Bybit/OKX/         │   (full CEX symbols)         │ FastAPI Dashboard :8001
        │   Coinbase live streams      │ Module 1: Accumulation       │ Paper Trader (sim PnL)
        │ CEX REST (backfill+sanity)   │   Detector (big caps)        │
        │ CoinGecko (tier rankings)    │ Module 2: Backtester         │
        │ Parent recorder (BTC/ETH/    │   (REST historical klines)   │
        │   HYPE tick precision opt)   │ Module 3: New Listings       │
        │ Binance Announcements RSS    │   Monitor (user filters)     │
        │ Social_media_scanner reuse   │                              │
        └──────────────┬───────────────┘                              │
                       │                                              │
                ┌──────▼──────────────────────────────────────────────┘
                │                  STORAGE LAYER
                │                ┌─────────────┐
                │                │   DuckDB    │
                │                └─────────────┘
                │   tokens · token_listings · cex_symbols_snapshot
                │   klines_5m · klines_15m · funding_history · open_interest
                │   signals · paper_trades · backtest_runs
                │   new_listings · new_listing_filters (user-defined)
```

## Layered architecture

| Layer | Odpowiedzialność | Pliki |
|---|---|---|
| **Data adapters** | WebSocket streams (primary) + REST (backfill/sanity) + CoinGecko (tier rankings) + RSS feeds (announcements). Normalizacja do common models. | `src/deep_owl/data/` |
| **Storage** | DuckDB persistence + schema migrations + partitioning. WS buffer w-memory przed bulk INSERT. | `src/deep_owl/db/` |
| **Engine modules** | Universe builder, accumulation scoring, backtest runner, new listings detector. | `src/deep_owl/modules/` |
| **Output** | Telegram bot, FastAPI dashboard (z UI dla New Listings filters), paper trader. | `src/deep_owl/output/` |
| **CLI** | Entry points: `deep-owl universe build`, `ws start`, `backtest`, `detect`, `listings`, `run`, `serve`. | `src/deep_owl/cli.py` |
| **Config** | Pydantic Settings + .env loading + filter rules + tier thresholds + New Listings filter sets. | `src/deep_owl/config.py` |

---

## Universe building

**Co to jest:** lista wszystkich tokenów które realnie monitorujemy. **NIE filtrujemy aggressive** — bierzemy wszystko co jest listed na min 1 z 4 priorytetowych CEX-ów.

### Source

- **Primary:** `/exchangeInfo` / `/products` / `/instruments-info` per CEX (Binance, Bybit, OKX, Coinbase) — lista wszystkich symboli per CEX
- **Secondary:** CoinGecko `/coins/markets` — tylko dla **market cap rankings** (tier 1/2/3 classification), NIE dla filter cut-off
- **Cross-ref:** CoinMarketCap (opcjonalne — sanity check rankings)

### Filter pipeline (łagodny)

Bez aggressive scope cap. Wykluczamy TYLKO oczywiste:

| Reguła | Default | Rationale |
|---|---|---|
| `stablecoin_blacklist` | USDT, USDC, DAI, FDUSD, TUSD, USDD, PYUSD, FRAX, USDe, USDS | Stable nie ma volatility do detekcji breakout |
| `wrapped_synthetic_blacklist` | WBTC, WETH, stETH, weETH, jupSOL, jitoSOL, cbETH, LsETH | Same risk profile co underlying |
| `delisted_or_zero_volume` | volume_24h == 0 przez >7 dni | Truly dead tokens |
| `min_cex_listings` | 1 z top 4 (Binance/Bybit/OKX/Coinbase) | Brak listing = brak danych |

**NO market cap minimum.** NO age minimum. NO listing count minimum. Bierzemy wszystko aktywne.

### Tier classification (rank z CoinGecko)

| Tier | Definicja | Use case |
|---|---|---|
| Tier 1 | CoinGecko rank 1-100 | High data quality, strict alert threshold |
| Tier 2 | Rank 101-500 | Medium |
| Tier 3 | Rank 501-2000 | Niskie data quality, soft threshold |
| Tier 4 | Rank > 2000 lub no rank | Tail — alerty tylko dla extreme cases |

### Wynik

~3000-4000 tokens w `tokens` table + `token_listings` (per-CEX mapping).

### Refresh policy

- Daily rebuild (24h cron) — re-pull `/exchangeInfo` + CoinGecko market cap rankings
- Delta detection: nowe symbole vs wczoraj → wpisz do `new_listings` table (input dla Modułu 3)
- Soft delete: tokeny które delisted → `is_active=FALSE`, NIE delete row

---

## Data ingestion — WebSocket-first

**KLUCZOWA DECYZJA:** WebSocket streams jako PRIMARY (live data), REST jako secondary (backfill + sanity reconcile).

### WebSocket endpoints — pełne pokrycie za $0

| CEX | WS endpoint | Co subskrybujemy | Limits |
|---|---|---|---|
| Binance Spot | `wss://stream.binance.com:9443/stream?streams=<sym>@kline_5m/<sym>@kline_15m/...` | Klines 5m + 15m per symbol | 1024 streams/connection, multiple connections OK |
| Binance Futures | `wss://fstream.binance.com/stream?streams=!markPrice@arr@1s/<sym>@openInterest/!forceOrder@arr` | Funding (all markPrice), OI, liquidations | 200 streams/connection |
| Bybit | `wss://stream.bybit.com/v5/public/spot` + `/linear` | Klines, tickers per symbol | No hard limit per connection |
| OKX | `wss://ws.okx.com:8443/ws/v5/public` | Candles, tickers, funding | 200 subskrypcji per connection |
| Coinbase | `wss://ws-feed.exchange.coinbase.com` | Tickers, klines (5min/1h/1d) | No hard limit |

**4 trwałe connections.** Każda subskrybuje wszystkie potrzebne streams dla tokenów listed na danym CEX. Multiplex (jedna connection, wiele streams) gdzie support'owany.

### WebSocket lifecycle

```
Connect → Subscribe → Receive frames → Parse → Buffer (memory) → Bulk INSERT (co 30s lub 1000 events)
   ↑                                                                                   |
   ┴←←←←←←←←←←←←←← Reconnect (exponential backoff) ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←┘
                              Heartbeat (ping/pong co 30s)
```

**Failure handling:**
- Heartbeat ping/pong co 30s (Binance/Bybit) lub 25s (OKX requirement)
- Reconnect przy disconnect: exponential backoff (1s, 2s, 4s, 8s, max 60s)
- Replay buffer: gdy WS reconnect po >5s downtime → REST `/klines` pull dla missed bars (sanity reconcile)
- Per-stream stale detection: jeśli >2× expected interval bez messages → flag, REST sanity check

### REST role — backfill + sanity, NIE live

- **Backfill historyczny** (jednorazowy): pull 30-365 dni klines dla każdego tokena przed pierwszym Module 1 run
- **Sanity reconcile** (co 30 min): random sample 50 tokenów, porównaj last 5 świec z WS vs REST → alert jeśli divergence > 0.1%
- **Mid-day new tokens**: gdy detect new listing przez announcement → REST backfill dla tego tokena dopóki WS subscribe się zarejestruje

### Subscriptions management

Universe ~3000-4000 tokens. Per token subscribe:
- Binance: `<sym>@kline_5m` + `<sym>@kline_15m` = 2 streams/token
- Binance: ~2000 spot symbols × 2 streams = 4000 streams → potrzebujemy **4 connections** (1024 each)
- Futures: ~400 symbols × kline_5m + markPrice (all in 1 stream) + openInterest = ~500 streams → 1 connection

Total connections per CEX:
- Binance: 4 (spot) + 1 (futures) = 5
- Bybit: 1 (spot) + 1 (linear) = 2
- OKX: 1-2
- Coinbase: 1
- **Total: ~9 trwałych connections** to ogarnij wszystko za $0

---

## Module 1 — Big Cap Accumulation Detector

(Nie zmieniło się znacząco — patrz [docs/deep_owl_v1.md sekcja 5](docs/deep_owl_v1.md) dla pełnego deep dive.)

### Key points

- 7 sygnałów: volume profile, funding skew, OI buildup, cross-exchange divergence, liquidation imbalance, social, bid/ask
- Score 0-100, ważona suma sygmoid-normalized signals
- **Tier-aware threshold:** Tier 1 (top 100) próg 70+, Tier 2 (top 500) 65+, Tier 3 (top 2000) 60+, Tier 4 (>2000) 55+ + dłuższy cooldown
- **Cadence:** scoring co 5 min (po zamknięciu świecy WS), per-token cooldown zależny od tier
- **Cross-validation MANDATORY** przed live deploy: replay scoring na historical 1-2 lata, precision/recall target > 0.4 OOS

---

## Module 2 — Backtesting Engine

(Nie zmieniło się — patrz [docs/deep_owl_v1.md sekcja 6](docs/deep_owl_v1.md).)

### Key points

- 4 strategie: breakout_consolidation, volume_spike, funding_squeeze, rsi_divergence
- Walk-forward analysis MANDATORY (train 60d / test 14d / slide 14d)
- Slippage linear model + per-CEX fees
- Metrics: Sharpe, Sortino, Calmar, max DD, win rate, exposure time
- HTML report z Plotly
- Universe: top_100 → top_500 → top_5000 (faza-aware ekspansja)

---

## Module 3 — New Listings Monitor

**Pytanie biznesowe:** Czy nowy CEX listing rokuje? User-configurable filters dla różnych użytkowych preferencji.

**Różnica vs poprzednio wywalony "fresh DEX":** to są **CEX listings** (już przeszły vetting), nie DEX rugpull-risk launches. CEX listing zwykle daje 24-72h momentum (post-listing dump + reversal pattern).

### Source detection

- **CEX `/exchangeInfo` daily snapshot diff:** Porównanie listy symboli dzisiaj vs wczoraj per CEX. Nowe symbole = candidates.
- **Binance Announcements RSS:** `https://www.binance.com/en/support/announcement/c-48` — official announcement listings (zwykle 24-48h wyprzedzenia)
- **Bybit/OKX/Coinbase announcements** (web scrape lub RSS jeśli dostępne)

### User-defined filters (config.yaml + dashboard UI)

User definiuje filter sets — wiele jednocześnie aktywnych. Przykład config:

```yaml
new_listings:
  enabled: true
  source_priority: ["binance_announcements_rss", "cex_diff_snapshot"]

  filter_sets:
    # Filter set 1: "Conservative" — tylko BTC/ETH pairs na top 2 CEX
    - name: conservative
      enabled: true
      min_market_cap_usd: 10_000_000
      min_volume_24h_usd: 1_000_000
      min_cex_listings: 2
      max_age_hours: 168          # 7 dni od listingu
      required_quote_assets: ["USDT", "USDC"]
      required_has_perpetual: true
      exclude_stablecoins: true
      exclude_wrapped: true
      exclude_meme_keywords: []   # opcjonalne lista keywords

    # Filter set 2: "Aggressive" — wszystko świeże z min volume
    - name: aggressive_alts
      enabled: true
      min_market_cap_usd: 1_000_000
      min_volume_24h_usd: 100_000
      min_cex_listings: 1
      max_age_hours: 72           # 3 dni
      required_quote_assets: ["USDT"]
      required_has_perpetual: false
      exclude_stablecoins: true
      exclude_wrapped: true
      exclude_meme_keywords: ["INU", "DOGE", "PEPE"]  # przykład

    # Filter set 3: "Memes only" — tylko z meme keywords
    - name: meme_hunt
      enabled: false              # disabled by default
      min_market_cap_usd: 500_000
      min_volume_24h_usd: 50_000
      max_age_hours: 48
      required_quote_assets: ["USDT", "USDC"]
      include_meme_keywords: ["INU", "DOGE", "PEPE", "FLOKI", "WIF"]
```

### Filter atrybuty (rozszerzane)

- `min_market_cap_usd`, `max_market_cap_usd`
- `min_volume_24h_usd`, `max_volume_24h_usd`
- `min_cex_listings`, `max_cex_listings`
- `min_age_hours`, `max_age_hours` (od pierwszego listingu)
- `required_quote_assets` (list: USDT, USDC, USD, BTC, ETH)
- `required_has_perpetual` (bool)
- `required_market_type` (spot/perpetual/inverse list)
- `exclude_stablecoins`, `exclude_wrapped`
- `include_meme_keywords` (list — pattern match w symbol/name)
- `exclude_meme_keywords` (list)
- `tier_max` (max tier 1-4, 4=all)
- `min_holders_count` (jeśli mamy dane z CoinGecko/CMC)
- `min_age_listed_on_cex_days` (np. >30 dni na CEX = NIE jest fresh)

### Dashboard UI override

Faza 6+ dashboard ma:
- **Tab "New Listings"** — tabela aktualnych kandydatów filtered per active filter set
- **Tab "Filter sets"** — UI do tworzenia/edytowania filter sets bez restartu, z apply/save buttonem
- Per filter set: live preview "ile tokenów matches" dynamicznie

### Output Modułu 3

- Per filter set: lista tokenów które match
- Per token: które filter set'y go matchują, jak długo jest w "new listings" (countdown do max_age_hours)
- Telegram alerts opcjonalne per filter set (`alert_on_match: true/false`)
- Po expire (max_age_hours minęło) → token wraca do normal Module 1 universe

### Cross-pollination z Module 1

Token w `new_listings` aktywny → boost weight `social_velocity` signal w Module 1 (nowy listing często ma social hype).

---

## Output layer

(Nie zmieniło się — Telegram + FastAPI dashboard + Paper Trader. Dashboard dostaje +1 zakładkę: New Listings + Filter Sets.)

### Dashboard zakładki (zaktualizowane)

| Zakładka | Zawartość |
|---|---|
| Universe | ~3000-4000 tokenów z filtrami (tier, market cap, listing count) |
| Live Signals | Module 1 alerts auto-refresh |
| Top Movers | Top 50 wg recent score |
| **New Listings** | Aktualne kandydaci per filter set + countdown age |
| **Filter Sets** | UI do tworzenia/edytowania filter sets (Module 3) |
| Paper Trading | Open positions + closed trades + PnL chart |
| Backtests | Historia + uruchamianie + HTML reports |
| Settings | View-only config.yaml |

---

## Storage — DuckDB schema

| Tabela | PK | Cel |
|---|---|---|
| `_meta` | `key` | Schema version |
| `tokens` | `token_id` | Master tokens (CoinGecko ID) |
| `token_listings` | `(token_id, exchange, symbol)` | Per-CEX listing |
| `cex_symbols_snapshot` | `(exchange, snapshot_date)` | Daily snapshot symboli per CEX (dla diff detection) |
| `klines_5m` | `(exchange, symbol, ts)` | OHLCV 5m z WS + REST backfill |
| `klines_15m` | `(exchange, symbol, ts)` | OHLCV 15m |
| `funding_history` | `(exchange, symbol, ts)` | Funding rate per 8h |
| `open_interest` | `(exchange, symbol, ts)` | OI snapshots |
| `signals` | `id` | Module 1 output |
| `paper_trades` | `id` | Simulated trades |
| `backtest_runs` | `id` | Backtest metadata + metrics |
| `new_listings` | `id` | Module 3 detected listings (timestamp + which filter sets match) |
| `new_listing_filters` | `id` | User-defined filter sets (config.yaml defaults + UI overrides) |
| `ws_status` | `(exchange, connection_id)` | WS connection health metrics |

---

## Data flow end-to-end

### Flow A: Live data ingestion (continuous)

```
┌─────────────────┐  WS frames    ┌──────────────┐
│ 4× WebSocket    │ ─────────────>│ WS Handlers  │
│ connections     │  per CEX      │ (per CEX)    │
│ (Binance/Bybit/ │               └──────┬───────┘
│ OKX/Coinbase)   │                      │ normalize
└─────────────────┘                      ▼
                                  ┌──────────────┐
                                  │ Memory buffer│
                                  │ (asyncio Q)  │
                                  └──────┬───────┘
                                         │ batch (30s lub 1k events)
                                         ▼
                                  ┌──────────────┐
                                  │ DuckDB bulk  │
                                  │ INSERT       │
                                  │ klines_5m    │
                                  │ klines_15m   │
                                  │ funding_     │
                                  │ history      │
                                  │ open_interest│
                                  └──────────────┘
```

### Flow B: Daily universe + New Listings detection

```
┌──────────────┐  daily cron   ┌──────────────┐
│ CEX REST     │ ─────────────>│ Symbols      │
│ /exchangeInfo│   per CEX     │ Snapshot     │
└──────────────┘               └──────┬───────┘
                                      │ store today
                                      ▼
┌──────────────┐               ┌──────────────┐
│ Yesterday    │  diff today   │ cex_symbols_ │
│ snapshot     │<──────────────│ snapshot     │
└──────┬───────┘               └──────────────┘
       │ new symbols today
       ▼
┌──────────────┐               ┌──────────────┐
│ Module 3:    │  apply filter │ new_listings │
│ New Listings │ ─────────────>│ (per filter  │
│ Detector     │  sets match   │ set match)   │
└──────────────┘               └──────────────┘
                                      │
                                      ▼
                               ┌──────────────┐
                               │ Telegram +   │
                               │ Dashboard    │
                               │ (alert opt)  │
                               └──────────────┘
```

### Flow C: Module 1 signal detection (continuous)

```
┌──────────────┐    every 5m   ┌──────────────┐
│ Universe     │ ─────────────>│ Module 1     │
│ active list  │   per token   │ Scorer       │
│ (~3-4k)      │               │ (7 signals)  │
└──────────────┘               └──────┬───────┘
                                      │ score > tier_threshold?
                                      ▼
┌──────────────┐  alert        ┌──────────────┐
│ signals      │ ─────────────>│ Telegram +   │
│ table        │               │ Dashboard    │
└──────────────┘               └──────────────┘
```

---

## Configuration model

Pełen `config.yaml` (gitignored — może mieć values; template w `config.example.yaml`):

```yaml
universe:
  refresh_interval_h: 24
  cex_priority: [binance, bybit, okx, coinbase]
  stablecoin_blacklist: [USDT, USDC, DAI, FDUSD, TUSD, USDD, PYUSD, FRAX, USDe, USDS]
  wrapped_synthetic_blacklist: [WBTC, WETH, stETH, weETH, jupSOL, jitoSOL, cbETH, LsETH]
  delisted_zero_volume_days: 7

websocket:
  binance:
    spot_endpoint: "wss://stream.binance.com:9443/stream"
    futures_endpoint: "wss://fstream.binance.com/stream"
    streams_per_connection: 1024
    reconnect_max_delay_s: 60
    heartbeat_interval_s: 30
  bybit:
    spot_endpoint: "wss://stream.bybit.com/v5/public/spot"
    linear_endpoint: "wss://stream.bybit.com/v5/public/linear"
    heartbeat_interval_s: 20
  okx:
    public_endpoint: "wss://ws.okx.com:8443/ws/v5/public"
    streams_per_connection: 200
    heartbeat_interval_s: 25
  coinbase:
    endpoint: "wss://ws-feed.exchange.coinbase.com"

  buffer:
    flush_interval_s: 30
    flush_size_events: 1000

module1_accumulation:
  scoring_interval_min: 5
  weights:
    volume_rising: 0.20
    funding_skew: 0.20
    oi_buildup: 0.15
    cross_exchange_divergence: 0.15
    liquidation_imbalance: 0.10
    social_velocity: 0.10
    bid_ask_imbalance: 0.10
  tiers:
    tier_1: { rank_max: 100, alert_threshold: 70, cooldown_hours: 12 }
    tier_2: { rank_max: 500, alert_threshold: 65, cooldown_hours: 8 }
    tier_3: { rank_max: 2000, alert_threshold: 60, cooldown_hours: 4 }
    tier_4: { rank_max: 999999, alert_threshold: 55, cooldown_hours: 2 }

module2_backtest:
  default_universe: top_100
  walk_forward: { train_days: 60, test_days: 14, slide_days: 14 }
  fees: { binance: 0.001, bybit: 0.001, okx: 0.001, coinbase: 0.004 }
  slippage: { base_bps: 2, impact_factor: 1.5 }

module3_new_listings:
  enabled: true
  source_priority: ["binance_announcements_rss", "cex_diff_snapshot"]
  diff_check_interval_h: 1     # co godzinę porównujemy snapshot dla świeżych listingów

  filter_sets:
    - name: conservative
      enabled: true
      min_market_cap_usd: 10_000_000
      min_volume_24h_usd: 1_000_000
      min_cex_listings: 2
      max_age_hours: 168
      required_quote_assets: ["USDT", "USDC"]
      required_has_perpetual: true
      exclude_stablecoins: true
      exclude_wrapped: true
      alert_on_match: true

    - name: aggressive_alts
      enabled: true
      min_market_cap_usd: 1_000_000
      min_volume_24h_usd: 100_000
      min_cex_listings: 1
      max_age_hours: 72
      required_quote_assets: ["USDT"]
      exclude_stablecoins: true
      exclude_wrapped: true
      alert_on_match: false

output:
  telegram:
    enabled: false
    daily_alert_cap: 50          # zwiększone bo więcej źródeł (M1+M3)
  dashboard:
    host: 127.0.0.1
    port: 8001
```

---

## Decyzje i tradeoffs

| Decyzja | Wybór | Alternatywa | Rationale |
|---|---|---|---|
| Język | Python 3.11+ | Rust dla perf | Match parent, asyncio dla I/O-heavy |
| DB | DuckDB + parquet | Postgres / SQLite | Embedded, columnar, scale-friendly |
| Universe scope | Wszystko z 4 CEX (~3-4k) | Top 5000 z CMC | User: full coverage, brak aggressive cap |
| Data primary | WebSocket streams | REST polling | $0, no rate limit, real-time push |
| Data secondary | REST API (backfill+sanity) | Only WS | Need historical + sanity reconcile |
| Exchange priority | Binance/Bybit/OKX/Coinbase | All 14 | ~95% global volume, best WS APIs |
| Module count | 3 (accumulation + backtest + new listings) | 2 (poprzednio) | New Listings re-added per user feedback |
| Tier classification | 1-4 (top100/500/2000/rest) | 1-3 | Rozszerzone na 4 tiery bo full universe |
| Output | Sygnały + paper trading | Auto-trading | User wybór, niskie ryzyko |
| Repo | Standalone | Worktree parent | Czysta izolacja |
| New Listings source | CEX diff snapshot + RSS | CoinGecko paid | $0, własna kontrola |
| New Listings filters | config.yaml + dashboard UI | Tylko config | Flexible runtime override |

**Odrzucone podejścia:**

- ❌ REST polling jako primary live data — rate limit issues przy 4000 tokens × 4 CEX
- ❌ Aggressive filter cap (top 5000 only) — user explicit chce full coverage CEX
- ❌ DEX adapters / fresh DEX monitor — out of scope (osobny projekt)
- ❌ CoinGecko Pro paid — niepotrzebny gdy WS pokrywa wszystko

---

## Skala i performance

### Volume estimates

| Komponent | Skala | Storage estimate (DuckDB columnar 3x compression) |
|---|---|---|
| Universe rebuild | ~4000 tokens × daily | ~5MB/dzień |
| Klines 5m (4 CEX × 4000 tokens) | ~4000 × 3 listings avg × 288 candles/d | ~13GB/rok |
| Klines 15m | ÷3 | ~4.5GB/rok |
| Funding (perpetuals ~600 × 3 CEX) | 600 × 3 × 3 calls/d | <500MB/rok |
| Open Interest | 600 × 3 × 24 calls/d | ~2GB/rok |
| Signals | ~100 alerts/d × tier breakdown | <1GB/rok |
| New listings detection | ~20 nowych/d × 4 CEX × filter matches | <100MB/rok |
| CEX symbols snapshot | ~4000 × 4 CEX × 365 days | <500MB/rok |

**Total roczny: ~25-30GB DuckDB.** Po 2-3 latach archiwizacja klines >90 dni do parquet (cold storage).

### Performance targets

| Operacja | Target latency |
|---|---|
| WS frame ingestion | <100ms (frame → buffer) |
| Bulk INSERT do DuckDB | <500ms per batch 1000 events |
| Universe rebuild | <10 min |
| Module 1 scoring single token | <50ms (CPU) |
| Module 1 scoring full universe (~4000) | <2 min (parallel asyncio) |
| New listings detection (daily diff) | <30s |
| Backtest top_100 × 1 strategy × 1 year | <5 min |

### Bottleneck — gone z WebSocket

- **API rate limits:** problem ZNIKA z WS-first (no outgoing requests w hot path)
- **WebSocket connection limit:** ~9 connections total — wszystkie CEX'y obsłużą bez problemu
- **DuckDB writes:** primary bottleneck teraz. Bulk INSERT w transakcji = >100k rows/sec OK
- **Memory:** WS buffer max ~30s × ~5000 frames/s = 150k frames = ~200MB OK
- **Backfill REST:** 1-time start cost, nieblokujący live

### Cost estimate

| Resource | Free tier coverage | Paid (jeśli) |
|---|---|---|
| CoinGecko API | 30 req/min (24h rebuild = OK) | $129/mo Pro jeśli market cap rankings częstsze |
| CMC API | 333 req/d (cross-check OK) | $79/mo jeśli więcej |
| Binance/Bybit/OKX/Coinbase WS | UNLIMITED (free) | — |
| Binance/Bybit/OKX/Coinbase REST | Free (backfill + sanity) | — |
| Server | Local dev | $20-50/mo VPS jeśli zdalny (Faza 7+) |

**Faza 0-6: 100% darmowe.** Płatne tylko gdyby user zdecydował na Coinbase Premium dla rate limit increase (mało prawdopodobne).
