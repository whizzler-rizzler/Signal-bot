# Architektura — Deep Owl

> **Single source of truth** dla architektury systemu. Wszelkie zmiany strukturalne MUSZĄ być najpierw odzwierciedlone tutaj (potem optional: DOCX snapshot, ADR jeśli decyzja jest odwracalna).

## Spis treści

1. [System overview](#system-overview)
2. [Layered architecture](#layered-architecture)
3. [Universe building — co skanujemy](#universe-building)
4. [Module 1: Big Cap Accumulation Detector](#module-1-big-cap-accumulation-detector)
5. [Module 2: Backtesting Engine](#module-2-backtesting-engine)
6. [Output layer](#output-layer)
7. [Storage — DuckDB schema](#storage--duckdb-schema)
8. [Data flow end-to-end](#data-flow-end-to-end)
9. [Configuration model](#configuration-model)
10. [Decyzje i tradeoffs](#decyzje-i-tradeoffs)
11. [Skala i performance](#skala-i-performance)

---

## System overview

```
            ┌────────────────────────────────────────────────────────────┐
            │                  DEEP OWL (standalone repo)                │
            │           BIG CAPS CEX-FIRST — top ~5000 tokens            │
            └────────────────────────────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
   ┌────▼─────┐                  ┌─────▼─────┐                  ┌─────▼─────┐
   │  DATA    │                  │  ENGINE   │                  │  OUTPUT   │
   │  LAYER   │                  │  LAYER    │                  │  LAYER    │
   └──────────┘                  └───────────┘                  └───────────┘
        │                              │                              │
        │ CoinMarketCap API            │ Universe Builder             │ Telegram bot
        │ CoinGecko API                │   (filter ~5k z 10k+)        │ FastAPI Dashboard :8001
        │ Binance/Bybit/OKX/           │                              │ Paper Trader (sim PnL)
        │   Coinbase REST klines       │ Module 1: Accumulation       │
        │ Funding + OI + Liquidations  │   Detector (CEX big caps)    │
        │ Parent recorder reuse        │ Module 2: Backtester         │
        │   (BTC/ETH/HYPE tick precis.)│   (REST historical klines)   │
        │ Social_media_scanner reuse   │                              │
        │   (parent, opt)              │                              │
        └──────────────┬───────────────┘                              │
                       │                                              │
                ┌──────▼──────────────────────────────────────────────┘
                │                  STORAGE LAYER
                │                ┌─────────────┐
                │                │   DuckDB    │
                │                └─────────────┘
                │   tokens · token_listings · klines_5m · klines_15m
                │   funding_history · open_interest · signals
                │   paper_trades · backtest_runs
```

## Layered architecture

| Layer | Odpowiedzialność | Pliki |
|---|---|---|
| **Data adapters** | I/O do CMC, CoinGecko, CEX REST APIs + parent recorder reuse. Normalizacja do common models. | `src/deep_owl/data/` |
| **Storage** | DuckDB persistence + schema migrations + partitioning dla skali | `src/deep_owl/db/` |
| **Engine modules** | Universe builder, accumulation scoring, backtest | `src/deep_owl/modules/` |
| **Output** | Telegram, FastAPI dashboard, paper trader | `src/deep_owl/output/` |
| **CLI** | Entry points: `deep-owl universe build`, `deep-owl detect`, `deep-owl backtest`, `deep-owl serve` | `src/deep_owl/cli.py` |
| **Config** | Pydantic Settings + .env loading + filter rules | `src/deep_owl/config.py` |

---

## Universe building

**Co to jest:** lista ~5000 tokenów które realnie monitorujemy. NIE skanujemy całego CMC (10k+ z których 70% to dead/scam) — filtrujemy aktywne.

**Source primary:** CoinGecko `/coins/markets` (paginated, free tier wystarczy dla daily refresh)
**Source secondary/cross-check:** CoinMarketCap `/cryptocurrency/listings/latest` (free tier ma niski limit, używamy do sanity check)

**Filter pipeline (pseudocode):**
```
universe = []
for token in coingecko.markets(per_page=250, paginate_until=10000):
    if token.market_cap_usd < config.min_market_cap_usd:    # default $1M
        continue
    if token.volume_24h_usd < config.min_volume_24h_usd:    # default $100k
        continue
    if token.symbol in config.stablecoin_blacklist:         # USDT, USDC, DAI...
        continue
    if token.symbol in config.wrapped_synthetic_blacklist:  # WBTC, stETH...
        continue
    if token.age_days < config.min_age_days:                # default 30
        continue
    listings = detect_cex_listings(token)                   # check Binance/Bybit/OKX/Coinbase symbols
    if len(listings) < config.min_cex_listings:             # default 2
        continue
    universe.append({token, listings})
return universe   # ~5000 entries expected
```

**Refresh:** co 24h pełen rebuild. Delta tracking: nowe tokeny w universe, usunięte tokeny (delisted / spadły poniżej filter).

**Persist:** tabela `tokens` + `token_listings` (per CEX listing per token).

---

## Module 1: Big Cap Accumulation Detector

**Pytanie biznesowe:** Czy ten established token akumuluje się PRZED breakoutem?

### Sygnały (weighted sum → score 0-100)

Per token w universe, co N minut, liczymy 6 sygnałów:

| # | Sygnał | Metoda | Default threshold | Default waga |
|---|---|---|---|---|
| 1 | Volume rising on flat/down price | `vol_24h / vol_7d_avg > 2.0` ORAZ `price_chg_24h ∈ [-5%, +5%]` | 2.0 | 0.20 |
| 2 | Funding rate skew | `avg(funding_rate_8h)` < -0.01% przez 24h (negative funding = shorts crowded → squeeze setup) | -0.01% | 0.20 |
| 3 | Open Interest buildup | `OI_24h - OI_7d_avg` > +20% AND price stable (±5%) | +20% | 0.15 |
| 4 | Cross-exchange volume divergence | jeden CEX ma >2x volume vs inne (smart money concentrating) | 2x | 0.15 |
| 5 | Liquidation imbalance | `long_liq_24h / short_liq_24h` > 2.0 (longs flushed = potential bottom) | 2.0 | 0.10 |
| 6 | Social mention velocity (opt) | `mentions_1h / mentions_24h_avg > 3.0` | 3.0 | 0.10 |
| 7 | Bid/ask order book imbalance (jeśli mamy access) | bid_volume / ask_volume > 1.5 (orderbook L5) | 1.5 | 0.10 |

**Score formula:**
```
score = Σ (signal_normalized * weight) * 100 / total_active_weight
gdzie signal_normalized ∈ [0, 1] (sigmoid od threshold)
```

**Próg alertowy:** configurable per token-tier (top 100 strict 70+, top 1000 medium 65+, reszta soft 60+).

### Sygnały — uzasadnienie metodologiczne

**Sygnał 1 (volume on flat price):** klasyczny smart money pattern. Akumulacja PRZED breakout zwykle pokazuje wysoki volume bez ruchu ceny (smart money kupuje od retail panicked sellers). Klasyk z Wyckoff method.

**Sygnał 2 (funding skew):** specyficzny dla perpetual futures (nie ma na spot). Negative funding = shorty płacą longom = za dużo shortów = ich crowded position podatna na squeeze. Backtest historyczny pokazuje że kombinacja negative funding + low volatility często poprzedza pumpy 5-15% w 24-72h.

**Sygnał 3 (OI buildup):** rosnący Open Interest przy stabilnej cenie = nowy kapitał napływa do pozycji. Kierunek nie jest jasny (longs vs shorts), ale w połączeniu z Sygnałem 2 (negative funding) jednoznacznie wskazuje na build-up shorts → squeeze potential.

**Sygnał 4 (cross-exchange divergence):** smart money często koncentruje aktywność na jednym CEX (najlepsza płynność, niższe koszty). Jeśli volume na Bybit jest 2x vs Binance dla danego tokena — coś się dzieje na Bybit (Asian retail momentum, market maker positioning, etc.).

**Sygnał 5 (liquidation imbalance):** masowe liquidations longów to często capitulation/bottom. Znacznie więcej long liq niż short liq w 24h = "weak hands flushed", potencjalna lepsza relative entry.

**Sygnał 6 (social):** opcjonalne, wymaga parent `Social_media_scanner` running. Velocity > 3x = nagły wzrost zainteresowania, często poprzedza retail FOMO.

**Sygnał 7 (bid/ask imbalance):** tylko jeśli mamy snapshot orderbook (parent recorder ma dla BTC/ETH/HYPE; dla pozostałych tokenów REST API CEX-ów daje top-of-book). Imbalance > 1.5x na bid side = bid pressure.

### Cadence — częstotliwość skanowania

| Komponent | Interval | Rationale |
|---|---|---|
| Universe rebuild | 24h | Mało zmienne; delisting/listing rzadkie |
| Klines pull (5m/15m) | per CEX rate limit (Binance: 6000 weight/min — pull batched) | Świeże dane co interval świecy |
| Funding rates pull | 8h (funding cykl) | Tyle ile warto |
| Open Interest pull | 1h | Wolniej zmienne |
| Module 1 scoring | 5m (po zamknięciu świecy 5m) | Świeży snapshot → świeży score |
| Telegram alert send | Async, po INSERT signal | Cooldown 6h per token |

### Universe tier-aware scoring

Nie wszystkie tokeny są sobie równe. Tier-aware threshold:

| Tier | Definicja | Alert threshold | Cooldown |
|---|---|---|---|
| Tier 1 (top 100) | Top 100 by market cap | 70+ | 12h |
| Tier 2 (top 500) | 101-500 | 65+ | 8h |
| Tier 3 (top 5000) | 501-5000 | 60+ | 4h |

Rationale: top 100 mają lepsze data quality, większe moves wymagają wyższych scores. Niskie tiery są bardziej zaszumione, niższy threshold + krótszy cooldown żeby nie przegapić sezonu alt.

---

## Module 2: Backtesting Engine

**Pytanie biznesowe:** Czy moja strategia ZADZIAŁAŁABY na historycznych pumpach big cap?

### Komponenty

```
backtest/
├── candles.py         # Pull historical klines z CEX REST (Binance ma do 2017, Bybit 2020+)
├── universe.py        # Wybór tokenów do backtestu (subset z universe builder)
├── strategies/
│   ├── base.py        # Strategy interface (Protocol): warmup_bars + on_bar
│   ├── breakout_consolidation.py  # Bollinger Squeeze + volume confirmation
│   ├── volume_spike.py            # vol > 3x SMA20 + close > prev high
│   ├── funding_squeeze.py         # negative funding + price consolidation → long entry
│   └── rsi_divergence.py
├── slippage.py        # Linear model
├── fees.py            # Per-CEX fee table
├── metrics.py         # Sharpe, Sortino, Calmar, max DD, win rate
└── engine.py          # Walk-forward runner
```

### Strategy interface

```python
class Strategy(Protocol):
    name: str
    params: dict[str, Any]

    def warmup_bars(self) -> int: ...
    def on_bar(self, ctx: BacktestContext) -> Optional[Signal]: ...
```

`Signal` = `{ side: buy|sell, size_usd: float, stop_loss_pct: float, take_profit_pct: float, max_hold_bars: int }`

### Walk-forward analysis

- Train window: 60 dni
- Test window: 14 dni
- Slide: 14 dni
- Out-of-sample: zawsze ≥ 30% total dataset

### Universe backtestu

- **Faza 4 start:** Top 100 tokenów (manageable scale, dobre data quality)
- **Faza 4+:** rozszerzenie na top 500 → top 5000 (po sanity check że pipeline działa)
- **Per-CEX selection:** dla każdego tokena pick CEX z najdłuższą historią (zwykle Binance dla większości)

### Metrics (per backtest run)

| Metryka | Definicja | Target |
|---|---|---|
| Win rate | wins / total_trades | >50% |
| Avg PnL | mean(trade_pnl_pct) | Positive po fees |
| Total PnL | sum(trade_pnl_usd) | Absolute zysk |
| Sharpe | mean(ret) / std(ret) * √252 (annualized) | >1 (>2 świetne) |
| Sortino | jak Sharpe, denominator = downside std | >1.5 |
| Calmar | annualized_return / max_drawdown | >2 |
| Max DD | max(peak - trough) / peak | <25% pref. |
| Max DD duration | bars between peak and recovery | krótkie = lepsze |
| Exposure time | % bars in-position | 30-70% optymalne |
| Trade count | liczba completed trades | >30 dla istotności statystycznej |

### Cross-validation Modułu 1

Ważny use case: backtest sygnałów Modułu 1 (czy alerty BYŁY przed breakoutami historycznie). Ten projekt ma to w scope BO mamy pełną historię klines z CEX REST.

```
Krok 1: Pull historical klines + funding + OI dla top 100 tokenów (1-2 lata)
Krok 2: Replay Module 1 scoring na każdej świecy
Krok 3: Compare alerty (score > threshold) vs realne breakouts (price +20% w 24h od alertu)
Krok 4: Precision/Recall/F1 per signal weight config
Krok 5: Tune wagi (grid search lub Bayesian opt)
Krok 6: Walk-forward sprawdzenie out-of-sample
```

To jest KRYTYCZNE — nie wdrażamy live Modułu 1 z arbitralnymi wagami. Najpierw evidence że historycznie działało.

---

## Output layer

### Telegram bot

**Komendy:**
- `/start` — register chat
- `/signals [N]` — ostatnie N (default 10) sygnałów
- `/top` — top tokeny wg score w ostatnich 24h
- `/paper` — paper trading PnL summary
- `/backtest <strategy>` — uruchom backtest na default universe
- `/mute <token>` — wycisz alerty dla tokena (12h)
- `/tier <1|2|3>` — change alert tier (silenced for tier above)

**Alert format (Tier 1 BTC):**
```
[score: 82/100] BINANCE: BTCUSDT
Tier: 1 (top 100)  ·  $98,432.10  ·  +0.3% (24h)
Signals:
  - vol +185% on flat price
  - funding -0.024% (24h avg, negative = squeeze setup)
  - OI +28% (vs 7d avg)
  - cross-exchange: Bybit volume 2.4x vs Binance
Chart: https://www.tradingview.com/chart/?symbol=BINANCE:BTCUSDT
Alert id: #4521  ·  Cooldown: 12h
```

### FastAPI dashboard (port 8001, local-only `127.0.0.1`)

**Zakładki:**
1. **Universe** — przegląd ~5000 tokenów z filtrami (tier, market cap, listing count)
2. **Live Signals** — table auto-refresh (HTMX), score + breakdown per signal + tier
3. **Top Movers** — top 50 tokenów wg recent score
4. **Paper Trading** — open positions + closed trades + cumulative PnL
5. **Backtests** — uruchamianie + historia runs + HTML reports inline
6. **Settings** — view-only (config.yaml + filter thresholds)

### Paper Trader (simulated fill engine)

- Entry: market order @ current best price + slippage(size, liquidity)
- Exit: stop_loss / take_profit / time_stop (configurable)
- Fees: per-CEX table (Binance: 0.1%, Bybit: 0.1%, OKX: 0.1%, Coinbase: 0.4%)
- Slippage model:
  ```
  slippage_bps = base_bps + (size_usd / volume_5m_usd) * 10000 * impact_factor
  default: base_bps=2, impact_factor=1.5  (lower than DEX bo CEX ma lepszą płynność)
  ```

---

## Storage — DuckDB schema

Pełny schema w `src/deep_owl/db/schema.sql`. Tabele:

| Tabela | PK | Cel |
|---|---|---|
| `_meta` | key | Schema version + app metadata |
| `tokens` | `token_id` | Master tokens recognized w systemie (CMC/CoinGecko ID) |
| `token_listings` | `(token_id, exchange, symbol)` | Per-CEX listing per token (Binance: BTC=BTCUSDT, etc.) |
| `klines_5m` | `(exchange, symbol, ts)` | OHLCV 5min z REST API CEX |
| `klines_15m` | `(exchange, symbol, ts)` | OHLCV 15min |
| `funding_history` | `(exchange, symbol, ts)` | Funding rate per 8h cycle |
| `open_interest` | `(exchange, symbol, ts)` | OI snapshot per godzinę |
| `signals` | `id` | Output Modułu 1 (timestamp, score, breakdown JSON, tier) |
| `paper_trades` | `id` | Open + closed positions, simulated PnL |
| `backtest_runs` | `id` | Metadata per backtest run + metrics JSON |

**Partitioning:** klines_5m może urosnąć do miliardów rows. Strategy: partition by month (DuckDB MACRO + ATTACH per-month parquet files), archive starsze niż 90 dni do parquet.

**Migracje:** schema.sql z `--+ migration: N` markerami. Wersja DB w tabeli `_meta`.

**Backup:** copy pliku `data/deep_owl.duckdb` przed major schema change.

---

## Data flow end-to-end

### Flow A: Universe rebuild (24h cron)

```
┌──────────────┐ paginated │ Universe       │
│ CoinGecko    │──────────>│ Builder        │
│ (markets)    │           └────────┬───────┘
└──────────────┘                    │ filter
                                    ▼
┌──────────────┐ cross-check┌──────────────┐
│ CMC          │<───────────│ Filter rules │
│ (listings)   │            │ (cap/vol/age)│
└──────────────┘            └────────┬─────┘
                                     │
┌──────────────┐  detect     ┌──────▼───────┐
│ CEX REST     │<────────────│ Listing      │
│ (symbols)    │             │ resolver     │
└──────────────┘             └──────────────┘
                                     │
                              ┌──────▼───────┐
                              │ tokens +     │
                              │ token_       │
                              │ listings     │
                              └──────────────┘
```

### Flow B: Live signal detection (od fazy 5+)

```
┌──────────────┐  per CEX     ┌──────────────┐
│ Binance/     │ batched      │ Klines       │
│ Bybit/OKX/   │──────────────│ Ingester     │
│ Coinbase     │              │ (5m loops)   │
└──────────────┘              └──────┬───────┘
                                     │ persist
                                     ▼
                              ┌──────────────┐
                              │ klines_5m    │
                              │ funding_     │
                              │ history      │
                              │ open_        │
                              │ interest     │
                              └──────┬───────┘
                                     │ select
                                     ▼
┌─────────────────┐           ┌──────────────┐
│ Module 1        │<──────────│ Universe     │
│ Accumulation    │  iterate  │ (~5000 toks) │
│ Detector        │           └──────────────┘
└────────┬────────┘
         │ score > tier_threshold?
         ▼
┌─────────────────┐  alert     ┌──────────────┐
│ signals table   │ ──────────>│ Telegram bot │
│                 │            │ + Dashboard  │
└─────────────────┘            └──────────────┘
```

### Flow C: Backtest run

```
┌──────────────┐                  ┌───────────────┐
│ CEX REST     │   historical     │ Klines        │
│ (klines)     │ ────────────────>│ Aggregator    │
│ + funding    │   1-5 lat back   │ → DuckDB      │
└──────────────┘                  └───────┬───────┘
                                          │ persist
                                          ▼
┌──────────────┐    select bars    ┌──────────────────┐
│ Backtest     │<──────────────────│ klines_5m/15m    │
│ Engine       │                   │ funding_history  │
│ + Strategy   │                   │ open_interest    │
└──────┬───────┘                   └──────────────────┘
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
  min_market_cap_usd: 1_000_000
  min_volume_24h_usd: 100_000
  min_age_days: 30
  min_cex_listings: 2
  stablecoin_blacklist: [USDT, USDC, DAI, FDUSD, TUSD, USDD, PYUSD, FRAX]
  wrapped_synthetic_blacklist: [WBTC, WETH, stETH, weETH, jupSOL, jitoSOL]
  refresh_interval_h: 24
  cex_priority: [binance, bybit, okx, coinbase]   # preferowana giełda dla data sourcingu

cex_apis:
  binance:
    base_url: https://api.binance.com
    rate_limit_weight_per_min: 6000
    klines_weight_per_call: 1
  bybit:
    base_url: https://api.bybit.com
    rate_limit_per_sec: 50
  okx:
    base_url: https://www.okx.com
    rate_limit_per_2s: 20
  coinbase:
    base_url: https://api.exchange.coinbase.com
    rate_limit_per_sec: 10

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
    tier_1:
      market_cap_rank_max: 100
      alert_threshold: 70
      cooldown_hours: 12
    tier_2:
      market_cap_rank_max: 500
      alert_threshold: 65
      cooldown_hours: 8
    tier_3:
      market_cap_rank_max: 5000
      alert_threshold: 60
      cooldown_hours: 4

module2_backtest:
  default_universe: top_100   # top_100 | top_500 | top_5000 | custom
  walk_forward:
    train_days: 60
    test_days: 14
    slide_days: 14
  fees:
    binance: 0.001
    bybit: 0.001
    okx: 0.001
    coinbase: 0.004
  slippage:
    base_bps: 2
    impact_factor: 1.5

output:
  telegram:
    enabled: false  # włącz w fazie 6
    daily_alert_cap: 30   # wyższe niż DEX bo more universe
  dashboard:
    host: 127.0.0.1
    port: 8001
```

**Loading:** `pydantic-settings` + `.env` overrides (env vars TRUMP yaml).

---

## Decyzje i tradeoffs

| Decyzja | Wybór | Alternatywa | Rationale |
|---|---|---|---|
| Język | Python 3.11+ | Rust dla perf | Match parent stack, asyncio dla I/O-heavy, Pydantic v2 |
| DB | DuckDB + parquet partitioning | Postgres / SQLite | Embedded, columnar (krytyczne dla skali ~5000 tokens × klines), 1-file backup |
| Universe scope | ~5000 filtered z 10k+ | Top 10/50/100 only | User explicit: full coverage CMC/CoinGecko po realnym filtrowaniu |
| Data primary | CEX REST API (klines/funding/OI) | Parent recorder tick | Recorder tylko BTC/ETH/HYPE; REST pokrywa 5000 tokens |
| Exchange priority | Binance, Bybit, OKX, Coinbase | All 14 z parent | Te 4 to ~95% global volume + best APIs + most pairs |
| Module count | 2 (accumulation + backtest) | 3 (poprzednio: + fresh DEX) | Fresh DEX out of scope — separate project potem |
| Output | Sygnały + paper trading | Auto-trading | User wybór, niskie ryzyko, dłuższe testy bez kapitału |
| Repo | Standalone | Worktree parent | Czysta izolacja od market_maker context |
| Telegram lib | python-telegram-bot v20 | aiogram | Większa community, więcej przykładów |

**Ważne odrzucone podejścia:**

- ❌ Microservices — overkill dla solo dev, monolith wystarczy
- ❌ Kafka / RabbitMQ event bus — DuckDB + asyncio queue wystarczą
- ❌ Per-token WebSocket subscriptions — 5000 streams = 5000 connections; REST polling jest tańszy operacyjnie
- ❌ Custom orderbook reconstruction dla wszystkich 5000 tokenów — niepotrzebne, używamy aggregated 24h volume + funding + OI z REST
- ❌ DEX adapters (Dexscreener, Birdeye) — out of scope całkowicie

---

## Skala i performance

### Volume estimates

| Komponent | Skala | Storage estimate |
|---|---|---|
| Universe | 5000 tokens × 24h refresh | ~5MB/dzień (tokens + listings) |
| Klines 5m | 5000 tokens × ~3 CEX listings × 288 candles/dzień | ~13GB/rok (DuckDB columnar compression ~3x) |
| Klines 15m | jak wyżej, ÷3 | ~4.5GB/rok |
| Funding | 5000 tokens × 1 CEX × 3 calls/dzień | <1GB/rok |
| Open Interest | 5000 tokens × 1 CEX × 24 calls/dzień | ~3GB/rok |
| Signals | ~50 alerts/dzień × historia | <500MB/rok |

**Total roczny: ~25GB DuckDB.** Po 2-3 latach archiwizacja starszych klines do parquet (cold storage).

### Performance targets

| Operacja | Target latency |
|---|---|
| Universe rebuild | <30 min (5k tokens × CMC/CG paginate) |
| Klines pull (single token, 5m candles, 1000 bars) | <500ms |
| Klines pull batch (top 100 tokens, 5m, last hour) | <60s (rate limit aware) |
| Module 1 scoring single token | <50ms (CPU) |
| Module 1 scoring full universe (5000 tokens) | <5min (parallel) |
| Backtest single strategy × top 100 × 1 year | <5 min |
| Backtest full universe (5000 tokens) | <2h |

### Bottleneck analysis

- **API rate limits** = primary bottleneck. Binance 6000 weight/min ≈ 6000 klines pulls/min. Top 100 × 4 CEX = 400 calls/min — łatwo. Top 5000 × 4 CEX = 20k calls — wymaga round-robin między CEX-ami + smart caching.
- **DuckDB writes** drugorzędny. Bulk INSERT w transakcji jest fast (>100k rows/sec).
- **Module 1 compute** bardzo szybki (vectorized numpy). Skala 5000 tokens × kilka sygnałów = ms-y.

### Cost estimate (Faza 6 production-ready)

| Resource | Free tier | Paid (jeśli skala wymusi) |
|---|---|---|
| CMC API | 333 calls/dzień | $79/mo (10k calls/dzień) |
| CoinGecko API | 30 calls/min | $129/mo (Pro) |
| Binance/Bybit/OKX/Coinbase REST | Free | — |
| Server | Local dev | $20-50/mo VPS jeśli zdalny |
| Storage | Lokalny dysk | — |

**Faza 0-6 design dla free tier:** wystarczy CMC free + CoinGecko free + CEX public APIs. Płatne tier dopiero gdy skala użytkowania to wymusi.
