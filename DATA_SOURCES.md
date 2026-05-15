# Data Sources — Deep Owl

> Wszystkie źródła danych z których czerpiemy. **Big caps CEX-first** + **WebSocket-first ingestion**.

## Quick reference table

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
| 10 | CoinGecko API | 2 | REST (daily) | key opt | 30 req/min free / $129 Pro |
| 11 | CoinMarketCap | 2 opt | REST | API key | 333/d free / $79 Hobbyist |
| 12 | Binance Announcements RSS | 5 | RSS | None | n/a |
| 13 | Bybit/OKX/Coinbase Announcements | 5 | Web scrape/RSS | None | n/a |
| 14 | Parent CEX recorder | 3 opt | filesystem | — | BTC/ETH/HYPE tick precision |
| 15 | Telegram Bot API | 6 | REST | Bot token | 30 msg/s |
| 16 | Social_media_scanner (parent) | 5 opt | parent venv | — | Skip if down |

---

## 1-5. WebSocket primary (PRIMARY live data)

### 1. Binance Spot WS

**Docs:** https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams

**Endpoint:** `wss://stream.binance.com:9443/stream?streams=<stream1>/<stream2>/...`

**Streams (subskrybujemy):**
- `<symbol>@kline_5m` — klines 5m, push przy każdym update + na close świecy
- `<symbol>@kline_15m` — klines 15m
- `<symbol>@miniTicker` — 24h rolling stats (optional)

**Multiplex limit:** 1024 streams per connection. Dla ~4000 spot symboli × 2 klines = 8000 streams → potrzebujemy 4 connections (każda po 1024+).

**Heartbeat:** Server wysyła ping co 3 min. Client odpowiada pong w 10 min lub disconnect.

### 2. Binance Futures WS

**Docs:** https://binance-docs.github.io/apidocs/futures/en/#websocket-market-streams

**Endpoint:** `wss://fstream.binance.com/stream`

**Streams:**
- `<symbol>@kline_5m` — futures klines 5m
- `!markPrice@arr@1s` — all symbols mark price + funding rate co 1s (jeden stream = wszystkie symbole)
- `<symbol>@openInterest` — OI updates
- `!forceOrder@arr` — all liquidations (jeden stream)

**Multiplex:** 200 streams per connection. ~500 perpetual symbols → 1 connection wystarczy bo używamy `@arr` (broadcast) dla markPrice + liquidations.

### 3. Bybit WS

**Docs:** https://bybit-exchange.github.io/docs/v5/ws/connect

**Endpoints:**
- Spot: `wss://stream.bybit.com/v5/public/spot`
- Linear: `wss://stream.bybit.com/v5/public/linear`

**Subskrypcje (JSON message po connect):**
```json
{"op": "subscribe", "args": ["kline.5.BTCUSDT", "kline.15.BTCUSDT", "tickers.BTCUSDT"]}
```

**Streams:**
- `kline.{interval}.{symbol}` — klines (5, 15 = minutes)
- `tickers.{symbol}` — z fundingRate, openInterest, lastPrice (perpetual = linear)
- `liquidation.{symbol}` — liquidations per symbol (linear)

**Multiplex:** Unlimited subscriptions per connection (Bybit nie ma hard limit). W praktyce 1 connection per market_type (spot, linear).

**Heartbeat:** Send `{"op": "ping"}` co 20s (Bybit wymaga, inaczej disconnect po 5 min).

### 4. OKX WS

**Docs:** https://www.okx.com/docs-v5/en/#overview-websocket-overview

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

**Multiplex:** 200 subscriptions per connection. ~500 spot + ~300 perpetual = ~800 instruments × kilka channels → potrzeba 4-8 connections.

**Heartbeat:** OKX requires client ping every 25s (jeśli no data flow). Server zamyka po 30s inactivity.

### 5. Coinbase WS

**Docs:** https://docs.cdp.coinbase.com/exchange/docs/websocket-overview

**Endpoint:** `wss://ws-feed.exchange.coinbase.com`

**Subskrypcje:**
```json
{
  "type": "subscribe",
  "product_ids": ["BTC-USD", "ETH-USD", "..."],
  "channels": ["ticker_batch", "matches", "level2_batch"]
}
```

**Streams (Coinbase nie ma natywnego "kline" stream):**
- `ticker_batch` — batched tickers, push co ~1s
- `matches` — every trade (do agregacji do klines client-side)
- `level2_batch` — order book (heavy, opcjonalne)

**Custom kline aggregation:** Coinbase nie pushuje klines bezpośrednio — agregujemy z `matches` w-memory.

**Multiplex:** Unlimited per connection. 1 connection wystarczy.

