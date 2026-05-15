# Deep Owl — Breakout Signals Bot

**Architektura · Roadmap · Standardy · v0.1.0**

Big Caps CEX-First — Top ~5000 Established Tokens
Faza 0 · Plan-as-docs · 2026-05-15

---

## Executive Summary

Deep Owl to bot do wykrywania sygnałów akumulacji na big cap tokenach notowanych na CEX-ach. **TOP 1 priority:** established projekty z stażem na giełdach (top ~5000 z CoinMarketCap/CoinGecko po realnym filtrowaniu).

Składa się z dwóch modułów core:

- **Module 1 — Big Cap Accumulation Detector:** liczy 7 sygnałów per token co 5 minut (volume profile, funding rate skew, OI buildup, cross-exchange divergence, liquidation imbalance, social sentiment opt, bid/ask imbalance opt). Tier-aware threshold: Tier 1 (top 100) próg 70+, Tier 2 (top 500) 65+, Tier 3 (top 5000) 60+.
- **Module 2 — Backtesting Engine:** testuje strategie breakout (Bollinger Squeeze, Volume Spike, Funding Squeeze, RSI Divergence) na historycznych klines z REST API CEX (Binance ma do 2017, Bybit od 2020). Walk-forward MANDATORY (anti-overfitting).

**Universe** budowany z CoinMarketCap + CoinGecko (~10k+ tokenów filtrowane do ~5000 po regułach: market cap > $1M, volume > $100k/24h, listed na min 2 CEX, age > 30 dni, NOT stablecoin, NOT wrapped derivative).

**Output:** Telegram alerts + Web dashboard (FastAPI :8001) + paper trading z symulowanym slippage i fees. Bez realnego kapitału w Fazach 0-6.

**Stack:** Python 3.11+, asyncio, DuckDB embedded (columnar, partitioned by month), Pydantic v2, FastAPI. Solo dev tool, standalone repo bez koligacji z parent market_maker.

**OUT OF SCOPE:** fresh DEX projects monitor, RugCheck, GoPlus, Pumpfun, Dexscreener, Birdeye — wszystko WYWALONE. Jeśli kiedyś chcemy fresh DEX, to OSOBNY projekt.

---

## Spis treści

