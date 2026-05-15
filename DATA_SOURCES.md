# Data Sources — Deep Owl

> Wszystkie źródła danych z których czerpiemy. **Big caps CEX-first** — DEX/fresh out of scope.

## Quick reference table

| # | Źródło | Faza | Auth | Rate limit (free) | Koszt | Fallback |
|---|---|---|---|---|---|---|
| 1 | CoinGecko API | 2 | API key opcjonalne | 30 req/min | $0 free / $129 mo Pro | CoinMarketCap |
| 2 | CoinMarketCap API | 2 | API key | 333 req/dzień | $0 / $79 mo Hobbyist | CoinGecko |
| 3 | Binance REST | 3 | None (public) | 6000 weight/min | $0 | Bybit/OKX |
| 4 | Bybit REST | 3 | None (public) | 50 req/sec | $0 | Binance/OKX |
| 5 | OKX REST | 3 | None (public) | 20 req/2s | $0 | Binance/Bybit |
| 6 | Coinbase REST (Exchange) | 3 | None (public) | 10 req/sec | $0 | Spot only |
| 7 | Parent recorder (BTC/ETH/HYPE) | 3 opt | filesystem | — | $0 | CEX REST |
| 8 | Telegram Bot API | 6 | Bot token | 30 msg/s per bot | $0 | — |
| 9 | Social_media_scanner (parent) | 5 opt | parent venv | — | $0 | Skip social signal |

---

## 1. CoinGecko API (primary universe source)

**Docs:** https://docs.coingecko.com/v3.0.1/reference/introduction

**Used in:** Faza 2 (universe building, market cap rankings)

**Endpoints:**

| Endpoint | Purpose | Rate weight |
|---|---|---|
| `GET /coins/markets?vs_currency=usd&per_page=250&page=N` | Paginated tokens with market cap, volume, price | 1 |
| `GET /coins/list` | All tokens IDs (~10k+) | 1 |
| `GET /coins/{id}` | Token detail (community, dev metrics) | 1 (rzadko używamy) |

**Rate limit:** 30 req/min (free tier). Pro tier $129/mo = 500/min, lepsze dla full universe rebuild w <5 min.

**Response shape (markets):**
```json
[
  {
    "id": "bitcoin",
    "symbol": "btc",
    "name": "Bitcoin",
    "current_price": 98432.10,
    "market_cap": 1950000000000,
    "market_cap_rank": 1,
    "total_volume": 28500000000,
    "high_24h": 99100,
    "low_24h": 97800,
    "price_change_24h": 234,
    "price_change_percentage_24h": 0.24,
    "circulating_supply": 19800000,
    "total_supply": 21000000,
    "max_supply": 21000000,
    "ath": 109000,
    "atl": 67.81,
    "atl_date": "2013-07-06T00:00:00.000Z"
  }
]
```

**Mapowanie do Token model:** `src/deep_owl/data/coingecko.py`.

**Watchpoints:**
- Free tier 30/min = ~50 stron/min × 250 tokens = 12,500 tokens — wystarczy dla universe (~10k+)
- Pełen universe rebuild zajmuje 1-2 min na free tier
- Daily refresh wystarczy (rynek cap rzadko zmienia się znacząco intraday)

---

## 2. CoinMarketCap API (cross-check + fallback)

**Docs:** https://coinmarketcap.com/api/documentation/v1/

**Used in:** Faza 2 (cross-check uniwersum, fallback gdy CoinGecko down)

**Endpoints:**

| Endpoint | Purpose |
|---|---|
| `GET /v1/cryptocurrency/listings/latest?start=1&limit=5000` | Top 5000 tokens (jeden call!) |
| `GET /v1/cryptocurrency/quotes/latest?id=X` | Quote single token |

**Rate limit:** 333 req/dzień (free Basic tier). Hobbyist $79/mo = 10k req/dzień.

**Auth:** Header `X-CMC_PRO_API_KEY`.

**Watchpoints:**
- 333 calls/dzień bardzo niski — wystarczy na 1 universe rebuild + okazjonalny lookup
- Limit 5000 per call jest dobry — top 5000 w jednym żądaniu
- Wymagana rejestracja (free tier też)