**Heartbeat:** Niewymagane, ale rekomendowane subscribe do `heartbeat` channel dla detection idle disconnect.

---

## 6-9. CEX REST (NIE live — backfill + sanity)

### 6. Binance REST

**Docs:** https://binance-docs.github.io/apidocs/spot/en/

| Endpoint | Purpose | Weight |
|---|---|---|
| `GET /api/v3/klines` | Spot klines 5m/15m/1h (max 1500 bars/call) | 1 |
| `GET /api/v3/exchangeInfo` | All symbols metadata | 10 |
| `GET /fapi/v1/klines` | Futures klines | 1 |
| `GET /fapi/v1/fundingRate` | Funding history | 1 |
| `GET /fapi/v1/openInterest` | Current OI | 1 |
| `GET /futures/data/openInterestHist` | OI history | 1 |

**Rate limit:** 6000 weight/min global (IP-based, no auth). Klines = 1 weight/call → 6000 calls/min.

**Role w Deep Owl:** TYLKO backfill historyczny (one-time) + sanity reconcile co 30 min na losowych próbkach.

### 7. Bybit REST

**Docs:** https://bybit-exchange.github.io/docs/v5/intro

| Endpoint | Purpose |
|---|---|
| `GET /v5/market/kline` | Klines (spot/linear/inverse) |
| `GET /v5/market/funding/history` | Funding history |
| `GET /v5/market/open-interest` | OI history |
| `GET /v5/market/instruments-info` | Symbols metadata |

**Rate limit:** 50 req/sec ≈ 3000/min.

### 8. OKX REST

**Docs:** https://www.okx.com/docs-v5/en/

| Endpoint | Purpose |
|---|---|
| `GET /api/v5/market/candles` | Candlesticks |
| `GET /api/v5/public/funding-rate-history` | Funding history |
| `GET /api/v5/public/open-interest` | OI |

**Rate limit:** 20 req/2s ≈ 600/min.

### 9. Coinbase REST

**Docs:** https://docs.cdp.coinbase.com/exchange/reference

| Endpoint | Purpose |
|---|---|
| `GET /products/{product_id}/candles` | Historic rates |
| `GET /products` | All products |

**Rate limit:** 10 req/sec public. **SPOT ONLY** — brak public futures API.

---

## 10. CoinGecko API (tier rankings)

**Docs:** https://docs.coingecko.com/v3.0.1/reference/introduction

**Used in:** Faza 2 (universe building — TYLKO dla market cap rankings, nie filter cap)

**Endpoint:** `GET /coins/markets?vs_currency=usd&per_page=250&page=N`

**Rate limit:** 30 req/min free → ~50 stron/min × 250 tokens = 12,500 tokens/min. Pełen pull (~10k tokens) w 1-2 min. Daily refresh OK.

**Pro tier $129/mo:** 500 req/min jeśli wymusi (jeszcze niepotrzebny w Fazie 2).

**Response (relevant fields):**
```json
[{
  "id": "bitcoin",
  "symbol": "btc",
  "name": "Bitcoin",
  "current_price": 98432.10,
  "market_cap": 1950000000000,
  "market_cap_rank": 1,
  "total_volume": 28500000000
}]
```

**Mapping:** `market_cap_rank` → tier classification (1-100 = Tier 1, 101-500 = Tier 2, etc.)

---

## 11. CoinMarketCap (cross-check + fallback)

**Used in:** Faza 2 (cross-check rankings, opcjonalne)

**Endpoint:** `GET /v1/cryptocurrency/listings/latest?start=1&limit=5000`

**Rate limit:** 333 req/d (free Basic tier). Jeden call zwraca top 5000 — wystarczy na daily cross-check.

**Auth:** Header `X-CMC_PRO_API_KEY` (free tier też wymaga rejestracji).

---

## 12-13. CEX Announcements (Module 3 New Listings)

**Used in:** Faza 5 (Module 3 — new listings detection)

### 12. Binance Announcements RSS

**URL:** `https://www.binance.com/en/support/announcement/c-48.xml`

**Format:** RSS feed (XML) — parsujemy via `feedparser` Python lib.

**Use:** Detection upcoming listings 24-48h przed listingiem (Binance ogłasza wcześniej). Cross-reference z `cex_diff_snapshot` flow.

### 13. Bybit / OKX / Coinbase Announcements

**Bybit:** Web scrape blog announcements (RSS niedostępny w stable form)
**OKX:** Announcements API niedostępny publicznie — scrape
**Coinbase:** Web scrape `https://blog.coinbase.com/`