1. [Glossary — terminy i skróty](#1-glossary)
2. [Architektura systemu](#2-architektura-systemu)
3. [Universe Builder — co skanujemy](#3-universe-builder)
4. [Data sources — matryca](#4-data-sources)
5. [Module 1 — Big Cap Accumulation Detector](#5-module-1)
6. [Module 2 — Backtesting Engine](#6-module-2)
7. [Paper Trading layer](#7-paper-trading)
8. [Output layer — Telegram + Dashboard](#8-output-layer)
9. [Phase plan — roadmap implementacji](#9-phase-plan)
10. [Tech stack + DB schema](#10-tech-stack)
11. [Repo structure + standards](#11-repo-structure)
12. [Risk register + future expansions](#12-risk-register)

---

## 1. Glossary

Definicje terminów. Pomocne dla recenzentów spoza świata krypto/trading.

| Termin | Definicja |
|---|---|
| **Big cap** | Token z dużą kapitalizacją rynkową, established (zwykle top 5000 by market cap), z stażem na CEX-ach. |
| **CEX** | Centralized Exchange — Binance, Bybit, OKX, Coinbase. Kapitał trzymany przez giełdę, REST + WebSocket APIs. |
| **DEX** | Decentralized Exchange — Raydium, Uniswap. **OUT OF SCOPE** w Deep Owl (osobny potencjalny projekt). |
| **OHLCV / Klines** | Open / High / Low / Close / Volume — standardowy format świecy. *Klines* = nazwa Binance dla *candles*. |
| **Funding rate** | Płatność co 8h między longs i shorts na perpetual futures. Negative funding = shorty płacą longom = za dużo shortów. |
| **Open Interest (OI)** | Sumaryczna wartość wszystkich otwartych pozycji futures. Rosnący OI = nowy kapitał napływa. |
| **Liquidation** | Wymuszone zamknięcie pozycji futures z powodu margin call. Long liq = długi liquidated (price spadła). |
| **TWAP / VWAP** | Time/Volume-Weighted Average Price — mid-price ważony czasem lub wolumenem. |
| **Slippage** | Różnica między oczekiwaną ceną wejścia a ceną realnie uzyskaną. Rośnie z size i niskim depth. |
| **FDV** | Fully Diluted Valuation — cena × total supply (ile token byłby wart przy pełnej dystrybucji). |
| **Walk-forward** | Backtest gdzie train + test okna przesuwają się w czasie — eliminuje look-ahead bias. |
| **Sharpe Ratio** | `(mean_return / std_return) × sqrt(252)`. Risk-adjusted return. >1 dobry, >2 świetny. |
| **Max Drawdown (DD)** | Największy spadek od peak do trough w equity curve. Krytyczna metryka risk. |
| **Score 0-100** | Output Modułu 1 — ważona suma znormalizowanych sygnałów. Próg alertu zależny od tier. |
| **Tier (1/2/3)** | Klasyfikacja big cap wg market cap rank: 1=top100, 2=101-500, 3=501-5000. |
| **Wyckoff method** | Klasyczna metoda analizy akumulacji/dystrybucji oparta na volume/price relationship. |
| **Squeeze (short squeeze)** | Wymuszony wzrost ceny gdy zatłoczone shorty są liquidated, podbijając cenę dalej. |
| **DuckDB** | Embedded analytics DB (jak SQLite ale columnar). 1-file backup, świetne dla backtest. |
| **Pydantic v2** | Type-safe modele dla configów + API responses. Walidacja przy parsowaniu. |
| **Async / asyncio** | Współbieżność I/O w Pythonie. Krytyczne dla pollingu API z rate limitami. |

---

## 2. Architektura systemu

### 2.1 Layered architecture

Deep Owl jest aplikacją monolityczną podzieloną na 6 warstw o jasnych zależnościach. Każda warstwa zna tylko warstwy poniżej — to upraszcza testowanie i refactor.

| Warstwa | Odpowiedzialność | Lokalizacja |
|---|---|---|
| **Data adapters** | I/O do CMC, CoinGecko, CEX REST APIs + parent recorder reuse. Normalizacja do common models. | `src/deep_owl/data/` |
| **Storage** | DuckDB persistence + schema migrations + partitioning dla skali ~25GB/rok | `src/deep_owl/db/` |
| **Engine modules** | Universe builder, accumulation scoring, backtest runner | `src/deep_owl/modules/` |
| **Output** | Telegram bot, FastAPI dashboard, paper trader | `src/deep_owl/output/` |
| **CLI** | Entry points: `deep-owl universe build`, `ingest`, `backtest`, `detect`, `run`, `serve` | `src/deep_owl/cli.py` |
| **Config** | Pydantic Settings + .env loading + filter rules + tier thresholds | `src/deep_owl/config.py` |

### 2.2 Pipeline: Universe → Ingest → Detect

Trzystopniowa pipeline współdzielona przez wszystkie moduły:

- **Etap 1 (Universe Builder, 24h cron):** Pobiera ~10k tokenów z CoinGecko + CMC, filtruje do ~5000 realnych według reguł (market cap, volume, age, listings, blacklists). Wynik trafia do tabel `tokens` + `token_listings`.
- **Etap 2 (Klines/Funding/OI Ingester, continuous):** Per CEX (Binance/Bybit/OKX/Coinbase) z respect dla rate limit, pobiera klines 5m + 15m + funding rates + open interest dla aktywnych tokenów. Bulk INSERT do DuckDB partitioned tables.
- **Etap 3 (Module 1 Detector, 5min cycle):** Iteruje universe, dla każdego tokena liczy 7 sygnałów na podstawie ostatnich 7 dni klines + funding + OI. Score > tier_threshold → INSERT do `signals` table → alert worker dispatch (Telegram, dashboard).

### 2.3 Diagram architektury

```
+--------------------------------------------------------------+
|                  DEEP OWL (standalone repo)                  |
|           BIG CAPS CEX-FIRST — top ~5000 tokens              |
+--------------------------------------------------------------+
                              |
        +---------------------+---------------------+
        |                     |                     |
   +----v-----+         +-----v-----+         +-----v-----+
   |  DATA    |         |  ENGINE   |         |  OUTPUT   |
   |  LAYER   |         |  LAYER    |         |  LAYER    |
   +----------+         +-----------+         +-----------+
        |                     |                     |
   CMC + CoinGecko       Universe Builder      Telegram bot
   Binance/Bybit/        (filter ~5k z 10k+)   FastAPI :8001
   OKX/Coinbase REST                           Paper Trader
   (klines+fund+OI)      Module 1:             (sim PnL)
   Parent recorder       Accumulation
   (BTC/ETH/HYPE opt)    Detector
   Social scanner opt    (CEX big caps)
                         Module 2:
                         Backtester
                         (REST historical)
                              |
                       +------v------+
                       |   STORAGE   |
                       |   DuckDB    |
                       +-------------+
                       tokens · token_listings
                       klines_5m · klines_15m
                       funding_history
                       open_interest
                       signals · paper_trades
                       backtest_runs
```

### 2.4 Decyzje architektoniczne (top 9)

| Decyzja | Wybór | Alternatywa | Rationale |
|---|---|---|---|
| Język | Python 3.11+ | Rust dla perf | Match parent stack, asyncio dla I/O-heavy |
| DB | DuckDB + parquet | Postgres / SQLite | Embedded, columnar, krytyczne dla skali ~5000×klines |
| Universe scope | ~5000 filtered z 10k+ | Top 10/50/100 | User explicit: full coverage CMC/CoinGecko |
| Data primary | CEX REST API | Parent recorder tick | Recorder tylko BTC/ETH/HYPE; REST pokrywa 5000 |
| Exchange priority | Binance/Bybit/OKX/Coinbase | All 14 z parent | ~95% global volume, best APIs |
| Module count | 2 (accumulation + backtest) | 3 (poprzednio + fresh DEX) | Fresh DEX wywalone z scope |
| Output | Sygnały + paper trading | Auto-trading | User wybór, niskie ryzyko |
| Repo | Standalone | Worktree parent | Czysta izolacja od market_maker |
| Telegram lib | python-telegram-bot v20 | aiogram | Większa community |

**Odrzucone podejścia:**

- ❌ Microservices — overkill dla solo dev, monolith wystarczy
- ❌ Kafka / RabbitMQ event bus — DuckDB + asyncio queue wystarczą
- ❌ Per-token WebSocket subscriptions — 5000 streams = 5000 connections; REST polling tańszy operacyjnie
- ❌ Custom orderbook reconstruction dla wszystkich 5000 tokenów — niepotrzebne
- ❌ DEX adapters (Dexscreener, Birdeye) — out of scope całkowicie

### 2.5 Skala i performance

Universe ~5000 tokenów × ~3 CEX listings × klines 5m to znaczna skala. Estymowany growth:

| Komponent | Skala | Storage estimate |
|---|---|---|
| Universe rebuild | 5000 tokens × 24h refresh | ~5MB/dzień |
| Klines 5m | 5000 × 3 listings × 288 candles/d | ~13GB/rok (DuckDB columnar 3x compression) |
| Klines 15m | Jak wyżej, ÷3 | ~4.5GB/rok |
| Funding (8h cycle) | 5000 × 1 CEX × 3 calls/d | <1GB/rok |
| Open Interest (1h) | 5000 × 1 CEX × 24 calls/d | ~3GB/rok |
| Signals (50 alerts/d) | Indexed time-series | <500MB/rok |

**Total roczny: ~25GB DuckDB.** Po 2-3 latach archiwizacja klines starszych niż 90 dni do parquet (cold storage).

**Bottleneck:** API rate limits. Binance 6000 weight/min ≈ 6000 calls/min. Top 5000 × 4 CEX = 20k calls — wymaga round-robin między CEX-ami + smart caching + priorytetyzacji per tier (Tier 1 częściej, Tier 3 rzadziej).

---

## 3. Universe Builder

### 3.1 Cel i source

Universe Builder ma odpowiedzieć na pytanie: **które ~5000 tokenów monitorować?** CMC i CoinGecko mają 10k+ tokenów ale 70% to dead/scam. Filtrujemy aktywne.

- **Source primary:** CoinGecko `/coins/markets` (paginated, 30 req/min free wystarczy dla daily refresh ~10k tokens w 1-2 min)
- **Source secondary:** CoinMarketCap `/v1/cryptocurrency/listings/latest` (top 5000 w 1 call, free 333/dzień — wystarczy na cross-check)

### 3.2 Filter pipeline (configurable)

Default reguły filtrowania w `config.yaml`:

| Reguła | Default value | Rationale |
|---|---|---|
| `min_market_cap_usd` | $1,000,000 | Ekskluzja absolutnych dust tokens |
| `min_volume_24h_usd` | $100,000 | Wymagana realna płynność |
| `min_age_days` | 30 | Eliminuje świeże launches (out of scope) |
| `min_cex_listings` | 2 z top 20 CEX | Wymaga realnej adopcji |
| `stablecoin_blacklist` | USDT, USDC, DAI, FDUSD, ... | Stable nie ma volatility do detekcji breakout |
| `wrapped_synthetic_blacklist` | WBTC, stETH, jupSOL, ... | Same risk profile co underlying |

### 3.3 Per-token CEX listing detector

Po filtrowaniu, dla każdego tokena resolveujemy listing per CEX (na których z 4 prioritized CEX-ów jest dostępny i pod jakim symbolem):

| Token | Binance | Bybit | OKX | Coinbase |
|---|---|---|---|---|
| `bitcoin (BTC)` | BTCUSDT | BTCUSDT | BTC-USDT | BTC-USD |
| `ethereum (ETH)` | ETHUSDT | ETHUSDT | ETH-USDT | ETH-USD |
| `solana (SOL)` | SOLUSDT | SOLUSDT | SOL-USDT | SOL-USD |
| `chainlink (LINK)` | LINKUSDT | LINKUSDT | LINK-USDT | LINK-USD |
| ... | ... | ... | ... | ... |

Result: tabela `token_listings` z one-to-many: 1 token → N listings (typowo 1-4 dla top tokens, 0-2 dla niższych tier).

### 3.4 Refresh policy

- Daily rebuild full pipeline (24h cron)
- Delta detection: nowe tokeny w universe (mark `new=TRUE`), usunięte (delisted lub spadły poniżej filter — soft delete `is_active=FALSE`, NIE delete row)
- Per-token `first_seen_at` zachowane (audyt: kiedy pojawił się w universe)

---

## 4. Data sources

### 4.1 Quick reference

| # | Źródło | Faza | Auth | Rate limit (free) | Koszt |
|---|---|---|---|---|---|
| 1 | CoinGecko API | 2 | key opt | 30 req/min | $0 / $129 mo Pro |
| 2 | CoinMarketCap | 2 | API key | 333 req/d | $0 / $79 mo Hobbyist |
| 3 | Binance REST | 3 | None | 6000 weight/min | $0 |
| 4 | Bybit REST | 3 | None | 50 req/sec | $0 |
| 5 | OKX REST | 3 | None | 20 req/2s | $0 |
| 6 | Coinbase REST | 3 | None | 10 req/sec | $0 (spot only) |
| 7 | Parent recorder | 3 opt | filesystem | — | $0 (BTC/ETH/HYPE) |
| 8 | Telegram Bot API | 6 | Bot token | 30 msg/s | $0 |
| 9 | Social_media_scanner | 5 opt | parent venv | — | $0 |

### 4.2 CEX endpoints — common shape

| Endpoint | Binance | Bybit | OKX | Coinbase |
|---|---|---|---|---|
| Klines (spot) | `/api/v3/klines` | `/v5/market/kline` | `/api/v5/market/candles` | `/products/{id}/candles` |
| Klines (perp) | `/fapi/v1/klines` | `/v5/market/kline` (linear) | `/api/v5/market/candles` (SWAP) | *(brak public)* |
| Funding | `/fapi/v1/fundingRate` | `/v5/market/funding/history` | `/api/v5/public/funding-rate-history` | *(brak public)* |
| Open Interest | `/futures/data/openInterestHist` | `/v5/market/open-interest` | `/api/v5/public/open-interest` | *(brak public)* |
| Symbols meta | `/api/v3/exchangeInfo` | `/v5/market/instruments-info` | *(per req)* | `/products` |

### 4.3 Sekrety — gdzie trzymać

| Sekret | Storage | Wymagany w fazie |
|---|---|---|
| `COINMARKETCAP_API_KEY` | `.env` (gitignored) | 2 (cross-check) |
| `COINGECKO_API_KEY` | `.env` (gitignored, opt) | 2 opt (Pro tier) |
| `TELEGRAM_BOT_TOKEN` | `.env` (gitignored) | 6 |
| `TELEGRAM_CHAT_ID` | `.env` (gitignored) | 6 |

CEX public APIs (Binance, Bybit, OKX, Coinbase) **NIE wymagają auth** dla publicznych endpointów (klines, funding, OI).

---

## 5. Module 1 — Big Cap Accumulation Detector

### 5.1 Pytanie biznesowe

**Czy ten established big cap akumuluje się PRZED breakoutem?** Cel: złapać moment, w którym smart money cicho buduje pozycje na tokenach z stażem na CEX-ach, ZANIM publiczność zauważy ruch.

*Insight metodologiczny: prawdziwa akumulacja często pokazuje wzrost wolumenu PRZY płaskiej cenie + negative funding (zatłoczone shorty) + rosnący OI (build-up). Klasyk Wyckoff method dla spot + cross-validate z funding/OI metrics dla futures.*

### 5.2 Sygnały — siedem źródeł evidence

Każdy sygnał zwraca wartość znormalizowaną do `[0, 1]` (sigmoid od threshold). Następnie ważona suma daje score 0-100:

| # | Sygnał | Threshold | Waga | Skąd dane |
|---|---|---|---|---|
| 1 | Volume rising on flat/down price | `>2.0` + `|Δp|<5%` | 0.20 | `klines_5m + klines_15m` |
| 2 | Funding rate skew (negative) | `<-0.01%` przez 24h | 0.20 | `funding_history` |
| 3 | Open Interest buildup | +20% vs 7d_avg | 0.15 | `open_interest` |
| 4 | Cross-exchange volume divergence | >2x między CEX-ami | 0.15 | `klines_5m × N CEX` |
| 5 | Liquidation imbalance (long) | `long_liq/short_liq > 2.0` | 0.10 | (parent recorder lub CEX REST) |
| 6 | Social mention velocity (opt) | >3x vs 24h_avg | 0.10 | `Social_media_scanner` reuse |
| 7 | Bid/ask order book imbalance (opt) | >1.5x bid | 0.10 | (parent recorder L5) |

Suma wag = 1.00. Jeśli sygnał nie jest dostępny (np. token spot-only → no funding/OI), waga jest **redystrybuowana proporcjonalnie** do pozostałych aktywnych sygnałów.

### 5.3 Score formula

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
    return score, signals  # signals = breakdown JSON
```

### 5.4 Tier-aware threshold

Nie wszystkie tokeny są sobie równe. Top 100 ma lepszą data quality, większe moves wymagają wyższych scores. Niskie tiery są bardziej zaszumione — niższy threshold + krótszy cooldown żeby nie przegapić alt sezonu:

| Tier | Definicja | Alert threshold | Cooldown per token |
|---|---|---|---|
| Tier 1 | Top 100 by market cap | 70+ | 12h |
| Tier 2 | Top 101-500 | 65+ | 8h |
| Tier 3 | Top 501-5000 | 60+ | 4h |

### 5.5 Sygnały — uzasadnienie metodologiczne

- **Sygnał 1 (volume on flat price):** klasyczny smart money pattern. Wysoki volume bez ruchu ceny = smart money kupuje od retail panicked sellers (Wyckoff accumulation).
- **Sygnał 2 (funding skew):** specyficzny dla perpetual futures. Negative funding = shorty płacą longom = za dużo shortów = squeeze potential. Backtest historyczny pokazuje że kombinacja negative funding + low volatility często poprzedza pumpy 5-15% w 24-72h.
- **Sygnał 3 (OI buildup):** rosnący Open Interest przy stabilnej cenie = nowy kapitał napływa do pozycji. W połączeniu z negative funding (Sygnał 2) jednoznacznie wskazuje na build-up shorts → squeeze.
- **Sygnał 4 (cross-exchange divergence):** smart money często koncentruje aktywność na jednym CEX (najlepsza płynność). Volume na Bybit 2x vs Binance dla danego tokena → coś się dzieje na Bybit.
- **Sygnał 5 (long liquidation imbalance):** masowe liquidations longów to capitulation/bottom. >2x long liq vs short liq w 24h = weak hands flushed, potencjalnie lepsza relative entry.
- **Sygnał 6 (social):** opcjonalne. Velocity > 3x = nagły wzrost zainteresowania, często poprzedza retail FOMO.
- **Sygnał 7 (bid/ask imbalance):** tylko jeśli mamy orderbook snapshot (parent recorder dla BTC/ETH/HYPE). Imbalance > 1.5x na bid side = bid pressure.

### 5.6 Cadence — częstotliwość skanowania

| Komponent | Interval | Rationale |
|---|---|---|
| Universe rebuild | 24h | Mało zmienne; delisting/listing rzadkie |
| Klines pull (5m/15m) | Per CEX rate limit | Świeże dane co interval świecy |
| Funding rates pull | 8h (funding cykl) | Tyle ile warto |
| Open Interest pull | 1h | Wolniej zmienne |
| Module 1 scoring | 5m (po zamknięciu świecy) | Świeży snapshot → świeży score |
| Telegram alert send | Async po INSERT signal | Cooldown per tier |

### 5.7 Output — schemat alert message

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

Dashboard pokazuje to samo + breakdown bar chart per signal + histogram score w czasie + chart price/volume/OI/funding z markerami alertów.

### 5.8 Persist — schema `signals`

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | BIGINT | Auto-increment PK |
| `token_id` | VARCHAR (FK) | CoinGecko ID: 'bitcoin' |
| `primary_exchange` | VARCHAR | CEX z highest signal score |
| `primary_symbol` | VARCHAR | CEX-specific symbol |
| `timestamp` | TIMESTAMP | Moment scoring |
| `score` | DOUBLE | 0-100 (CHECK constraint) |
| `tier` | INTEGER | 1, 2, 3 (CHECK) |
| `breakdown` | JSON | Per-signal raw + normalized values |
| `alert_sent` | BOOLEAN | Czy alert wysłany (cooldown logic) |
| `alert_channels` | JSON | `['telegram', 'dashboard']` |

### 5.9 Cross-validation Modułu 1 (KRYTYCZNE)

**Nie wdrażamy live Modułu 1 z arbitralnymi wagami.** Najpierw evidence że historycznie działało:

1. Pull historical klines + funding + OI dla top 100 tokenów (1-2 lata)
2. Replay Module 1 scoring na każdej świecy
3. Compare alerty (score > threshold) vs realne breakouts (price +20% w 24h od alertu)
4. Precision/Recall/F1 per signal weight config
5. Tune wagi (grid search lub Bayesian opt)
6. Walk-forward sprawdzenie out-of-sample

**Target:** precision > 0.4 (lepsza niż random) na out-of-sample → wdrożenie live. Inaczej iteruj wagi/thresholds.

---

## 6. Module 2 — Backtesting Engine

### 6.1 Pytanie biznesowe

**Czy moja strategia ZADZIAŁAŁABY na historycznych pumpach big cap?** Cel: walidacja strategii przed wdrożeniem live, oszacowanie ryzyka (max DD, exposure), tuning parametrów.

Backtest zwraca metrics + lista hipotetycznych trades + HTML raport z wykresami. **Anti-overfitting przez walk-forward analysis MANDATORY.**

### 6.2 Komponenty

| Plik | Rola |
|---|---|
| `backtest/candles.py` | Pull historical klines z CEX REST (Binance ma do 2017, Bybit od 2020) |
| `backtest/universe.py` | Wybór tokenów do backtestu (subset z universe builder, `top_100`/`500`/`5000`) |
| `backtest/strategies/base.py` | Strategy interface (Protocol): `warmup_bars` + `on_bar` |
| `backtest/strategies/breakout_consolidation.py` | Bollinger Squeeze + volume confirmation |
| `backtest/strategies/volume_spike.py` | vol > 3x SMA20 + close > prev high |
| `backtest/strategies/funding_squeeze.py` | negative funding + price consolidation → long entry |
| `backtest/strategies/rsi_divergence.py` | RSI oversold + bullish divergence |
| `backtest/slippage.py` | Linear slippage model |
| `backtest/fees.py` | Per-CEX fee table |
| `backtest/metrics.py` | Sharpe, Sortino, Calmar, max DD, win rate, exposure time |
| `backtest/engine.py` | Walk-forward runner |

### 6.3 Strategy interface

```python
class Strategy(Protocol):
    name: str
    params: dict[str, Any]

    def warmup_bars(self) -> int:
        """Ile świec potrzebne ZANIM strategia może działać (np. 20 dla SMA20)."""

    def on_bar(self, ctx: BacktestContext) -> Optional[Signal]:
        """Wywoływana per bar. Zwraca Signal jeśli wejście, None inaczej."""

# Signal:
{ 'side': 'buy' | 'sell',
  'size_usd': float,
  'stop_loss_pct': float,
  'take_profit_pct': float,
  'max_hold_bars': int }
```

### 6.4 Walk-forward analysis

Anti-overfitting protocol **mandatory**. Standardowy backtest na całym dataset prowadzi do over-fitting (parametry strojone na danych które testują). Walk-forward eliminuje to:

- Train window: 60 dni (parametry optimalizowane)
- Test window: 14 dni (out-of-sample evaluation)
- Slide: 14 dni (przesuwamy całość naprzód)
- Out-of-sample: zawsze ≥ 30% total dataset
- Final score = średnia metrics z wszystkich test windows

### 6.5 Slippage model

Dla CEX big caps (high liquidity), slippage jest niski. Linear model:

```
slippage_bps = base_bps + (size_usd / volume_5m_usd) * 10000 * impact_factor

defaults dla CEX:
  base_bps = 2     (0.02% — bid/ask spread crossing dla top tokens)
  impact_factor = 1.5  (size 1% rolling 5m volume = ~150 bps slippage)
```

### 6.6 Fees per CEX

| Exchange | Spot fee taker | Futures fee taker | Notes |
|---|---|---|---|
| Binance | 0.10% | 0.040% | VIP 0; może być niższe z BNB discount |
| Bybit | 0.10% | 0.060% | Standard |
| OKX | 0.10% | 0.050% | Standard |
| Coinbase | 0.40% | *(brak public futures)* | Spot only |

### 6.7 Metryki — co wychodzi z backtestu

| Metryka | Definicja | Cel |
|---|---|---|
| Win rate | `wins / total_trades` | >50% |
| Avg PnL | `mean(trade_pnl_pct)` | Positive po fees |
| Total PnL | `sum(trade_pnl_usd)` | Absolute zysk |
| Sharpe | `mean(ret) / std(ret) * √252` (annualized) | >1 (>2 świetne) |
| Sortino | Jak Sharpe, denom = downside std | >1.5 |
| Calmar | `annualized_return / max_drawdown` | >2 |
| Max DD | `max(peak - trough) / peak` | <25% pref. |
| Max DD duration | Bars between peak and recovery | Krótko = lepsze |
| Exposure time | % bars in-position | 30-70% optymalne |
| Trade count | Liczba completed trades | >30 dla istotności statystycznej |

### 6.8 Universe backtestu

| Universe size | Faza | Tokens | Estimated klines | Backtest time/strategy |
|---|---|---|---|---|
| `top_100` | 4 (start) | 100 | ~150M (5m × 1y × 3 CEX) | <5 min |
| `top_500` | 4+ | 500 | ~750M | ~30 min |
| `top_5000` | 4++ | 5000 | ~7.5B | ~5h (parallel) |
| `custom` | — | user-defined | varies | varies |

### 6.9 HTML report — co user widzi

Każdy backtest run produkuje samodzielny HTML plik z plotly wykresami. Zawiera:

- Equity curve (skumulowany PnL w czasie)
- Drawdown chart (underwater curve)
- Per-trade scatter (entry/exit annotated na price chart)
- Distribution PnL per trade (histogram)
- Tabela trades z entry/exit/pnl/duration
- Metrics panel (wszystkie z 6.7)
- Strategy params used (full reproducibility)
- Walk-forward windows breakdown
- Per-token breakdown (które tokeny dawały najwięcej PnL, które najgorsze)

### 6.10 Strategie — overview

- **`breakout_consolidation`:** Bollinger Bands squeeze (band width < 30 percentile) + close > upper band z volume > SMA20×1.5. Long entry, stop 5% poniżej entry, target 15%.
- **`volume_spike`:** vol > 3x SMA20 + close > 5d high. Entry confirmed by next bar > entry. Trailing stop 7%.
- **`funding_squeeze`:** avg funding 24h < -0.005% + price w bands ±3% przez 12h + OI rosnący. Long entry, stop 4%, target 12%.
- **`rsi_divergence`:** RSI(14) < 30 z bullish divergence (price lower low + RSI higher low w ciągu 20 bars). Long entry, stop 6%, target 18%.

### 6.11 Backtest Modułu 1

Cross-validation Modułu 1 to drugi tryb backtestu (patrz 5.9). Replay scoring na historical data, pomiar precision/recall sygnałów vs realne breakouts.

---

## 7. Paper Trading

### 7.1 Cel i zakres

Paper trading symuluje rzeczywiste wejścia/wyjścia w bazie danych **BEZ dotykania realnego kapitału**. Pozwala walidować strategie i sygnały Modułu 1 na real-time data, ale bez ryzyka. Decyzja userowa potwierdzona w Fazie 0.

### 7.2 Architektura

Worker subskrybuje INSERT do tabeli `signals`. Gdy nowy signal score > `config.auto_paper_threshold` (default: disabled, opt-in):

- Pull current price + 5m volume z CEX REST (best-effort fresh)
- Compute `size_usd` z portfolio config (default: 1% capital, max $100 per trade)
- Apply slippage: `entry_price = current_price * (1 + slippage_bps/10000)`
- Apply fee: `fee_usd = size_usd * fee_pct` (per CEX from `fees.py`)
- INSERT do `paper_trades` z `status='open'`

### 7.3 Exit logic

Trade jest zamknięty gdy któraś z czterech reguł zachodzi:

- `stop_loss`: cena spadła o X% od entry (default 5%)
- `take_profit`: cena wzrosła o Y% od entry (default 15%)
- `time_stop`: trade open dłużej niż `max_hold_hours` (default 48h)
- `manual`: user zamknął przez CLI lub dashboard

### 7.4 PnL accounting

Zamknięcie wpisuje `exit_ts`, `exit_price`, `pnl_usd`, `pnl_pct`, `close_reason`. Cumulative metrics w dashboardzie liczone on-the-fly z agregacji tabeli `paper_trades`.

### 7.5 Co NIE robi paper trader

- NIE łączy się z real wallet (brak private keys w systemie)
- NIE wykonuje real swaps (brak Web3 integration)
- NIE zarządza real portfolio
- NIE retoryczna ochrona MEV (paper = brak ryzyka MEV)

---

## 8. Output layer — Telegram + Dashboard

### 8.1 Telegram bot

Async bot używający `python-telegram-bot v20+`. Wysyła alerts + odpowiada na komendy interactive.

#### Komendy

| Komenda | Akcja |
|---|---|
| `/start` | Register chat (zapisz chat_id w config) |
| `/help` | Lista komend |
| `/signals [N]` | Ostatnie N (default 10) sygnałów z Modułu 1 |
| `/top` | Top tokeny wg score w ostatnich 24h |
| `/paper` | Open positions + cumulative PnL summary |
| `/backtest <strategy>` | Uruchom backtest na default universe (async, link do raportu) |
| `/mute <token>` | Wycisz alerty dla token na 12h |
| `/tier <1|2|3>` | Change min alert tier (silenced for tier above) |

#### Rate limiting & dedup

- Cooldown per token zależny od tier (12h / 8h / 4h)
- Daily cap 30 alerts (config)
- Telegram bot rate limit: 30 msg/s globalny — implementujemy queue + throttle

### 8.2 FastAPI dashboard

Local-only (`bind 127.0.0.1:8001`), zero auth. Sześć zakładek:

| Zakładka | Zawartość |
|---|---|
| **Universe** | Przegląd ~5000 tokenów z filtrami (tier, market cap, listing count, age) |
| **Live Signals** | Tabela auto-refresh (HTMX 30s) + filtry score/tier/timestamp |
| **Top Movers** | Top 50 tokenów wg recent score (ostatnie 24h) |
| **Paper Trading** | Open positions + closed trades + cumulative PnL chart |
| **Backtests** | Historia runs + uruchamianie nowych + inline HTML reports |
| **Settings** | View-only display config.yaml + env var status (without values) |

### 8.3 Stack frontend

Minimalistyczny — Jinja2 templates + HTMX dla reactivity + Plotly dla charts. Brak React/Vue/Svelte (overkill dla solo dev tool).

### 8.4 Mockup — Live Signals tab

```
+--------------------------------------------------------------+
| Deep Owl · Live Signals · Auto-refresh 30s                  |
+--------------------------------------------------------------+
| [Tier: All v]  [Score: >=60 v]  [Last: 1h v]   refresh now  |
+--------------------------------------------------------------+
| Time   | Token     | Tier | Score | Signals (top 3)         |
+--------+-----------+------+-------+-------------------------+
| 14:35  | $BTC      |   1  |  82   | vol+185% / fund-0.024 / OI+28% |
| 14:30  | $LINK     |   1  |  75   | vol+167% / cross-ex 2.1x       |
| 14:28  | $JTO      |   2  |  71   | vol+220% / fund-0.018          |
| 14:25  | $TIA      |   2  |  68   | OI+45% / liq imbalance 3x      |
| 14:20  | $AVAX     |   1  |  73   | vol+195% / cross-ex 2.4x       |
+--------+-----------+------+-------+-------------------------+
| [load more 50]                                               |
+--------------------------------------------------------------+
```

---

## 9. Phase plan

### 9.1 Six fazes overview

| Faza | Cel | Deliverable | Tag |
|---|---|---|---|
| **0 (DONE)** | Plan-as-docs + pivot v0.1.0 | MD deck + 8 root MD + skeleton + git init + tags | v0.0.0 / v0.1.0 / v0.1.1 |
| **1** | Repo bootstrap | venv + deps + DB client + logger + CLI stub | v0.2.0 |
| **2** | Universe Builder | CMC + CoinGecko clients + filter pipeline + listing resolver | v0.3.0 |
| **3** | CEX REST adapters | Binance/Bybit/OKX/Coinbase clients (klines+funding+OI) | v0.4.0 |
| **4** | Backtesting | Candles + 4 strategies + walk-forward + reports | v0.5.0 |
| **5** | Module 1 | Big Cap Accumulation Detector + cross-validation historical | v0.6.0 |
| **6** | Output | Telegram + Dashboard + Paper Trader | v0.7.0 / v1.0.0 |

### 9.2 Definition of Done — per faza

- All tests pass: `pytest -x` dev, `pytest tests/` pre-commit
- Coverage ≥ 80% (jeśli dotyka kodu hot-path)
- ruff + mypy clean
- `PHASES.md` checkbox flipped
- `CHANGELOG.md` zaktualizowany
- Tag git `v0.{N}.0`
- Demo lokalnie (gdzie możliwe)

### 9.3 Estymacja timeline

| Faza | Effort | Calendar |
|---|---|---|
| 0 | Done (1-2 dni) | Teraz |
| 1 | 3-5 dni | +1 tydzień |
| 2 | 5-7 dni | +2 tygodnie |
| 3 | 7-10 dni | +3 tygodnie |
| 4 | 10-14 dni | +1.5 miesiąca |
| 5 | 10-14 dni | +2 miesiące |
| 6 | 10-14 dni | +3 miesiące |

Powyższe są estimates dla solo dev pełen czas. Rzeczywista calendar zależy od dostępności + nieprzewidzianych blockerów (API changes, edge cases, scale challenges przy 5000 tokenów).

### 9.4 Risk per faza

| Faza | Risk | Mitigation |
|---|---|---|
| 1 | Pre-commit hooks za wolne | Split: ruff/mypy w pre-commit, pytest w pre-push only |
| 2 | CMC free tier 333/d za niski | CoinGecko jako primary, CMC jako monthly cross-check |
| 2 | Universe size > expected (10k+) | Filter aggressive defaults; tune po pierwszym rebuild |
| 3 | CEX rate limit hits | Round-robin 4 CEX + smart cache + per-tier priorytetyzacja |
| 3 | Coinbase brak public futures | Coinbase = spot only universe coverage |
| 4 | Backtest overfitting | Walk-forward MANDATORY, out-of-sample ≥ 30% |
| 4 | Storage > 100GB szybciej niż przewidywano | Partition by month + archive >90 dni do parquet |
| 5 | False positive alerts | Conservative defaults + per-token mute + cross-validation precision target |
| 6 | Telegram spam | Cooldown per tier + daily cap 30 |

### 9.5 Anti-regression checklist

Wymuszany przed każdym tag (manual + automated):

- Pre-commit hook: `pytest -x` + `ruff check`
- Pre-faza-N+1: `pytest tests/` (full) + manual demo Fazy N (CLI smoke test)
- Każdy ADR ma sekcję "What it would break if reversed"
- CHANGELOG.md changes diff > 0 lines (zmuszamy do udokumentowania)
- Tag tylko jeśli `git status` clean (no uncommitted)

### 9.6 Co NIE jest w roadmapie (out of scope całkowicie)

- ❌ Fresh DEX projects monitor (Pumpfun, Raydium new pairs, Birdeye new tokens)
- ❌ Rugpull detection (RugCheck.xyz, GoPlus Security)
- ❌ DEX adapters (Dexscreener, Birdeye, Jupiter, Uniswap)
- ❌ Per-chain native RPC (Solana web3.py, Ethereum eth_call)
- ❌ Real wallet / private keys / on-chain transactions
- ❌ Mobile app, multi-user SaaS
- ❌ AWS deploy w Fazach 0-6 (lokalne dev)
- ❌ Powielanie funkcjonalności parent market_maker

**Wszystkie powyższe to potencjalna v2 — wymagają osobnej decyzji. Fresh DEX = OSOBNY projekt nie Deep Owl.**

---

## 10. Tech stack + DB schema

### 10.1 Stack — co i dlaczego

| Warstwa | Wybór | Uzasadnienie |
|---|---|---|
| Język | Python 3.11+ | Match parent stack, asyncio dla I/O-heavy CEX polling |
| Async | asyncio + aiohttp | Standard parent |
| API framework | FastAPI + uvicorn | Parent uses it, dashboard reuse pattern |
| Storage | DuckDB (file-based) | Embedded, columnar, krytyczne dla skali |
| Candle agg | numpy + pyarrow | Parent uses pyarrow, fast columnar |
| HTTP client | aiohttp + tenacity | Standard for rate-limited APIs |
| Telegram | `python-telegram-bot v20+` | Async-native, large community |
| Tests | pytest + pytest-asyncio + pytest-cov | Parent stack, target 80%+ |
| Linting | ruff + mypy | Modern, fast, strict mode |
| Config | pydantic-settings | Type-safe + .env loading |
| Logging | stdlib logging + structlog | Structured for dashboard ingestion |

### 10.2 Co NIE używamy (świadome decyzje)

- Postgres / MySQL — overhead serwera, nie potrzebujemy multi-writer
- Redis — DuckDB + asyncio queue wystarczą
- Kafka / RabbitMQ — overengineering dla solo dev monolith
- Docker — lokalne dev na razie
- Kubernetes — overkill na zawsze
- React / Vue / Svelte — Jinja2 + HTMX wystarczą dla dashboard

### 10.3 DB schema — tabele (v0.1.0)

| Tabela | Klucz główny | Cel |
|---|---|---|
| `_meta` | `key` | Schema version + app metadata |
| `tokens` | `token_id` (CoinGecko ID) | Master tokens recognized |
| `token_listings` | `(token_id, exchange, symbol)` | Per-CEX listing per token |
| `klines_5m` | `(exchange, symbol, ts)` | OHLCV 5min z REST API CEX |
| `klines_15m` | `(exchange, symbol, ts)` | OHLCV 15min |
| `funding_history` | `(exchange, symbol, ts)` | Funding rate per 8h cycle |
| `open_interest` | `(exchange, symbol, ts)` | OI snapshot per godzinę |
| `signals` | `id` | Output Modułu 1 (score + breakdown JSON + tier) |
| `paper_trades` | `id` | Open + closed positions, simulated PnL |
| `backtest_runs` | `id` | Metadata per backtest run + metrics JSON |

Pełen schema: [`src/deep_owl/db/schema.sql`](../src/deep_owl/db/schema.sql).

---

## 11. Repo structure + standards

### 11.1 Repo skeleton (po Fazie 0)

```
Breakout_signals/
├── .git/                  # standalone repo
├── .gitignore             # /data/, /logs/, .env, venv/, *.duckdb
├── .env.example           # template (bez sekretów)
├── README.md
├── CLAUDE.md              # KRYTYCZNE: project context dla Claude Code
├── ARCHITECTURE.md        # single source of truth
├── PHASES.md              # checkbox progress
├── DATA_SOURCES.md        # API matrix
├── GIT_WORKFLOW.md        # branche, commits, PR
├── FILE_HYGIENE.md        # anti-sprawl rules
├── CHANGELOG.md           # 1 linijka per fazę
├── pyproject.toml
├── requirements.txt
├── requirements-dev.txt
├── docs/
│   ├── deep_owl_v1.md     # ten dokument (long-form architecture deck)
│   └── decisions/         # ADRs
├── src/deep_owl/
│   ├── __init__.py
│   ├── cli.py             # entry point: deep-owl
│   ├── config.py
│   ├── logger.py
│   ├── db/                # DuckDB client + schema
│   ├── data/              # CMC, CoinGecko, CEX REST adapters
│   ├── modules/           # universe, accumulation, backtest
│   └── output/            # telegram, dashboard, paper_trader
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── scripts/
    └── bootstrap.ps1
```

### 11.2 File hygiene — hard limity

| Lokalizacja | Limit | Action po przekroczeniu |
|---|---|---|
| MD w root | max 8 | Audit + konsolidacja |
| ADR w `docs/decisions/` | max 5 w Fazach 0-6 | Sygnał over-engineering |
| Long-form deck w `docs/` | 1 plik (`deep_owl_v1.md`) | Update redakcyjnie, nie wersjonuj filename |
| Python modules w `src/deep_owl/` (top-level) | max 6 | Wymuszony refactor do podpakietów |
| Lines per Python file | max 400 (max 800 absolute) | Split |
| Functions per file | max 15 | Split |
| Function length | max 50 linii | Refactor — extract helpers |

### 11.3 Git workflow — TLDR

- Branch naming: `phase-N/short-slug`, `fix/short-slug`, `docs/short-slug`
- Direct push do `main` ZABRONIONY (po Fazie 1 — local pre-commit hook)
- PR-only flow: `gh pr create` → self-review → squash merge
- Conventional Commits: `feat`/`fix`/`refactor`/`docs`/`test`/`chore`/`perf`
- Tag per faza: `v0.{N}.0`
- ZAKAZANE: `--no-verify`, `--amend` na pushed, `push --force` na main

---

## 12. Risk register + future expansions

### 12.1 Top risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| CEX API change/rate limit | Medium | High | Per-CEX fallback (4 priorytetów), monitoring 429 |
| DuckDB > 100GB (slow queries) | Medium (rok+) | Medium | Partition by month, archive starsze >90d do parquet |
| Backtest overfitting | High | High | Walk-forward MANDATORY, out-of-sample ≥ 30% |
| False positive alerts (Module 1) | High | Medium | Cross-validation pre-deployment, tier-aware threshold |
| Telegram bot spam | Medium | Low | Cooldown per tier, daily cap 30 |
| CLAUDE.md drift vs reality | Medium | Medium | Co fazę: re-read i update jeśli stale |
| CMC free tier 333/d niewystarczający | Medium | Low | CoinGecko jako primary, CMC tylko miesięczny cross-check |
| CoinGecko free 30/min za niski | Low | Medium | Pro tier $129/mo jeśli wymusi (Faza 2 evaluation) |
| Solo dev burnout | Medium | High | Phase plan jako commitment device, CHANGELOG jako evidence |

### 12.2 Future expansions (v2+)

- Auto-trading: real wallet via CEX private API (Binance/Bybit/OKX trade endpoint)
- On-chain analytics integration (Glassnode/Dune/Nansen) — exchange flows, whale wallet tracking
- News feed integration (CryptoPanic, Twitter API v2 paid)
- Strategy ensemble: Module 1 score + technical signals + news → meta-classifier
- Kelly criterion position sizing (zamiast fixed %)
- Multi-user SaaS: per-user portfolio, shared signals, premium tiers
- Mobile push notifications (Pushover, Pushbullet) jako alternatywa Telegram
- AWS deploy: parent ma AWS Tokyo Lightsail, sister deploy
- Fresh DEX monitor jako OSOBNY projekt (Pumpfun, Raydium, Birdeye)

### 12.3 Wniosek końcowy

Deep Owl v0.1.0 jest big caps CEX-first tool: ~5000 established tokenów z CMC/CoinGecko po filtrowaniu, 4 prioritized CEX-y (Binance/Bybit/OKX/Coinbase) jako primary data source, 2 moduły (accumulation detector + backtester), tier-aware scoring (top 100 strict, top 5000 soft), paper trading first, no real wallet w fazach 0-6.

Faza 0 zamknięta trzema tagami: `v0.0.0` (initial DEX-first plan, deprecated), `v0.1.0` (pivot na big caps CEX-first), `v0.1.1` (DOCX → MD swap dla łatwiejszej edycji). Faza 1+ to rzeczywista implementacja z wyraźnymi deliverables i acceptance criteria. Sukces mierzony tagami git, CHANGELOG entries, oraz precision/recall Modułu 1 na cross-validation — nie linijkami kodu.

*End of v0.1.0 architecture deck.*