---

## 3-6. CEX REST APIs (Binance / Bybit / OKX / Coinbase)

**Used in:** Faza 3 (klines + funding + open interest)

### 3. Binance REST

**Docs:** https://binance-docs.github.io/apidocs/spot/en/

| Endpoint | Purpose | Weight |
|---|---|---|
| `GET /api/v3/klines` | Spot klines (5m/15m/1h) | 1 per call |
| `GET /api/v3/exchangeInfo` | All symbols metadata | 10 |
| `GET /fapi/v1/klines` | Futures klines | 1 |
| `GET /fapi/v1/fundingRate` | Funding history | 1 |
| `GET /fapi/v1/openInterest` | Current OI | 1 |
| `GET /futures/data/openInterestHist` | OI history | 1 |

**Rate limit:** 6000 weight/min global (IP-based, no auth needed for public). Klines pull 1 weight per call → 6000 calls/min.

**Klines params:** `symbol`, `interval` (1m/3m/5m/15m/30m/1h/4h/1d), `startTime`, `endTime`, `limit` (max 1500).

**Response (klines):**
```json
[
  [
    1729600000000,        // open time (ms)
    "98432.10",           // open
    "98500.00",           // high
    "98300.00",           // low
    "98432.10",           // close
    "12.345",             // volume (BTC)
    1729600299999,        // close time
    "1216000.50",         // quote volume (USD)
    1234,                 // trades count
    "6.123",              // taker buy base
    "603000.25",          // taker buy quote
    "0"                   // ignored
  ]
]
```

**Watchpoints:**
- 1500 bars max per call → dla 5m candles to ~5 dni history per call
- Symbol naming: BTCUSDT (no separator). Spot vs futures różne endpointy.
- Coin-margined futures = osobny endpoint (`/dapi/`)

### 4. Bybit REST

**Docs:** https://bybit-exchange.github.io/docs/v5/intro

| Endpoint | Purpose |
|---|---|
| `GET /v5/market/kline` | Klines (spot/linear/inverse) |
| `GET /v5/market/funding/history` | Funding history |
| `GET /v5/market/open-interest` | OI history |
| `GET /v5/market/instruments-info` | Symbols metadata |

**Rate limit:** 50 req/sec ≈ 3000/min. Public endpoints no auth.

**Klines params:** `category` (spot/linear/inverse), `symbol`, `interval`, `start`, `end`, `limit` (max 1000).

### 5. OKX REST

**Docs:** https://www.okx.com/docs-v5/en/

| Endpoint | Purpose |
|---|---|
| `GET /api/v5/market/candles` | Candlesticks |
| `GET /api/v5/public/funding-rate-history` | Funding history |
| `GET /api/v5/public/open-interest` | OI |

**Rate limit:** 20 req/2s ≈ 600/min. Lower than Binance/Bybit.

**Symbol naming:** BTC-USDT-SWAP (perpetual), BTC-USDT (spot). Different from Binance/Bybit.

### 6. Coinbase Exchange REST

**Docs:** https://docs.cdp.coinbase.com/exchange/reference

| Endpoint | Purpose |
|---|---|
| `GET /products/{product_id}/candles` | Historic rates |
| `GET /products` | All products |

**Rate limit:** 10 req/sec public.

**Watchpoints:**
- **SPOT ONLY** — Coinbase nie ma public futures API (Coinbase Advanced Trade ma Futures ale wymaga auth)
- Dla USA-listed tokens (USDT pairs ograniczone, używa głównie USD/USDC pairs)
- Symbol naming: BTC-USD (myślnik)

---

## 7. Parent CEX recorder (read-only reuse, opcjonalne)

**Path:** `D:/Crypto/Claude/data/{exchange}/{date}/{symbol}_{update_type}_{hour}.bin.zst`

**Used in:** Faza 3+ (BTC/ETH/HYPE tick precision dla cross-validation Module 1 sygnałów; opcjonalne)

**Format:** Binary zstandard-compressed records, hourly rotation, per exchange/symbol/update_type.

