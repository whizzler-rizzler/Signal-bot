# DATA_SOURCES — Deep Owl

> Wszystkie źródła danych z których czerpiemy. Zorganizowane wg hexagonal architecture: **per connector** (osobny katalog/plik) + **per data type**.

## Spis treści

1. [Quick reference](#1-quick-reference)
2. [CEX WebSocket (PRIMARY)](#2-cex-websocket-primary)
3. [CEX REST (backfill + sanity)](#3-cex-rest-backfill--sanity)
4. [Universe (CoinGecko + CMC)](#4-universe)
5. [Announcements (Module 3)](#5-announcements-module-3)
6. [Social (Module 1 opt)](#6-social-module-1-opt)
7. [Parent recorder reuse](#7-parent-recorder-reuse)
8. [Telegram Bot API](#8-telegram-bot-api)
9. [Connector layout w repo](#9-connector-layout-w-repo)
10. [Fallback strategy](#10-fallback-strategy)
11. [Sekrety](#11-sekrety)
12. [Cost summary](#12-cost-summary)

---

## 1. Quick reference

| # | Źródło | Faza | Connector path | Typ | Auth | Rate limit (free) | Cost |
|---|---|---|---|---|---|---|---|
| 1 | Binance Spot WS | 3a | `connectors/cex/binance/ws_spot.py` | WebSocket | None | Unlimited | $0 |
| 2 | Binance Futures WS | 3a | `connectors/cex/binance/ws_futures.py` | WebSocket | None | Unlimited | $0 |
| 3 | Bybit Spot WS | 3a | `connectors/cex/bybit/ws_spot.py` | WebSocket | None | Unlimited | $0 |
| 4 | Bybit Linear WS | 3a | `connectors/cex/bybit/ws_linear.py` | WebSocket | None | Unlimited | $0 |
| 5 | OKX Public WS | 3a | `connectors/cex/okx/ws_public.py` | WebSocket | None | 200 subs/conn | $0 |
| 6 | Coinbase WS | 3a | `connectors/cex/coinbase/ws_public.py` | WebSocket | None | Unlimited | $0 |
| 7 | Binance Spot REST | 3b | `connectors/cex/binance/rest_spot.py` | REST | None | 6000 weight/min | $0 |
| 8 | Binance Futures REST | 3b | `connectors/cex/binance/rest_futures.py` | REST | None | 2400 weight/min | $0 |
| 9 | Bybit REST | 3b | `connectors/cex/bybit/rest_*.py` | REST | None | 50 req/sec | $0 |
| 10 | OKX REST | 3b | `connectors/cex/okx/rest_public.py` | REST | None | 20 req/2s | $0 |
| 11 | Coinbase REST | 3b | `connectors/cex/coinbase/rest_public.py` | REST | None | 10 req/sec | $0 |
| 12 | CoinGecko `/markets` | 2 | `connectors/universe/coingecko.py` | REST | key opt | 30/min free / $129 Pro | $0 free |
| 13 | CoinMarketCap | 2 opt | `connectors/universe/coinmarketcap.py` | REST | API key | 333/d free / $79 mo | $0 free |
| 14 | Binance Announcements RSS | 5 | `connectors/announcements/binance_rss.py` | RSS | None | n/a | $0 |
| 15 | Bybit Announcements | 5 | `connectors/announcements/bybit_scrape.py` | Scrape | None | n/a | $0 |
| 16 | OKX Announcements | 5 | `connectors/announcements/okx_scrape.py` | Scrape | None | n/a | $0 |
| 17 | Coinbase Announcements | 5 | `connectors/announcements/coinbase_scrape.py` | Scrape | None | n/a | $0 |
| 18 | Parent recorder | 3 opt | `connectors/parent/recorder_reader.py` | filesystem | — | BTC/ETH/HYPE | $0 |
| 19 | Telegram Bot API | 6 | `output/telegram_bot.py` | REST | Bot token | 30 msg/s | $0 |
| 20 | Social_media_scanner | 5 opt | `connectors/social/parent_scanner_reader.py` | parent venv | — | Skip if down | $0 |

**~20 odrębnych connectorów = każdy w osobnym pliku** (per FILE_HYGIENE rules).

---

## 2. CEX WebSocket (PRIMARY)

WebSocket = **primary live data source.** REST = backfill + sanity only.

### 2.1 Binance Spot WS

**Connector path:** `src/deep_owl/connectors/cex/binance/ws_spot.py`
**Parser path:** `src/deep_owl/connectors/cex/binance/parsers.py`

**Endpoint:** `wss://stream.binance.com:9443/stream?streams=<s1>/<s2>/...`

**Streams subskrybowane:**
- `<symbol>@kline_5m` — klines 5m, push przy każdym update + close
- `<symbol>@kline_15m` — klines 15m
- `<symbol>@miniTicker` — 24h rolling stats (opcjonalne — używamy do tier rebuild check)

**Multiplex:** 1024 streams/connection. ~2000 spot symboli × 2 klines = 4000 streams → **4 connections**.

**Heartbeat:** Server ping co 3 min. Client pong w 10 min lub disconnect.

**Output models:** `Kline` (z `data_models/normalized.py`).

### 2.2 Binance Futures WS

**Connector path:** `src/deep_owl/connectors/cex/binance/ws_futures.py`

**Endpoint:** `wss://fstream.binance.com/stream`

**Streams:**
- `<symbol>@kline_5m`, `<symbol>@kline_15m` — futures klines
- `!markPrice@arr@1s` — **all symbols** mark price + funding rate co 1s (jeden stream = wszystkie ~500 perpetuals)
- `<symbol>@openInterest` — OI updates
- `!forceOrder@arr` — **all liquidations** (jeden stream)

**Multiplex:** 200 streams/connection. ~500 perpetual × klines = 1000 streams + 2 broadcast = **2 connections futures**.

**Output models:** `Kline`, `FundingRate`, `OpenInterest`, `Liquidation`.

### 2.3 Bybit Spot WS

**Connector path:** `src/deep_owl/connectors/cex/bybit/ws_spot.py`

**Endpoint:** `wss://stream.bybit.com/v5/public/spot`

**Subskrypcje (JSON message po connect):**
```json
{"op": "subscribe", "args": ["kline.5.BTCUSDT", "kline.15.BTCUSDT", "tickers.BTCUSDT"]}
```

**Streams:**
- `kline.{5|15}.{symbol}` — klines
- `tickers.{symbol}` — z lastPrice, volume24h

**Multiplex:** Unlimited subs/connection. **1 connection** wystarczy dla wszystkich spot.

**Heartbeat:** Client `{"op": "ping"}` co 20s (Bybit wymaga, inaczej disconnect).

### 2.4 Bybit Linear WS

**Connector path:** `src/deep_owl/connectors/cex/bybit/ws_linear.py`

**Endpoint:** `wss://stream.bybit.com/v5/public/linear`

**Streams:**
- `kline.{5|15}.{symbol}`
- `tickers.{symbol}` — z fundingRate, openInterest, lastPrice (perpetual)
- `liquidation.{symbol}` — liquidations per symbol

**Multiplex:** Unlimited. **1 connection** dla wszystkich linear perpetuals.

### 2.5 OKX Public WS

**Connector path:** `src/deep_owl/connectors/cex/okx/ws_public.py`

**Endpoint:** `wss://ws.okx.com:8443/ws/v5/public`

**Subskrypcje:**
```json
{
  "op": "subscribe",
  "args": [
    {"channel": "candle5m", "instId": "BTC-USDT"},
    {"channel": "candle15m", "instId": "BTC-USDT"},
    {"channel": "tickers", "instId": "BTC-USDT"},
    {"channel": "funding-rate", "instId": "BTC-USDT-SWAP"},
    {"channel": "open-interest", "instId": "BTC-USDT-SWAP"}
  ]
}
```

**Multiplex:** 200 subs/connection. ~800 instruments × ~3 channels = potrzeba **4-8 connections**.

**Heartbeat:** Client ping co 25s (jeśli no data flow).

### 2.6 Coinbase WS

**Connector path:** `src/deep_owl/connectors/cex/coinbase/ws_public.py`

**Endpoint:** `wss://ws-feed.exchange.coinbase.com`

**Subskrypcje:**
```json
{
  "type": "subscribe",
  "product_ids": ["BTC-USD", "ETH-USD", ...],
  "channels": ["ticker_batch", "matches"]
}
```

**Streams:**
- `ticker_batch` — batched tickers, push co ~1s
- `matches` — every trade (do agregacji do klines client-side, bo Coinbase nie pushuje natywnie klines stream)

**Custom kline aggregation:** parser w `parsers.py` agreguje `matches` → `Kline` per 5m/15m okno.

**Multiplex:** Unlimited. **1 connection** wystarczy.

**Coinbase NIE ma public futures API** — tylko spot.

### 2.7 Suma WS connections

| CEX | Connections |
|---|---|
| Binance Spot | 4 (multiplex 1024 streams each) |
| Binance Futures | 2 |
| Bybit Spot | 1 |
| Bybit Linear | 1 |
| OKX | 4-8 |
| Coinbase | 1 |
| **TOTAL** | **~13-17 trwałych connections** |

Wszystko za **$0**, bez rate limit po stronie outgoing. Memory ~50MB per connection × 17 = ~850MB.

---

## 3. CEX REST (backfill + sanity)

REST używamy TYLKO dla:
- **Backfill historyczny** (one-time przy starcie + nowe tokeny mid-day)
- **Sanity reconcile** (co 30 min losowa próbka 50 tokenów × 4 CEX, cross-validate vs WS)

### 3.1 Binance Spot REST

**Connector path:** `src/deep_owl/connectors/cex/binance/rest_spot.py`

**Endpointy:**
- `GET /api/v3/klines` — Klines 5m/15m/1h (max 1500 bars/call), weight 1
- `GET /api/v3/exchangeInfo` — All symbols metadata, weight 10

**Rate limit:** 6000 weight/min global (IP-based, no auth).

### 3.2 Binance Futures REST

**Connector path:** `src/deep_owl/connectors/cex/binance/rest_futures.py`

**Endpointy:**
- `GET /fapi/v1/klines` — Futures klines, weight 1
- `GET /fapi/v1/fundingRate` — Funding history, weight 1
- `GET /fapi/v1/openInterest` — Current OI, weight 1
- `GET /futures/data/openInterestHist` — OI history, weight 1

**Rate limit:** 2400 weight/min (separate od spot).

### 3.3 Bybit REST

**Connector paths:**
- `src/deep_owl/connectors/cex/bybit/rest_spot.py`
- `src/deep_owl/connectors/cex/bybit/rest_linear.py`

**Endpointy:**
- `GET /v5/market/kline` — Klines (`category` parameter: spot/linear/inverse)
- `GET /v5/market/funding/history` — Funding history
- `GET /v5/market/open-interest` — OI history
- `GET /v5/market/instruments-info` — Symbols metadata

**Rate limit:** 50 req/sec ≈ 3000/min.

### 3.4 OKX REST

**Connector path:** `src/deep_owl/connectors/cex/okx/rest_public.py`

**Endpointy:**
- `GET /api/v5/market/candles` — Candlesticks
- `GET /api/v5/public/funding-rate-history` — Funding
- `GET /api/v5/public/open-interest` — OI

**Rate limit:** 20 req/2s ≈ 600/min.

### 3.5 Coinbase REST

**Connector path:** `src/deep_owl/connectors/cex/coinbase/rest_public.py`

**Endpointy:**
- `GET /products/{product_id}/candles` — Historic rates (granularity: 60/300/900/3600/21600/86400)
- `GET /products` — All products

**Rate limit:** 10 req/sec public. **Spot only — brak public futures API.**

---

## 4. Universe

### 4.1 CoinGecko (primary tier rankings)

**Connector path:** `src/deep_owl/connectors/universe/coingecko.py`

**Docs:** https://docs.coingecko.com/v3.0.1/reference/introduction

**Endpoint:** `GET /coins/markets?vs_currency=usd&per_page=250&page=N`

**Rate limit:**
- Free: 30 req/min — daily rebuild (~50 stron × 250 tokens = 12,500 tokens) w 1-2 min
- Pro $129/mo: 500 req/min (Faza 2 evaluation czy potrzebne)

**Response (relevant):**
```json
[{
  "id": "bitcoin",
  "symbol": "btc",
  "name": "Bitcoin",
  "current_price": 98432.10,
  "market_cap": 1950000000000,
  "market_cap_rank": 1,
  "total_volume": 28500000000,
  "ath_date": "2021-11-10T14:24:11.849Z"
}]
```

**Mapping do `Token` model:** `market_cap_rank` → tier (1-100=T1, 101-500=T2, 501-2000=T3, >2000=T4).

### 4.2 CoinMarketCap (cross-check + fallback)

**Connector path:** `src/deep_owl/connectors/universe/coinmarketcap.py`

**Docs:** https://coinmarketcap.com/api/documentation/v1/

**Endpoint:** `GET /v1/cryptocurrency/listings/latest?start=1&limit=5000`

**Rate limit:** 333 req/d (free Basic). 1 call zwraca top 5000 — wystarczy na daily cross-check.

**Auth:** Header `X-CMC_PRO_API_KEY`.

---

## 5. Announcements (Module 3)

### 5.1 Binance Announcements RSS

**Connector path:** `src/deep_owl/connectors/announcements/binance_rss.py`
**Processor:** `src/deep_owl/processors/text/rss_parser.py` + `announcement_classifier.py`

**URL:** `https://www.binance.com/en/support/announcement/c-48.xml`

**Format:** RSS feed XML — parsujemy via `feedparser`.

**Use:** Detection upcoming listings 24-48h przed listingiem (Binance ogłasza wcześniej). Daje forward-notice advantage.

**Cadence:** check co 1h.

### 5.2 Bybit Announcements

**Connector path:** `src/deep_owl/connectors/announcements/bybit_scrape.py`

**URL:** `https://announcements.bybit.com/en-US/?category=new_crypto&page=1`

**Format:** Web scrape (RSS niedostępny w stable form).

**Cadence:** check co 1h.

### 5.3 OKX Announcements

**Connector path:** `src/deep_owl/connectors/announcements/okx_scrape.py`

**URL:** `https://www.okx.com/help/section/announcements-new-listings`

**Format:** Web scrape.

### 5.4 Coinbase Announcements

**Connector path:** `src/deep_owl/connectors/announcements/coinbase_scrape.py`

**URL:** `https://blog.coinbase.com/` (filtered by tag "asset listing")

**Format:** Web scrape.

### 5.5 Fallback: CEX symbols diff

Jeśli wszystkie scrapes fail → opieramy się TYLKO na **CEX symbols snapshot diff** (compare today vs yesterday). To zawsze działa bo używamy CEX REST `/exchangeInfo` który MUSI działać żeby giełda funkcjonowała.

Trade-off: ~1 dzień delay vs RSS forward-notice. Ale niezawodne baseline.

---

## 6. Social (Module 1 opt)

### 6.1 Parent Social_media_scanner reader

**Connector path:** `src/deep_owl/connectors/social/parent_scanner_reader.py`

**Source:** parent `D:/Crypto/Claude/Social_media_scanner/`

**Read-only:** parent DuckDB lub JSON output, mapping symbol → mention count + sentiment.

**Watchpoints:**
- Parent ma OSOBNY venv — uruchamiamy independently, czytamy persisted output
- Jeśli parent down → connector zwraca empty, Module 1 fallback (waga social = 0, redystrybucja)

**Cadence:** poll co 5 min (sync z Module 1 scoring).

---

## 7. Parent recorder reuse

### 7.1 Tick precision dla BTC/ETH/HYPE

**Connector path:** `src/deep_owl/connectors/parent/recorder_reader.py`

**Path:** `D:/Crypto/Claude/data/{exchange}/{date}/{symbol}_{update_type}_{hour}.bin.zst`

**Format:** Binary zstandard-compressed records.

**Use case:** **TYLKO dla 3 tokenów** (BTC, ETH, HYPE):
- Sygnał #7 (orderbook L5 imbalance) wymaga tick-level orderbook — parent recorder ma to dla BTC/ETH/HYPE
- Cross-validation Module 1 sygnałów na tick precision dla majors

**Watchpoints:**
- TYLKO read access (parent recorder ma exclusive write)
- Data od 2026-04-08
- NIE używamy dla pozostałych ~4000 tokenów (CEX REST/WS wystarczy)

---

## 8. Telegram Bot API

### 8.1 Output (NIE connector — w `output/`)

**Path:** `src/deep_owl/output/telegram_bot.py`

**Docs:** https://core.telegram.org/bots/api

**Setup:**
1. Telegram → `@BotFather` → `/newbot`
2. Skopiuj bot token → `.env` jako `TELEGRAM_BOT_TOKEN`
3. Send msg do bota → fetch chat_id → `.env`

**Library:** `python-telegram-bot >= 20.7`

**Rate limits:** 30 msg/s globalny, 1 msg/s per chat.

**Komendy bot supports:**
- `/start`, `/help`
- `/signals [N]` — Module 1 alerts
- `/top` — top movers
- `/paper` — paper trading PnL
- `/backtest <strategy>`
- `/listings [filter_set]` — Module 3
- `/mute <token>`
- `/tier <1-4>` — change min alert tier

---

## 9. Connector layout w repo

Pełna struktura `src/deep_owl/connectors/`:

```
src/deep_owl/connectors/
├── __init__.py
├── base.py                        # Connector Protocols (WS, REST)
│
├── cex/
│   ├── __init__.py
│   ├── binance/
│   │   ├── __init__.py
│   │   ├── ws_spot.py             # 1.
│   │   ├── ws_futures.py          # 2.
│   │   ├── rest_spot.py           # 7.
│   │   ├── rest_futures.py        # 8.
│   │   ├── exchange_info.py       # /exchangeInfo per market
│   │   └── parsers.py             # Frame → normalized models (TYLKO parsing)
│   ├── bybit/
│   │   ├── ws_spot.py             # 3.
│   │   ├── ws_linear.py           # 4.
│   │   ├── rest_spot.py           # 9a.
│   │   ├── rest_linear.py         # 9b.
│   │   ├── exchange_info.py
│   │   └── parsers.py
│   ├── okx/
│   │   ├── ws_public.py           # 5.
│   │   ├── rest_public.py         # 10.
│   │   ├── exchange_info.py
│   │   └── parsers.py
│   └── coinbase/
│       ├── ws_public.py           # 6.
│       ├── rest_public.py         # 11.
│       ├── exchange_info.py
│       └── parsers.py
│
├── universe/
│   ├── __init__.py
│   ├── coingecko.py               # 12.
│   └── coinmarketcap.py           # 13.
│
├── announcements/
│   ├── __init__.py
│   ├── binance_rss.py             # 14.
│   ├── bybit_scrape.py            # 15.
│   ├── okx_scrape.py              # 16.
│   └── coinbase_scrape.py         # 17.
│
├── parent/
│   ├── __init__.py
│   └── recorder_reader.py         # 18.
│
└── social/
    ├── __init__.py
    └── parent_scanner_reader.py   # 20.
```

**~25 odrębnych plików connectorów + parsers** (per CEX). Każdy max 200 linii (FILE_HYGIENE rule).

---

## 10. Fallback strategy

Per-source fallback w `src/deep_owl/connectors/registry.py`:

```python
DATA_SOURCE_PRIORITY = {
    "live_klines": ["websocket", "rest_polling_fallback"],
    "universe_markets": ["coingecko", "coinmarketcap"],
    "klines_historical": ["binance_rest", "bybit_rest", "okx_rest", "coinbase_rest"],
    "funding": ["binance_ws", "bybit_ws", "okx_ws"],  # Coinbase brak
    "open_interest": ["binance_ws", "bybit_ws", "okx_ws"],
    "liquidations": ["binance_ws", "bybit_ws"],  # OKX/Coinbase ograniczone
    "new_listing_announcements": [
        "binance_rss",                  # primary — forward notice
        "bybit_scrape",
        "okx_scrape",
        "coinbase_scrape",
        "cex_diff_snapshot",            # fallback baseline
    ],
    "tick_precision_orderbook": ["parent_recorder", "skip"],  # tylko BTC/ETH/HYPE
    "social": ["parent_scanner", "skip"],
}
```

Pierwszy sukces wygrywa. Skip = sygnał liczony jako 0, redystrybucja wagi do innych engines.

---

## 11. Sekrety

| Sekret | Storage | Wymagany w fazie | Connector używający |
|---|---|---|---|
| `COINMARKETCAP_API_KEY` | `.env` (gitignored) | 2 opt (cross-check) | `connectors/universe/coinmarketcap.py` |
| `COINGECKO_API_KEY` | `.env` (gitignored, opt) | 2 opt (Pro tier) | `connectors/universe/coingecko.py` |
| `TELEGRAM_BOT_TOKEN` | `.env` (gitignored) | 6 | `output/telegram_bot.py` |
| `TELEGRAM_CHAT_ID` | `.env` (gitignored) | 6 | `output/telegram_bot.py` |

**CEX WS i REST = brak auth wymagane** dla publicznych endpointów.

**NIE commitować `.env`.** `.env.example` committed z pustymi values.

---

## 12. Cost summary

| Resource | Free tier coverage | Paid tier (jeśli) |
|---|---|---|
| CEX WebSocket × 4 (Binance/Bybit/OKX/Coinbase) | UNLIMITED | — |
| CEX REST (backfill + sanity) | Wystarczy free | — |
| CoinGecko API | 30 req/min wystarczy | $129/mo Pro jeśli skala wymusi |
| CoinMarketCap | 333/d wystarczy | $79/mo Hobbyist |
| RSS feeds (Binance Announcements) | Free | — |
| Telegram Bot API | Free | — |
| Parent recorder access | Free (lokalny filesystem) | — |
| Parent Social_media_scanner | Free (lokalny) | — |
| Server | Local dev | $20-50/mo VPS (Faza 7+) |

**Faza 0-6 = $0.** WebSocket + free REST + free APIs starczają na pełne pokrycie ~3-4k tokenów + new listings + sentiment.

W Faza 7+ (production deploy):
- VPS koszt $20-50/mo
- Optionally CoinGecko Pro $129/mo (jeśli daily rebuild trwa >5min)
- Optionally CMC Hobbyist $79/mo (jeśli więcej cross-check)

---

## Out of scope (NIE używamy)

- ❌ Dexscreener API
- ❌ Birdeye API
- ❌ RugCheck.xyz
- ❌ GoPlus Security
- ❌ Pumpfun, Raydium, Jupiter (DEX endpoints)
- ❌ Etherscan, Solscan (block explorers)
- ❌ Glassnode, Dune, Nansen (on-chain analytics — może w v2)
- ❌ News APIs (CryptoPanic, Decrypt — może w v2)
- ❌ Twitter API direct (parent scanner agreguje)