**Fallback:** jeśli scrape nie działa, opieramy się TYLKO na CEX diff snapshot (compare today vs yesterday). To wystarczy do detection — może być ~1 dzień delay vs RSS feed (Binance has RSS).

---

## 14. Parent CEX recorder (read-only reuse, opcjonalne)

**Path:** `D:/Crypto/Claude/data/{exchange}/{date}/{symbol}_{update_type}_{hour}.bin.zst`

**Used in:** Faza 3 opt (BTC/ETH/HYPE tick precision dla cross-validation Module 1 sygnałów)

**Watchpoints:**
- TYLKO read access
- Data od 2026-04-08
- Pair coverage: tylko BTC, ETH, HYPE — dla pozostałych ~4000 tokenów używamy CEX REST API klines
- Tick precision tylko dla orderbook L5 sygnału (#7 w Module 1) — sanity check

---

## 15. Telegram Bot API

**Docs:** https://core.telegram.org/bots/api

**Setup:**
1. Telegram → `@BotFather`
2. `/newbot` → nazwa + username
3. Token → `.env` jako `TELEGRAM_BOT_TOKEN`
4. Send msg do bota → fetch chat_id → `.env`

**Library:** `python-telegram-bot >= 20.7`

**Rate limits:** 30 msg/s globalny, 1 msg/s per chat.

**Komendy:** `/start`, `/help`, `/signals [N]`, `/top`, `/paper`, `/backtest <strategy>`, `/listings [filter_set]`, `/mute <token>`, `/tier <1-4>`.

---

## 16. Social_media_scanner (parent reuse — opcjonalne)

**Path:** `D:/Crypto/Claude/Social_media_scanner/`

**Used in:** Faza 5 (Module 1 signal #6, opcjonalne)

**Read-only:** parent DuckDB lub JSON output, mapping symbol → mention count + sentiment.

---

## Fallback strategy

Per-source fallback w `src/deep_owl/data/registry.py`:

```python
DATA_SOURCE_PRIORITY = {
    "live_klines": ["websocket", "rest_polling_fallback"],          # WS primary
    "universe_markets": ["coingecko", "coinmarketcap"],             # CG primary
    "klines_historical": ["binance_rest", "bybit_rest", "okx_rest", "coinbase_rest"],
    "funding": ["binance_rest", "bybit_rest", "okx_rest"],          # Coinbase brak
    "open_interest": ["binance_rest", "bybit_rest", "okx_rest"],
    "new_listing_announcements": ["binance_rss", "cex_diff_snapshot"],
    "tick_precision": ["parent_recorder", "skip"],                  # tylko BTC/ETH/HYPE
    "social": ["parent_scanner", "skip"],                           # opcjonalne
}
```

Pierwszy sukces wygrywa. Skip = sygnał liczony jako 0, redistribute waga.

---

## Sekrety — gdzie trzymać

| Sekret | Storage | Wymagany w fazie |
|---|---|---|
| `COINMARKETCAP_API_KEY` | `.env` (gitignored) | 2 opt (cross-check) |
| `COINGECKO_API_KEY` | `.env` (gitignored, opt) | 2 opt (Pro tier rate limit) |
| `TELEGRAM_BOT_TOKEN` | `.env` (gitignored) | 6 |
| `TELEGRAM_CHAT_ID` | `.env` (gitignored) | 6 |

**CEX WS i REST = brak auth wymagane dla publicznych endpointów.**

**NIE commitować `.env`.** `.env.example` committed z pustymi values.

---

## Out of scope (NIE używamy w tym projekcie)

- ❌ Dexscreener API
- ❌ Birdeye API
- ❌ RugCheck.xyz
- ❌ GoPlus Security
- ❌ Pumpfun, Raydium, Jupiter (DEX endpoints)
- ❌ Etherscan, Solscan (block explorer)
- ❌ Glassnode, Dune, Nansen (on-chain analytics — może w v2)
- ❌ News APIs (CryptoPanic, Decrypt — może w v2)

---

## Cost summary (Faza 0-6)

| Resource | Free | Paid |
|---|---|---|
| CEX WebSocket (Binance/Bybit/OKX/Coinbase) | UNLIMITED | — |
| CEX REST (backfill + sanity) | Free | — |
| CoinGecko API | 30 req/min wystarczy | $129/mo Pro jeśli wymusi |
| CoinMarketCap | 333/d wystarczy | $79/mo Hobbyist |
| Telegram Bot API | Free | — |
| Storage local | Lokalny dysk | — |
| Server | Local dev | $20-50/mo VPS (Faza 7+) |

**Faza 0-6: 100% darmowe.** Pełne pokrycie ~4000 tokenów × live klines/funding/OI za $0.