**Update types:** orderbook, trades, funding, markprice, liquidations.

**Reader:** parent `D:/Crypto/Claude/analyzer/data/reader.py` — streaming reader.

**Watchpoints:**
- TYLKO read access (parent recorder ma exclusive write)
- Data od 2026-04-08
- Pair coverage: BTC, ETH, HYPE — dla pozostałych ~5000 tokenów używamy CEX REST API
- Tick precision tylko dla cross-validation (czy 5m candle z REST API matches tick aggregate z recordera)

---

## 8. Telegram Bot API

**Docs:** https://core.telegram.org/bots/api

**Used in:** Faza 6 (alerts + interactive bot)

**Setup:**
1. Otwórz Telegram, znajdź `@BotFather`
2. `/newbot` → nazwa + username
3. Skopiuj token → `.env` jako `TELEGRAM_BOT_TOKEN`
4. Wyślij wiadomość do bota → uruchom test żeby zdobyć `chat_id` → `.env`

**Library:** `python-telegram-bot >= 20.7` (async-native).

**Rate limits:**
- 30 messages/sec per bot total
- 1 message/sec per chat

**Komendy (Faza 6):** `/start`, `/help`, `/signals [N]`, `/top`, `/paper`, `/backtest <strategy>`, `/mute <token>`, `/tier <1|2|3>`.

---

## 9. Social_media_scanner (parent reuse — opcjonalnie)

**Path:** `D:/Crypto/Claude/Social_media_scanner/`

**Used in:** Faza 5 (social signal w Module 1, opcjonalne)

**Co oferuje:**
- Twitter scanner + sentiment classifier
- TruthSocial scanner

**Integration plan:**
- Read-only access do parent output (DuckDB lub JSON)
- Mapping: token symbol → mention count + sentiment score
- Rolling 1h vs 24h_avg → velocity feature

**Watchpoints:**
- Parent ma OSOBNY venv — uruchamiamy ją niezależnie, czytamy tylko persisted output
- Jeśli scanner nie działa → Module 1 fallback (waga social = 0, redystrybucja)

---

## Fallback strategy

Per-source fallback w `src/deep_owl/data/registry.py`:

```python
DATA_SOURCE_PRIORITY = {
    "universe_markets": ["coingecko", "coinmarketcap"],     # CG primary, CMC fallback
    "klines": ["binance", "bybit", "okx", "coinbase"],      # per-token: który CEX ma listing
    "funding": ["binance", "bybit", "okx"],                 # Coinbase nie ma public futures API
    "open_interest": ["binance", "bybit", "okx"],
    "tick_precision": ["parent_recorder", "skip"],          # tylko BTC/ETH/HYPE
    "social": ["parent_scanner", "skip"],                   # opcjonalne
}
```

Pierwszy sukces wygrywa. Skip = sygnał liczony jako 0, redistribute waga do innych.

---

## Sekrety — gdzie trzymać

| Sekret | Storage | Faza wymagana |
|---|---|---|
| `COINMARKETCAP_API_KEY` | `.env` (gitignored) | 2 (cross-check + fallback) |
| `COINGECKO_API_KEY` | `.env` (gitignored) | 2 opt (Pro tier dla wyższego rate limit) |
| `TELEGRAM_BOT_TOKEN` | `.env` (gitignored) | 6 |
| `TELEGRAM_CHAT_ID` | `.env` (gitignored) | 6 |

CEX public APIs (Binance, Bybit, OKX, Coinbase) **nie wymagają auth** dla publicznych endpointów (klines, funding, OI).

**NIE commitować `.env`.** `.env.example` jest committed z pustymi values jako template.

---

## Out of scope (NIE używamy w tym projekcie)

- ❌ Dexscreener API
- ❌ Birdeye API
- ❌ RugCheck.xyz
- ❌ GoPlus Security
- ❌ Pumpfun, Raydium, Jupiter (DEX endpoints)
- ❌ Etherscan, Solscan (block explorer)
- ❌ Glassnode, Dune, Nansen (on-chain analytics — może w v2 jako optional)
- ❌ News APIs (CryptoPanic, Decrypt — może w v2)
