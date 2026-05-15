# Deep Owl — Breakout Signals Bot

**Architektura · Roadmap · Standardy · v0.1.2**

Big Caps CEX-First — Full coverage ~3000-4000 tokens · WebSocket-first
Faza 0 · Plan-as-docs · 2026-05-15

---

## Executive Summary

Deep Owl to bot do wykrywania sygnałów akumulacji na big cap tokenach notowanych na CEX-ach. **TOP 1 priority:** established projekty z stażem na giełdach. **Full coverage:** wszystko co listed na min 1 z 4 priorytetowych CEX (Binance/Bybit/OKX/Coinbase) = ~3000-4000 tokenów bez aggressive filter cap.

**3 moduły core:**

- **Module 1 — Big Cap Accumulation Detector:** 7 sygnałów per token co 5 min (volume profile, funding rate skew, OI buildup, cross-exchange divergence, liquidation imbalance, social opt, bid/ask imbalance opt). Tier-aware threshold (Tier 1-4: top100 strict 70+, tail soft 55+).
- **Module 2 — Backtesting Engine:** strategie breakout (Bollinger Squeeze, Volume Spike, Funding Squeeze, RSI Divergence) na historical klines REST API CEX. Walk-forward MANDATORY.
- **Module 3 — New Listings Monitor (NEW v0.1.2):** detektor świeżych listingów CEX z **user-configurable filter sets** (config.yaml defaults + dashboard UI overrides runtime).

**Data ingestion: WebSocket-first.** 4 trwałe WS connections per CEX = wszystkie klines/funding/OI live push za $0, bez rate limitów. REST tylko dla backfill historycznego + sanity reconcile.

**Output:** Telegram alerts + Web dashboard (FastAPI :8001, 7 zakładek) + paper trading symulowanym slippage/fees. Bez realnego kapitału w Fazach 0-6.

**Stack:** Python 3.11+, asyncio, websockets lib, DuckDB embedded columnar (partition by month), Pydantic v2, FastAPI. Solo dev tool, standalone repo.

**OUT OF SCOPE:** fresh DEX projects monitor, RugCheck/GoPlus, Pumpfun, Dexscreener, Birdeye, Uniswap. New listings są **CEX-only** (Module 3) — nie DEX.

---

## Spis treści

