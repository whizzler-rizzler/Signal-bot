# Architektura — Deep Owl

> **Single source of truth** dla architektury systemu. Wszelkie zmiany strukturalne MUSZĄ być najpierw odzwierciedlone tutaj (potem optional: DOCX snapshot, ADR jeśli decyzja jest odwracalna).

## Spis treści

1. [System overview](#system-overview)
2. [Layered architecture](#layered-architecture)
3. [Module 1: Early Accumulation Detector](#module-1-early-accumulation-detector)
4. [Module 2: Fresh Projects Monitor](#module-2-fresh-projects-monitor)
5. [Module 3: Backtesting Engine](#module-3-backtesting-engine)
6. [Output layer](#output-layer)
7. [Storage — DuckDB schema](#storage--duckdb-schema)
8. [Data flow end-to-end](#data-flow-end-to-end)
9. [Configuration model](#configuration-model)
10. [Decyzje i tradeoffs](#decyzje-i-tradeoffs)

---

## System overview

```
            ┌────────────────────────────────────────────────────────────┐
            │                  DEEP OWL (standalone repo)                │
            └────────────────────────────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
   ┌────▼─────┐                  ┌─────▼─────┐                  ┌─────▼─────┐
   │  DATA    │                  │  ENGINE   │                  │  OUTPUT   │
   │  LAYER   │                  │  LAYER    │                  │  LAYER    │
   └──────────┘                  └───────────┘                  └───────────┘
        │                              │                              │
        │ Dexscreener (multi-chain)    │ Module 1: Accumulation       │ Telegram bot
        │ Birdeye (Solana priority)    │   Detector                   │ FastAPI Dashboard :8001
        │ Parent CEX recorder reuse    │ Module 2: Fresh Monitor      │ Paper Trader (sim PnL)
        │ Social_media_scanner reuse   │ Module 3: Backtester         │
        │ RugCheck + GoPlus (Faza 5)   │                              │
        └──────────────┬───────────────┘                              │
                       │                                              │
                ┌──────▼──────────────────────────────────────────────┘
                │                  STORAGE LAYER
                │                ┌─────────────┐
                │                │   DuckDB    │
                │                └─────────────┘
                │   tokens · signals · fresh_projects · paper_trades
                │   candles_5m · candles_15m · backtest_runs
```

## Layered architecture

| Layer | Odpowiedzialność | Pliki |
|---|---|---|
| **Data adapters** | I/O do external API + parent recorder. Normalizacja do common models. | `src/deep_owl/data/` |
| **Storage** | DuckDB persistence + schema migrations | `src/deep_owl/db/` |
| **Engine modules** | Logika biznesowa: scoring, lifecycle, backtest | `src/deep_owl/modules/` |
| **Output** | Telegram, FastAPI dashboard, paper trader | `src/deep_owl/output/` |
| **CLI** | Entry points: `deep-owl discover`, `deep-owl backtest`, `deep-owl serve` | `src/deep_owl/cli.py` |
| **Config** | Pydantic Settings + .env loading | `src/deep_owl/config.py` |

Każda warstwa zależy TYLKO od warstw poniżej. Output nie zna szczegółów Data adapters. Engine nie zna szczegółów Storage (przez repository interface).

---

## Module 1: Early Accumulation Detector

**Pytanie:** Czy ten token akumuluje się PRZED pumpem?

### Sygnały (weighted sum → score 0-100)

| Sygnał | Metoda | Default threshold | Default waga |
|---|---|---|---|
| Volume rising on flat/down price | `vol_24h / vol_7d_avg > 2.0` ORAZ `price_chg_24h ∈ [-5%, +5%]` | 2.0 | 0.20 |
| LP depth growth | `liquidity_usd[now] - liquidity_usd[24h_ago] > +20%` | +20% | 0.15 |
| Holder count growth | `holders[now] / holders[24h_ago] > 1.15` | +15% | 0.15 |
| Top-10 wallet concentration drop | `top10_pct[now] - top10_pct[24h_ago] < -3pp` | -3pp | 0.10 |
| Buy/sell tx ratio | `buys_1h / sells_1h > 1.3` | 1.3 | 0.15 |
| Social mention velocity (opt) | `mentions_1h / mentions_24h_avg > 3.0` | 3.0 | 0.15 |
| CEX bid imbalance (jeśli na CEX) | `bid_volume / ask_volume > 1.5` (orderbook L5) | 1.5 | 0.10 |

**Score formula:**
```
score = Σ (signal_normalized * weight) * 100
gdzie signal_normalized ∈ [0, 1] (sigmoid lub clip threshold)
```

**Próg alertowy:** configurable per token w `config.yaml`, default `65`.

### Universe

- Top 500 tokenów z Dexscreener trending endpoint
- Plus nowe pary z liquidity > $10k (cross-reference z Modułem 2)
- Wyklucza blacklisted tokens (tabela `tokens.is_blacklisted`)

### Cadence

- Polling co **60s** (Dexscreener cache + rate limit 60/min)
- Birdeye top-up co **5min** dla Solana priority tokens

---

## Module 2: Fresh Projects Monitor

**Pytanie:** Czy ten świeży token rokuje, czy to rugpull?

### Lifecycle stages

| Stage | Wiek | Filter |
|---|---|---|
| 0 | 0-1h | **Rugpull check** (blokujący — wykluczamy z dalszego trackingu jeśli fail) |
| 1 | 1-6h | Initial validation (early growth indicators) |
| 2 | 6-24h | Survival window (czy nie umarł?) |
| 3 | 1-7d | Growth phase (najbardziej interesujący dla Modułu 1) |
| 4 | 7-30d | Maturity check (graduacja do "established") |

### Rugpull filter (Stage 0)

Token wykluczony jeśli SPEŁNIA którekolwiek:

- Liquidity NOT locked (RugCheck.xyz dla Solana / GoPlus dla EVM)
- Mint authority NOT renounced (Solana SPL)
- Top-1 holder > 25% supply
- Liquidity < $5k USD
- Dev wallet sprzedał > 50% holdings w ostatnich 24h
- Honeypot detected (GoPlus `is_honeypot=true`)

### Growth scoring (Stage 1+)

```
growth_score = w1*volume_velocity + w2*holder_growth + w3*liquidity_stability
             + w4*buy_pressure + w5*social_pickup
```

Weights → `config.yaml`, default równe (0.2 każdy).

### Output → Module 1 handoff

Tokeny z `growth_score > 60` AND `lifecycle_stage >= 2` → automatycznie dodawane do universe Modułu 1 dla deeper accumulation analysis.

---

## Module 3: Backtesting Engine

**Pytanie:** Czy moja strategia ZADZIAŁAŁABY na historycznych pumpach?

### Komponenty

```
backtest/
├── candles.py      # Aggregator: tick zst → OHLCV 5m/15m → DuckDB
├── engine.py       # Backtest runner (walk-forward, vectorized)
├── strategies/
│   ├── base.py     # Strategy interface (signal → entry/exit decision)
│   ├── breakout_consolidation.py
│   ├── volume_spike.py
│   └── rsi_divergence.py
├── slippage.py     # Slippage model (linear w funkcji size/liquidity)
├── fees.py         # Per-exchange fee table
└── metrics.py      # Sharpe, Sortino, Calmar, max DD, win rate
```

### Strategy interface

```python
class Strategy(Protocol):
    name: str
    params: dict[str, Any]

    def warmup_bars(self) -> int: ...
    def on_bar(self, ctx: BacktestContext) -> Optional[Signal]: ...
```

`Signal` = `{ side: buy|sell, size_usd: float, stop_loss_pct: float, take_profit_pct: float }`

### Walk-forward

- Train window: 60 dni
- Test window: 14 dni
- Slide: 14 dni
- Out-of-sample: zawsze ≥ 30% total dataset

### Metrics

| Metryka | Definicja |
|---|---|
| Win rate | `wins / total_trades` |
| Avg PnL | `mean(trade_pnl_pct)` |
| Total PnL | `sum(trade_pnl_usd)` |
| Sharpe | `mean(ret) / std(ret) * sqrt(252)` (annualized) |
| Sortino | jak Sharpe ale denominator = downside std |
| Calmar | `annualized_return / max_drawdown` |
| Max DD | `max(running_max - equity) / running_max` |
| Max DD duration | bars between peak i recovery |
| Exposure time | `% bars in-position` |

### Universe

- **Faza 3 start:** BTC, ETH, HYPE (parent CEX archives od 2026-04-08, mamy realne dane)
- **Faza 3+:** rozszerzenie na top-50 alts po dodaniu Birdeye historical (paid tier $99/mo growth)

---

## Output layer

### Telegram bot

**Komendy:**
- `/start` — register chat
- `/signals` — ostatnie 10 sygnałów z Modułu 1
- `/fresh` — top fresh projects z Modułu 2
- `/paper` — paper trading PnL summary
- `/backtest <strategy>` — uruchom backtest na default universe
- `/mute <token>` — wycisz alerty dla tokena (12h)

**Alert format:**
```
[score: 78/100] SOL: $BONK
DEX: Raydium  Liquidity: $2.1M
Signals: vol +245% on flat price · LP +32% (24h) · holders +18%
Chart: https://dexscreener.com/solana/{pair}
```

### FastAPI dashboard (port 8001, local-only `127.0.0.1`)

**Zakładki:**
1. **Live Signals** — table z auto-refresh (HTMX), score + breakdown per signal
2. **Fresh Projects** — lista z filtrem lifecycle stage + growth score
3. **Paper Trading** — open positions + closed trades + cumulative PnL
4. **Backtests** — uruchamianie + historia runs + HTML reports inline
5. **Settings** — view-only (config.yaml)

### Paper Trader (simulated fill engine)

- Entry: market order @ current best price + slippage(size, liquidity)
- Exit: stop_loss / take_profit / time_stop (configurable)
- Fees: per-exchange table (Binance: 0.1%, Raydium: 0.25%, etc.)
- Slippage model:
  ```
  slippage_bps = base_bps + (size_usd / liquidity_usd) * 10000 * impact_factor
  default: base_bps=5, impact_factor=2.0
  ```

---

## Storage — DuckDB schema

Pełny schema w `src/deep_owl/db/schema.sql`. Tabele:

| Tabela | PK | Cel |
|---|---|---|
| `tokens` | `token_address` | Master tokens recognized w systemie |
| `signals` | `id` | Output Modułu 1 (timestamp, score, breakdown JSON) |
| `fresh_projects` | `(token_address, snapshot_ts)` | Time-series state Modułu 2 |
| `paper_trades` | `id` | Open + closed positions, simulated PnL |
| `candles_5m` | `(exchange, symbol, ts)` | OHLCV aggregated z tick data |
| `candles_15m` | `(exchange, symbol, ts)` | Jw, 15min interval |
| `backtest_runs` | `id` | Metadata per backtest run + metrics JSON |

**Migracje:** schema.sql z `--+ migration: N` markerami. Wersja DB w tabeli `_meta`.

**Backup:** copy pliku `data/deep_owl.duckdb` przed major schema change.

---

## Data flow end-to-end

### Flow A: Live signal detection (od fazy 4+)

```
┌─────────────┐    poll 60s    ┌──────────────┐
│ Dexscreener │ ──────────────>│ data layer   │
│ Birdeye     │                │ TokenSnapshot│
└─────────────┘                └──────┬───────┘
                                      │ persist
                                      ▼
┌─────────────────┐            ┌──────────────┐
│ Module 1        │<───────────│ DuckDB       │
│ Accumulation    │            │ tokens       │
│ Detector        │            │ +snapshots   │
└────────┬────────┘            └──────────────┘
         │ score > 65?
         ▼
┌─────────────────┐  alert     ┌──────────────┐
│ signals table   │ ──────────>│ Telegram bot │
│                 │            │ + Dashboard  │
└─────────────────┘            └──────────────┘
```

### Flow B: Backtest run (od fazy 3+)

```
┌──────────────────┐                  ┌───────────────┐
│ Parent recorder  │   read-only      │ Candle        │
│ zst tick archives│ ────────────────>│ aggregator    │
│ (BTC/ETH/HYPE)   │                  │ → OHLCV 5/15m │
└──────────────────┘                  └───────┬───────┘
                                              │ persist
                                              ▼
┌──────────────┐    select bars    ┌──────────────────┐
│ Backtest     │<──────────────────│ candles_5m       │
│ Engine       │                   │ candles_15m      │
│ + Strategy   │                   └──────────────────┘
└──────┬───────┘
       │ metrics + trades
       ▼
┌─────────────────┐  HTML report  ┌──────────────┐
│ backtest_runs   │ ─────────────>│ Dashboard    │
│ (DuckDB)        │               │ Backtests tab│
└─────────────────┘               └──────────────┘
```

---

## Configuration model

`config.yaml` (gitignored — może mieć values; template w `config.example.yaml`):

```yaml
universe:
  dexscreener_trending_top: 500
  min_liquidity_usd: 10000

module1_accumulation:
  poll_interval_s: 60
  alert_threshold: 65
  weights:
    volume_rising: 0.20
    lp_growth: 0.15
    holder_growth: 0.15
    top10_drop: 0.10
    buy_pressure: 0.15
    social_velocity: 0.15
    cex_imbalance: 0.10

module2_fresh:
  rugpull_filter:
    max_top1_holder_pct: 25
    min_liquidity_usd: 5000
    require_lp_locked: true
    require_mint_renounced: true
  scoring_weights:
    volume_velocity: 0.20
    holder_growth: 0.20
    liquidity_stability: 0.20
    buy_pressure: 0.20
    social_pickup: 0.20

module3_backtest:
  default_universe: ["BTC-USDT@binance", "ETH-USDT@binance", "HYPE-USDC@hotstuff"]
  walk_forward:
    train_days: 60
    test_days: 14
    slide_days: 14
  fees:
    binance: 0.001
    bybit: 0.001
    raydium: 0.0025
    jupiter: 0.0025
  slippage:
    base_bps: 5
    impact_factor: 2.0

output:
  telegram:
    enabled: false  # włącz w fazie 6
    cooldown_per_token_hours: 6
    daily_alert_cap: 20
  dashboard:
    host: 127.0.0.1
    port: 8001
```

**Loading:** `pydantic-settings` + `.env` overrides (env vars TRUMP yaml).

---

## Decyzje i tradeoffs

| Decyzja | Wybór | Alternatywa | Rationale |
|---|---|---|---|
| Język | Python 3.11+ | Rust dla perf | Match parent, asyncio dla I/O-heavy |
| DB | DuckDB | Postgres / SQLite | Embedded, columnar (świetne dla backtest), 1-file backup, brak serwera |
| Chains scope | Multi-chain agregat (Dexscreener) | Per-chain native (Solana RPC, eth_call) | Łatwiejszy start, mniej do utrzymania, agregator pokrywa 200+ chains |
| Bot output | Sygnały + paper trading | Auto-trading | User wybór, niskie ryzyko, można dłużej testować bez kapitału |
| Repo | Standalone | Worktree parent | Czysta izolacja od market_maker context |
| Backtest data source | Parent CEX recorder | Birdeye historical (paid) | Mamy już dane od 2026-04-08 (BTC/ETH/HYPE), $0 koszt |
| Schedule rugpull check | Stage 0 only | Continuous | Drogie API calls, raz przy launch wystarczy + manual override |
| Async runtime | asyncio + aiohttp | trio, curio | Standard, najwięcej libs |
| Telegram lib | python-telegram-bot v20 | aiogram | Aiogram szybszy, ale PTB ma większą community i przykłady |

**Ważne odrzucone podejścia:**

- ❌ Microservices (Module 1/2/3 jako osobne services) — overkill dla solo dev, monolith wystarczy
- ❌ Kafka / RabbitMQ event bus — DuckDB + asyncio queue wystarczą do scale ~1M signals/mo
- ❌ Real-time WebSocket DEX feed — Dexscreener API tylko REST, polling 60s OK dla early-stage detection (nie HFT)
- ❌ Custom orderbook reconstruction — niepotrzebne, używamy aggregated 24h volume/liquidity z API