1. [Glossary](#1-glossary)
2. [Architektura systemu](#2-architektura-systemu)
3. [Universe Builder](#3-universe-builder)
4. [Data ingestion — WebSocket-first](#4-data-ingestion)
5. [Data sources matryca](#5-data-sources)
6. [Module 1 — Accumulation Detector](#6-module-1)
7. [Module 2 — Backtesting Engine](#7-module-2)
8. [Module 3 — New Listings Monitor](#8-module-3)
9. [Paper Trading layer](#9-paper-trading)
10. [Output layer — Telegram + Dashboard](#10-output-layer)
11. [Phase plan](#11-phase-plan)
12. [Tech stack + DB schema](#12-tech-stack)
13. [Repo structure + standards](#13-repo-structure)
14. [Risk register + future](#14-risk-register)

---

## 1. Glossary

Definicje terminów dla recenzentów spoza krypto/trading.

| Termin | Definicja |
|---|---|
| **Big cap** | Token z dużą kapitalizacją rynkową, established (top 5000 by market cap), z stażem na CEX-ach. |
| **CEX** | Centralized Exchange — Binance, Bybit, OKX, Coinbase. Kapitał trzymany przez giełdę. |
| **DEX** | Decentralized Exchange — Raydium, Uniswap. **OUT OF SCOPE** w Deep Owl. |
| **WebSocket stream** | Persistent connection do CEX z push-based real-time data (klines, tickers, funding). Free, no rate limit. |
| **REST API** | Request/response API. W Deep Owl tylko backfill + sanity, NIE live. |
| **OHLCV / Klines** | Open / High / Low / Close / Volume — format świecy. |
| **Funding rate** | Płatność co 8h longs↔shorts na perpetuals. Negative funding = shorty crowded. |
| **Open Interest (OI)** | Sumaryczna wartość otwartych pozycji futures. Rosnący OI = nowy kapitał. |
| **Liquidation** | Wymuszone zamknięcie pozycji futures. Long liq = długi liquidated (price spadła). |
| **Slippage** | Różnica oczekiwanej a realnej ceny wejścia. |
| **Walk-forward** | Backtest gdzie train+test okna przesuwają się — anti look-ahead bias. |
| **Sharpe** | `mean_return / std_return × √252`. >1 dobry, >2 świetny. |
| **Max DD** | Największy spadek peak→trough w equity curve. |
| **Score 0-100** | Output Modułu 1 — ważona suma znormalizowanych sygnałów. |
| **Tier (1-4)** | Klasyfikacja big cap wg CoinGecko rank: 1=top100, 2=top500, 3=top2000, 4=rest. |
| **Wyckoff method** | Klasyczna metoda analizy akumulacji oparta na volume/price relationship. |
| **Squeeze** | Wymuszony wzrost ceny gdy crowded shorty są liquidated. |
| **Filter set** | User-defined zbiór reguł filtrowania (Module 3). Wiele aktywnych jednocześnie. |
| **CEX symbols snapshot** | Daily image listy symboli per CEX — używane do diff-based detection new listings. |
| **DuckDB** | Embedded analytics DB (jak SQLite columnar). Krytyczne dla skali. |

---

## 2. Architektura systemu

### 2.1 Layered architecture

| Warstwa | Odpowiedzialność | Lokalizacja |
|---|---|---|
| **Data adapters** | WS streams (primary) + REST (backfill+sanity) + CoinGecko (rankings) + RSS (announcements) | `src/deep_owl/data/` |
| **Storage** | DuckDB persistence + schema + partitioning. In-memory buffer WS przed bulk INSERT | `src/deep_owl/db/` |
| **Engine modules** | Universe builder, Module 1 scorer, Module 2 backtester, Module 3 new listings | `src/deep_owl/modules/` |
| **Output** | Telegram bot, FastAPI dashboard (z Filter Sets UI), paper trader | `src/deep_owl/output/` |
| **CLI** | `deep-owl universe build`, `ws start`, `backtest`, `detect`, `listings`, `run`, `serve` | `src/deep_owl/cli.py` |
| **Config** | Pydantic Settings + .env + filter rules + tier thresholds + filter sets | `src/deep_owl/config.py` |

### 2.2 Pipeline

**Etap 1 (Universe + New Listings, daily cron):**
- Pull `/exchangeInfo` z 4 CEX-ów → snapshot today
- Diff vs yesterday → new listings detected
- CoinGecko `/coins/markets` → market cap rankings (tier classification)
- Filter łagodny (exclude stablecoins, wrapped, dead — NO aggressive cap)
- Result: `tokens` + `token_listings` + `cex_symbols_snapshot` + `new_listings` tables

**Etap 2 (WS Ingester, continuous):**
- 4× WebSocket per CEX (Binance spot, Binance futures, Bybit spot+linear, OKX, Coinbase)
- Subscribe wszystkie symbole z universe per CEX
- Receive frames → normalize → in-memory buffer → bulk INSERT do DuckDB co 30s
- REST sanity reconcile co 30 min na losowej próbce 50 tokenów

**Etap 3 (Module 1 Scorer, 5min cycle):**
- Iteruje active universe
- Per token: pull last 7d klines + funding + OI z DuckDB
- Liczy 7 sygnałów → weighted score → tier threshold check
- Score > tier_threshold → INSERT `signals` → alert worker

**Etap 4 (Module 3 New Listings, 1h cycle):**
- Iteruje aktywne `filter_sets` z config
- Per filter set: query new_listings table dla tokenów matchujących filter
- Match → alert (jeśli `alert_on_match: true`) + dashboard render

### 2.3 Diagram

```
                  +-------------------------------------+
                  |       DEEP OWL (standalone)         |
                  |   WS-first · Full CEX coverage      |
                  +-------------------------------------+
                                   |
        +--------------------------+--------------------------+
        |                          |                          |
   +----v-----+              +-----v-----+              +-----v-----+
   |  DATA    |              |  ENGINE   |              |  OUTPUT   |
   +----------+              +-----------+              +-----------+
        |                          |                          |
   4x WebSocket            Universe Builder          Telegram bot
   (Binance spot/fut       (full CEX coverage        FastAPI :8001
    Bybit spot/linear        + Tier classification)  (7 zakladek)
    OKX public                                       Paper Trader
    Coinbase)               Module 1:                (sim PnL)
                             Accumulation
   CEX REST                   Detector
   (backfill+sanity)          (7 signals)

   CoinGecko                Module 2:
   (tier rankings)           Backtester
                              (REST historical)
   Binance RSS
   (announcements)          Module 3:
                             New Listings
   Parent recorder           Monitor
   (BTC/ETH/HYPE opt)        (user filter sets)
                                   |
                            +------v------+
                            |   DuckDB    |
                            +-------------+
                            tokens · token_listings
                            cex_symbols_snapshot
                            klines_5m · klines_15m
                            funding_history · open_interest
                            signals · paper_trades
                            backtest_runs
                            new_listings · new_listing_filters
                            ws_status
```

### 2.4 Key decisions

| Decyzja | Wybór | Rationale |
|---|---|---|
| Język | Python 3.11+ | Match parent, asyncio |
| DB | DuckDB | Columnar, scale-friendly, 1-file backup |
| Universe scope | Wszystko z 4 CEX (~3-4k) | User: full coverage, no aggressive cap |
| Data primary | WebSocket | $0, no rate limit, real-time |
| Data secondary | REST (backfill+sanity) | Historical + cross-validate WS |
| Module count | **3** (+New Listings) | User feedback v0.1.2 |
| Tier classification | 1-4 (top100/500/2000/rest) | Rozszerzone bo full universe |
| Output | Sygnały + paper trading | User wybór |
| New Listings filters | config.yaml + dashboard UI | Flexible runtime override |

---

## 3. Universe Builder

### 3.1 Source

- **Primary:** `/exchangeInfo` per CEX (Binance, Bybit, OKX, Coinbase)
- **Secondary:** CoinGecko `/coins/markets` — TYLKO dla market cap rankings (tier classification)
- **Cross-ref:** CoinMarketCap (opcjonalne sanity check)

### 3.2 Filter pipeline (łagodny — NO aggressive cap)

| Reguła | Default | Rationale |
|---|---|---|
| `stablecoin_blacklist` | USDT, USDC, DAI, FDUSD, TUSD, USDD, PYUSD, FRAX, USDe, USDS | Brak volatility |
| `wrapped_synthetic_blacklist` | WBTC, WETH, stETH, weETH, jupSOL, jitoSOL, cbETH, LsETH | Same risk co underlying |
| `delisted_or_zero_volume` | volume_24h == 0 przez >7 dni | Dead tokens |
| `min_cex_listings` | 1 z top 4 | Brak listing = brak danych |

**NO market cap minimum. NO age minimum. NO listing count minimum.** Bierzemy wszystko aktywne na 4 priorytetowych CEX-ach.

### 3.3 Tier classification (z CoinGecko rank)

| Tier | Rank | Use case |
|---|---|---|
| Tier 1 | 1-100 | Top quality, strict threshold |
| Tier 2 | 101-500 | Medium |
| Tier 3 | 501-2000 | Lower quality, soft threshold |
| Tier 4 | >2000 lub no rank | Tail, alert tylko extreme cases |

### 3.4 Refresh policy

- Daily rebuild (24h cron)
- Delta tracking: new symbols vs yesterday → INSERT do `new_listings` table (input dla Module 3)
- Soft delete delisted (`is_active=FALSE`, no row delete)

---

## 4. Data ingestion — WebSocket-first

**KLUCZOWA DECYZJA v0.1.2.** WebSocket = primary live data source, REST = backfill + sanity only.

### 4.1 WebSocket endpoints per CEX

| CEX | Endpoint | Subskrypcje | Multiplex limit |
|---|---|---|---|
| Binance Spot | `wss://stream.binance.com:9443/stream` | `<sym>@kline_5m`, `<sym>@kline_15m`, `<sym>@miniTicker` | 1024 streams/connection |
| Binance Futures | `wss://fstream.binance.com/stream` | `<sym>@kline_5m`, `!markPrice@arr@1s`, `<sym>@openInterest`, `!forceOrder@arr` | 200 streams/connection |
| Bybit Spot | `wss://stream.bybit.com/v5/public/spot` | `kline.5.<sym>`, `kline.15.<sym>`, `tickers.<sym>` | Unlimited |
| Bybit Linear | `wss://stream.bybit.com/v5/public/linear` | `kline.5.<sym>`, `tickers.<sym>` (z fundingRate), `liquidation.<sym>` | Unlimited |
| OKX Public | `wss://ws.okx.com:8443/ws/v5/public` | `candle5m`, `candle15m`, `tickers`, `funding-rate`, `open-interest` | 200 subs/connection |
| Coinbase | `wss://ws-feed.exchange.coinbase.com` | `ticker_batch`, `level2`, custom candles via `matches` | Unlimited |

### 4.2 WebSocket lifecycle

```
Connect -> Subscribe -> Receive frames -> Parse -> Buffer (asyncio Queue)
                                                          |
                                              Bulk INSERT (30s lub 1000 events)
                                                          |
                                                          v
                                                      DuckDB

   ^                                                     |
   |__ Reconnect (exponential backoff 1s -> 60s) <-------|
                       Heartbeat (ping/pong co 20-30s)
```

### 4.3 Failure handling

- Heartbeat: ping/pong co 30s (Binance/Bybit), 25s (OKX wymaga)
- Reconnect: exponential backoff 1s → 2s → 4s → 8s → max 60s
- Replay buffer: gdy reconnect po >5s downtime → REST `/klines` pull dla missed bars
- Stale stream detection: jeśli >2× expected interval bez frame → flag + REST sanity

### 4.4 REST role (NIE live)

- **Backfill historyczny** (one-time start): pull 30-365 dni klines per token. ~4000 tokens × 4 CEX × backfill = ~16k calls, do zrobienia w ~30 min z rate limit awareness
- **Sanity reconcile** (co 30 min): random 50 tokens × 4 CEX, compare last 5 bars WS vs REST → alert divergence >0.1%
- **Mid-day new tokens:** detected new listing → REST backfill dopóki WS subscribe się zarejestruje

### 4.5 Connection count

| CEX | Connections |
|---|---|
| Binance | 4 (spot, podzielone bo 4000 spot streams / 1024 = 4) + 1 (futures) = **5** |
| Bybit | 1 (spot) + 1 (linear) = **2** |
| OKX | 1-2 |
| Coinbase | **1** |

**Total ~9 trwałych connections** = pełne pokrycie ~4000 tokenów × 5m + 15m + funding + OI + liquidations za **$0**.

---

## 5. Data sources matryca

| # | Źródło | Faza | Typ | Auth | Limit/Cost |
|---|---|---|---|---|---|
| 1 | Binance Spot WS | 3a | WebSocket | None | Unlimited |
| 2 | Binance Futures WS | 3a | WebSocket | None | Unlimited |
| 3 | Bybit Spot+Linear WS | 3a | WebSocket | None | Unlimited |
| 4 | OKX Public WS | 3a | WebSocket | None | Unlimited |
| 5 | Coinbase WS | 3a | WebSocket | None | Unlimited |
| 6 | Binance REST | 3b | REST (backfill+sanity) | None | 6000 weight/min |
| 7 | Bybit REST | 3b | REST | None | 50 req/sec |
| 8 | OKX REST | 3b | REST | None | 20 req/2s |
| 9 | Coinbase REST | 3b | REST | None | 10 req/sec |
| 10 | CoinGecko `/markets` | 2 | REST (daily) | Opt | 30 req/min free |
| 11 | CoinMarketCap | 2 opt | REST | Key | 333/d free |
| 12 | Binance Announcements RSS | 5 | RSS feed | None | n/a |
| 13 | Bybit/OKX/Coinbase Announcements | 5 | Web scrape/RSS | None | n/a |
| 14 | Parent recorder | 3 opt | filesystem | — | BTC/ETH/HYPE |
| 15 | Telegram Bot API | 6 | REST | Bot token | 30 msg/s |

**Sekrety w `.env`:** `COINMARKETCAP_API_KEY`, `COINGECKO_API_KEY` (opt), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
**CEX WS/REST = brak auth wymagane.**

---

## 6. Module 1 — Big Cap Accumulation Detector

### 6.1 Pytanie biznesowe

Czy ten big cap akumuluje się PRZED breakoutem? Cel: złapać moment, w którym smart money cicho buduje pozycje, ZANIM publiczność zauważy.

### 6.2 Sygnały (weighted sum → score 0-100)

| # | Sygnał | Threshold | Waga | Skąd dane |
|---|---|---|---|---|
| 1 | Volume rising on flat/down price | `>2.0` + `|Δp|<5%` | 0.20 | `klines_5m + klines_15m` (WS) |
| 2 | Funding rate skew (negative) | `<-0.01%` przez 24h | 0.20 | `funding_history` (WS) |
| 3 | Open Interest buildup | +20% vs 7d_avg | 0.15 | `open_interest` (WS) |
| 4 | Cross-exchange volume divergence | >2x między CEX | 0.15 | `klines_5m × N CEX` |
| 5 | Liquidation imbalance (long) | `long_liq/short_liq > 2.0` | 0.10 | WS liquidations stream |
| 6 | Social mention velocity (opt) | >3x vs 24h_avg | 0.10 | Parent `Social_media_scanner` |
| 7 | Bid/ask order book imbalance (opt) | >1.5x bid | 0.10 | Parent recorder L5 |

### 6.3 Score formula

```python
def score_token(token, klines, funding, oi, social, orderbook):
    signals = {}
    if klines:
        signals['volume_rising'] = sigmoid(volume_factor(klines) - 2.0)
        signals['cross_exchange_div'] = sigmoid(cross_div(klines) - 2.0)
    if funding:
        signals['funding_skew'] = sigmoid(-funding_24h_avg(funding) / 0.0001)
    if oi:
        signals['oi_buildup'] = sigmoid((oi_24h - oi_7d_avg) / oi_7d_avg / 0.20)
    if social:
        signals['social_velocity'] = sigmoid(social_velocity(social) - 3.0)
    if orderbook:
        signals['bid_ask_imbalance'] = sigmoid(bid_pressure(orderbook) - 1.5)

    total_weight = sum(WEIGHTS[k] for k in signals)
    score = sum(signals[k] * WEIGHTS[k] for k in signals) / total_weight * 100
    return score, signals
```

### 6.4 Tier-aware threshold

| Tier | Definicja | Alert threshold | Cooldown |
|---|---|---|---|
| Tier 1 | Top 100 | 70+ | 12h |
| Tier 2 | 101-500 | 65+ | 8h |
| Tier 3 | 501-2000 | 60+ | 4h |
| Tier 4 | >2000 | 55+ | 2h |

### 6.5 Cross-validation MANDATORY

Pre-deploy: replay scoring na historical 1-2 lata, target precision > 0.4 OOS. Bez tego nie wdrażamy live.

---

## 7. Module 2 — Backtesting Engine

### 7.1 Strategie

- **`breakout_consolidation`:** Bollinger Squeeze + volume confirmation
- **`volume_spike`:** vol > 3x SMA20 + close > 5d high
- **`funding_squeeze`:** negative funding + price consolidation
- **`rsi_divergence`:** RSI(14) < 30 + bullish divergence

### 7.2 Walk-forward (MANDATORY)

- Train: 60 dni
- Test: 14 dni
- Slide: 14 dni
- Out-of-sample: ≥ 30%

### 7.3 Metrics

Win rate, avg PnL, Sharpe, Sortino, Calmar, max DD, exposure time, trade count.

### 7.4 Universe ekspansja

top_100 (start) → top_500 → top_5000 (pełen universe pózniej)

---

## 8. Module 3 — New Listings Monitor

### 8.1 Pytanie biznesowe

**Czy nowy CEX listing rokuje?** User-configurable filters dla różnych use cases.

**Vs. fresh DEX (wcześniej wywalone):** CEX listing = już przeszedł vetting, lower rugpull risk. Wzorzec: post-listing dump 24-48h, potem reversal.

### 8.2 Source detection

- **CEX `/exchangeInfo` daily snapshot diff:** porównanie dziś vs wczoraj per CEX, nowe symbole = candidates
- **Binance Announcements RSS:** `https://www.binance.com/en/support/announcement/c-48` (24-48h forward notice)
- **Bybit/OKX/Coinbase announcements** (scrape lub RSS gdzie dostępne)

### 8.3 User-defined filter sets

User definiuje wiele filter sets jednocześnie. Przykład config.yaml:

```yaml
module3_new_listings:
  enabled: true
  source_priority: ["binance_announcements_rss", "cex_diff_snapshot"]
  diff_check_interval_h: 1

  filter_sets:
    - name: conservative
      enabled: true
      min_market_cap_usd: 10_000_000
      min_volume_24h_usd: 1_000_000
      min_cex_listings: 2
      max_age_hours: 168              # 7 dni
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
      max_age_hours: 72               # 3 dni
      required_quote_assets: ["USDT"]
      exclude_stablecoins: true
      alert_on_match: false

    - name: meme_hunt
      enabled: false
      min_market_cap_usd: 500_000
      min_volume_24h_usd: 50_000
      max_age_hours: 48
      include_meme_keywords: ["INU", "DOGE", "PEPE", "FLOKI", "WIF"]
```

### 8.4 Wszystkie atrybuty filter

| Atrybut | Typ | Opis |
|---|---|---|
| `min_market_cap_usd` / `max_market_cap_usd` | float | Range cap |
| `min_volume_24h_usd` / `max_volume_24h_usd` | float | Range volume |
| `min_cex_listings` / `max_cex_listings` | int | Range listing count (1-4) |
| `min_age_hours` / `max_age_hours` | int | Od pierwszego listingu |
| `required_quote_assets` | list[str] | USDT/USDC/USD/BTC/ETH |
| `required_has_perpetual` | bool | Wymaga perpetual market |
| `required_market_type` | list[str] | spot/perpetual/inverse |
| `exclude_stablecoins`, `exclude_wrapped` | bool | Same co universe defaults |
| `include_meme_keywords` / `exclude_meme_keywords` | list[str] | Pattern match w symbol/name |
| `tier_max` | int (1-4) | Max tier (4=all) |
| `min_holders_count` | int | Jeśli mamy z CoinGecko |
| `min_age_listed_on_cex_days` | int | NIE świeży listing |
| `alert_on_match` | bool | Czy wysyłać Telegram alert |

### 8.5 Dashboard UI override

Faza 6+ dashboard zakładki:
- **New Listings:** tabela kandydatów per filter set + countdown age
- **Filter Sets:** UI tworzenia/edytowania filter setów runtime, live preview match count

### 8.6 Cross-pollination z Module 1

Token w aktywnym `new_listings` → boost wagi `social_velocity` w Module 1 (nowy listing = social hype likely).

---

## 9. Paper Trading

### 9.1 Cel

Symuluje wejścia/wyjścia w bazie BEZ realnego kapitału.

### 9.2 Worker flow

Subskrybuje INSERT do `signals`. Gdy score > `auto_paper_threshold`:
- Pull current price + 5m volume z WS cache
- Compute size_usd (default 1% capital, max $100)
- Apply slippage + fee (per CEX)
- INSERT `paper_trades` z `status=open`

### 9.3 Exit logic

- `stop_loss` (default 5%)
- `take_profit` (default 15%)
- `time_stop` (default 48h)
- `manual` (CLI/dashboard)

### 9.4 Co NIE robi

Brak real wallet, brak Web3, brak MEV concerns.

---

## 10. Output layer — Telegram + Dashboard

### 10.1 Telegram bot

**Komendy:** `/start`, `/help`, `/signals [N]`, `/top`, `/paper`, `/backtest <strategy>`, `/listings [filter_set]`, `/mute <token>`, `/tier <1-4>`.

**Rate limiting:** cooldown per token zależny od tier, daily cap 50 alerts (zwiększone bo M1 + M3 alerts).

### 10.2 FastAPI dashboard (7 zakładek)

| Zakładka | Zawartość |
|---|---|
| Universe | ~4000 tokenów z filtrami (tier, market cap, listing count, age) |
| Live Signals | Module 1 alerts auto-refresh (HTMX 30s) |
| Top Movers | Top 50 wg score (ostatnie 24h) |
| **New Listings** | Aktualne kandydaci per filter set + countdown age |
| **Filter Sets** | UI tworzenia/edytowania filter setów (Module 3) |
| Paper Trading | Open positions + closed trades + PnL chart |
| Backtests | Historia runs + uruchamianie + inline HTML reports |
| Settings | View-only config.yaml + env var status + WS connections health |

### 10.3 Mockup — New Listings tab

```
+--------------------------------------------------------------+
| Deep Owl · New Listings · Filter: [conservative v]          |
+--------------------------------------------------------------+
| Detected within last 7 days · 12 matches                    |
+--------------------------------------------------------------+
| Token   | Listed    | Age   | CEXs | Cap   | Vol24h | Match |
+---------+-----------+-------+------+-------+--------+-------+
| $JTO    | 2026-05-13| 2d3h  |  3   | $124M | $34M   |  v    |
| $WIF    | 2026-05-12| 3d1h  |  2   |  $89M | $21M   |  v    |
| $JUP    | 2026-05-10| 5d2h  |  4   | $312M | $156M  |  v    |
| ...     |           |       |      |       |        |       |
+---------+-----------+-------+------+-------+--------+-------+
```

---

## 11. Phase plan

### 11.1 Six fazes overview (post v0.1.2)

| Faza | Cel | Deliverable | Tag |
|---|---|---|---|
| **0 (DONE)** | Plan-as-docs (v0.0.0 → v0.1.2) | MD deck + 8 root MD + skeleton + git init | v0.0.0...v0.1.2 |
| **1** | Repo bootstrap | venv + deps + DB client + logger + CLI stub | v0.2.0 |
| **2** | Universe Builder + New Listings detection | CMC+CG clients, łagodny filter pipeline, CEX symbols snapshot, daily diff | v0.3.0 |
| **3a** | CEX WebSocket adapters | 4× WS clients (Binance/Bybit/OKX/Coinbase), multiplex, reconnect, buffer | v0.4.0 |
| **3b** | CEX REST adapters (backfill+sanity) | Historical klines pull + 30min sanity reconcile | v0.4.1 |
| **4** | Backtesting Engine | Candles + 4 strategies + walk-forward + reports | v0.5.0 |
| **5** | Module 1 + Module 3 | Accumulation Detector + New Listings Monitor (engine + filter logic) | v0.6.0 |
| **6** | Output | Telegram + Dashboard (7 zakładek) + Paper Trader + Filter Sets UI | v0.7.0 / v1.0.0 |

### 11.2 Definition of Done

- `pytest -x` pass
- Coverage ≥ 80% (hot path)
- ruff + mypy clean
- PHASES.md checkbox flipped
- CHANGELOG.md zaktualizowany
- Tag git `v0.{N}.0`
- Demo lokalnie

### 11.3 Estymacja timeline

| Faza | Effort | Calendar |
|---|---|---|
| 0 (Done) | 1-2 dni | Teraz |
| 1 | 3-5 dni | +1 tydzień |
| 2 | 5-7 dni | +2 tygodnie |
| 3a (WS) | 7-10 dni | +3 tygodnie |
| 3b (REST) | 3-5 dni | +3.5 tygodnia |
| 4 | 10-14 dni | +1.5 miesiąca |
| 5 | 14-20 dni | +2.5 miesiąca |
| 6 | 14-20 dni | +3.5 miesiąca |

### 11.4 Co NIE w roadmapie (całkowicie OUT)

- ❌ Fresh DEX projects monitor (Pumpfun, Raydium new pairs, Birdeye)
- ❌ Rugpull detection (RugCheck, GoPlus)
- ❌ DEX adapters (Dexscreener, Birdeye, Jupiter, Uniswap)
- ❌ Per-chain native RPC (Solana, Ethereum)
- ❌ Real wallet / private keys / on-chain transactions
- ❌ Mobile app, multi-user SaaS
- ❌ AWS deploy w Fazach 0-6
- ❌ Powielanie parent market_maker

---

## 12. Tech stack + DB schema

### 12.1 Stack

| Warstwa | Wybór | Uzasadnienie |
|---|---|---|
| Język | Python 3.11+ | Match parent |
| Async | asyncio + aiohttp + websockets | Standard |
| WebSocket | `websockets>=12` | Async-native, battle-tested |
| API framework | FastAPI + uvicorn | Dashboard |
| Storage | DuckDB | Embedded columnar |
| Candle agg | numpy + pyarrow | Fast columnar |
| HTTP retry | tenacity | Standard |
| Telegram | python-telegram-bot v20+ | Async-native |
| Tests | pytest + pytest-asyncio + pytest-cov | 80%+ target |
| Linting | ruff + mypy strict | Modern |
| Config | pydantic-settings | Type-safe |
| Logging | stdlib + structlog | Structured |

### 12.2 DB schema — tabele (v0.1.2)

| Tabela | PK | Cel |
|---|---|---|
| `_meta` | `key` | Schema version |
| `tokens` | `token_id` | Master tokens (CoinGecko ID) |
| `token_listings` | `(token_id, exchange, symbol)` | Per-CEX listing |
| **`cex_symbols_snapshot`** | `(exchange, snapshot_date)` | Daily snapshot per CEX (dla diff detection) |
| `klines_5m` | `(exchange, symbol, ts)` | OHLCV 5m (WS primary + REST backfill) |
| `klines_15m` | `(exchange, symbol, ts)` | OHLCV 15m |
| `funding_history` | `(exchange, symbol, ts)` | Funding rate |
| `open_interest` | `(exchange, symbol, ts)` | OI snapshots |
| `signals` | `id` | Module 1 output |
| `paper_trades` | `id` | Simulated trades |
| `backtest_runs` | `id` | Backtest metadata + metrics |
| **`new_listings`** | `id` | Module 3 detected listings + match info |
| **`new_listing_filters`** | `id` | User-defined filter sets persistence |
| **`ws_status`** | `(exchange, connection_id)` | WS connection health |

Pełen schema: [`src/deep_owl/db/schema.sql`](../src/deep_owl/db/schema.sql).

---

## 13. Repo structure + standards

### 13.1 Skeleton (po Fazie 0)

```
Breakout_signals/
├── .git/                  # standalone repo
├── .gitignore             # /data/, /logs/, .env, venv/, *.duckdb, ~$*.docx
├── .env.example
├── README.md
├── CLAUDE.md
├── ARCHITECTURE.md
├── PHASES.md
├── DATA_SOURCES.md
├── GIT_WORKFLOW.md
├── FILE_HYGIENE.md
├── CHANGELOG.md
├── pyproject.toml
├── requirements.txt
├── requirements-dev.txt
├── docs/
│   ├── deep_owl_v1.md     # ten dokument
│   └── decisions/         # ADRs
├── src/deep_owl/
│   ├── __init__.py
│   ├── cli.py
│   ├── config.py
│   ├── logger.py
│   ├── db/                # DuckDB client + schema
│   ├── data/              # CMC, CoinGecko, CEX REST + WS adapters
│   │   ├── cex/
│   │   │   ├── binance_ws.py
│   │   │   ├── binance_rest.py
│   │   │   ├── bybit_ws.py
│   │   │   ├── bybit_rest.py
│   │   │   └── ...
│   │   └── announcements/
│   │       ├── binance_rss.py
│   │       └── ...
│   ├── modules/           # universe, accumulation, backtest, new_listings
│   └── output/            # telegram, dashboard, paper_trader
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── scripts/
    └── bootstrap.ps1
```

### 13.2 File hygiene

| Lokalizacja | Limit |
|---|---|
| MD w root | max 8 |
| ADR w `docs/decisions/` | max 5 |
| Long-form deck w `docs/` | 1 (`deep_owl_v1.md`) |
| Python top-level modules w `src/deep_owl/` | max 6 |
| Lines per Python file | max 400 (max 800) |
| Function length | max 50 linii |

### 13.3 Git workflow

- Branch: `phase-N/short-slug`, `fix/...`, `docs/...`
- PR-only flow (squash merge)
- Conventional Commits
- Tag per faza: `v0.{N}.0`
- ZAKAZANE: `--no-verify`, `--amend` na pushed, `push --force` na main

---

## 14. Risk register + future

### 14.1 Top risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| WS disconnect storms (mass reconnect) | Medium | High | Exponential backoff + replay buffer + REST sanity |
| WS frame parsing errors | Medium | Medium | Pydantic v2 validation + dead letter queue |
| DuckDB > 100GB (slow queries) | Medium (rok+) | Medium | Partition by month, archive >90d do parquet |
| Backtest overfitting | High | High | Walk-forward MANDATORY, OOS ≥ 30% |
| Module 1 false positives | High | Medium | Cross-validation pre-deploy, tier-aware threshold |
| Telegram spam | Medium | Low | Cooldown per tier, daily cap 50 |
| New Listings filter chaos (too many sets) | Medium | Low | UI sanity guards + default templates |
| WS endpoint API change | Low | High | Per-CEX adapter isolation, fallback to REST |
| Storage runaway growth | Medium | Medium | Periodic archive + partition pruning |
| Solo dev burnout | Medium | High | Phase plan as commitment device |

### 14.2 Future expansions (v2+)

- Auto-trading via CEX private API (Binance/Bybit/OKX trade endpoint)
- On-chain analytics (Glassnode/Dune/Nansen) — exchange flows, whale tracking
- News feed (CryptoPanic, Twitter API paid)
- Strategy ensemble: Module 1 + technical + news → meta-classifier
- Kelly criterion sizing
- Multi-user SaaS
- Mobile push (Pushover, Pushbullet)
- AWS deploy
- Fresh DEX monitor jako OSOBNY projekt

### 14.3 Wniosek końcowy

Deep Owl v0.1.2 = big caps CEX-first tool z **WebSocket-first ingestion** dla pełnego coverage ~4000 tokenów za $0. **3 moduły:** accumulation detector (Module 1), backtester (Module 2), new listings monitor z user-configurable filter sets (Module 3). Tier-aware scoring 1-4, paper trading first, no real wallet w fazach 0-6.

Faza 0 zamknięta czterema tagami: v0.0.0 (initial DEX-first, deprecated), v0.1.0 (pivot big caps), v0.1.1 (DOCX→MD), v0.1.2 (WS-first + New Listings module).

*End of v0.1.2 architecture deck.*
