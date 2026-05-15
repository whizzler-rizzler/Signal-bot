# Data Sources — Deep Owl

> Wszystkie źródła danych z których czerpiemy. Update przy każdym nowym adapterze.

## Quick reference table

| # | Źródło | Faza | Auth | Rate limit (free) | Koszt | Fallback |
|---|---|---|---|---|---|---|
| 1 | Dexscreener | 2 | None | 60 req/min | $0 | Birdeye |
| 2 | Birdeye | 2 | API key | 30 req/min (free) | $0 free / $99 mo growth | Dexscreener |
| 3 | Parent CEX recorder | 3 | filesystem read | — | $0 (already collected) | — |
| 4 | RugCheck.xyz | 5 | None | ~30 req/min | $0 | Manual review |
| 5 | GoPlus Security | 5 | None | 30 req/min | $0 | Manual review |
| 6 | Telegram Bot API | 6 | Bot token | 30 msg/s per bot | $0 | — |
| 7 | Social_media_scanner (parent) | 4+ (opt) | parent venv | — | $0 | Skip social signal |

---

## 1. Dexscreener API

**Docs:** https://docs.dexscreener.com/api/reference

**Used in:** Faza 2 (DEX adapter), Faza 5 (new pairs feed)

**Endpoints:**

| Endpoint | Purpose | Rate weight |
|---|---|---|
| `GET /latest/dex/tokens/{tokenAddress}` | Token overview (paris, liquidity, vol) | 1 |
| `GET /latest/dex/pairs/{chainId}/{pairAddress}` | Pair detail | 1 |
| `GET /latest/dex/search?q=...` | Search | 1 |
| `GET /token-profiles/latest/v1` | Trending profiles (universe seed) | 1 |
| `GET /token-boosts/latest/v1` | Boosted tokens | 1 |

**Rate limit:** 60 req/min global (no auth). Burst OK, ale 429 retry-after.

**Response shape (token endpoint):**
```json
{
  "schemaVersion": "1.0.0",
  "pairs": [{
    "chainId": "solana",
    "dexId": "raydium",
    "pairAddress": "...",
    "baseToken": { "address": "...", "name": "...", "symbol": "BONK" },
    "quoteToken": { "symbol": "SOL" },
    "priceUsd": "0.0000234",
    "txns": { "m5": {"buys": 12, "sells": 8}, "h1": {...}, "h6": {...}, "h24": {...} },
    "volume": { "h24": 1234567, "h6": ..., "h1": ..., "m5": ... },
    "priceChange": { "h24": 5.2, ... },
    "liquidity": { "usd": 2100000, "base": ..., "quote": ... },
    "fdv": ...,
    "marketCap": ...,
    "pairCreatedAt": 1716000000000
  }]
}
```

**Mapowanie do `TokenSnapshot`:** patrz `src/deep_owl/data/dexscreener.py`.

**Watchpoints:**
- API może zwrócić `pairs: []` dla świeżego tokena (cache jeszcze nie zbudowany) — retry po 30s
- `volume.h24` w USD, nie w base token
- `txns` daje tylko count, nie volume per tx
- Chain ids: `solana`, `ethereum`, `bsc`, `arbitrum`, `base`, `polygon`, etc.

---

## 2. Birdeye API

**Docs:** https://docs.birdeye.so/

**Used in:** Faza 2 (Solana priority), Faza 4 (holder data dla Module 1)

**Tiers:**
- **Free:** 30 req/min, basic endpoints
- **Growth ($99/mo):** 300 req/min, advanced (historical, holder graph, OHLCV)
- **Business+:** dla scale

**Endpoints (free tier):**

| Endpoint | Purpose |
|---|---|
| `GET /defi/token_overview?address=X` | Token info |
| `GET /defi/price?address=X` | Real-time price |
| `GET /defi/v3/token/holder?address=X&offset=0&limit=10` | Top holders (krytyczne dla top10_drop signal) |
| `GET /defi/v3/token/list?sort_by=v24hUSD&limit=100` | Top tokens (universe seed) |

**Auth:** Header `X-API-KEY: <key>`. Key z .env.

**Watchpoints:**
- Birdeye PRIMARY dla Solana, secondary dla EVM (Dexscreener lepszy multi-chain)
- Holder endpoint wymaga growth tier dla pełnej listy — free tier max top 10
- Rate limit reset co 60s, hard cap (not burst-friendly)

---

## 3. Parent CEX recorder (read-only reuse)

**Path:** `D:/Crypto/Claude/data/{exchange}/{date}/{symbol}_{update_type}_{hour}.bin.zst`

**Used in:** Faza 3 (backtest candle aggregation), Faza 4 (CEX bid imbalance signal)

**Format:** Binary zstandard-compressed records, hourly rotation, per exchange/symbol/update_type.

**Update types:**
- `orderbook` — full L2 snapshot + updates
- `trades` — taker fills
- `funding` — funding rate (perpetuals)
- `markprice` — mark price (perpetuals)
- `liquidations` — liquidation events

**Exchanges available (14):** Binance, Bybit, OKX, Bitget, Coinbase, GRVT, HotStuff, Extended, Lighter, Pacifica, ZO_Exchange, StandX, Decibel, Nado.

**Reader:** check parent `D:/Crypto/Claude/analyzer/data/reader.py` (lub `D:/Crypto/Claude/reader.py`) — streaming reader. Reuse pattern.

**Watchpoints:**
- TYLKO read access (parent recorder ma exclusive write)
- Data od 2026-04-08 (4+ tygodni przy Fazie 3 start)
- Pair coverage: BTC, ETH, HYPE w USDT/USDC variants per exchange

---

## 4. RugCheck.xyz

**Docs:** https://api.rugcheck.xyz/swagger/index.html

**Used in:** Faza 5 (rugpull filter dla Solana SPL tokens)

**Endpoints:**

| Endpoint | Purpose |
|---|---|
| `GET /v1/tokens/{mint}/report` | Full security report (risk score, holder analysis, LP status) |
| `GET /v1/tokens/{mint}/report/summary` | Skrócona wersja (tańsza) |

**Response (relevant fields):**
```json
{
  "mint": "...",
  "tokenMeta": { "name": "...", "symbol": "..." },
  "totalLPProviders": 12,
  "totalMarketLiquidity": 234567.89,
  "risks": [
    { "name": "Single holder ownership", "level": "danger", "score": -100 }
  ],
  "score": 234,           // <500 = HIGH risk
  "score_normalised": 23, // 0-100 (higher = safer)
  "rugged": false
}
```

**Decision logic dla rugpull filter:**
- `score_normalised < 30` → EXCLUDE
- `rugged == true` → EXCLUDE
- Any risk z `level == "danger"` → EXCLUDE

**Watchpoints:**
- Solana only — dla EVM użyj GoPlus
- Rate limit nieformalny, ~30/min wystarczy
- Score może się zmieniać w czasie (re-check dla Stage 2+)

---

## 5. GoPlus Security

**Docs:** https://docs.gopluslabs.io/reference/

**Used in:** Faza 5 (rugpull filter dla EVM tokens)

**Endpoint:**
- `GET /api/v1/token_security/{chain_id}?contract_addresses=X` — multi-chain (1=ETH, 56=BSC, 137=Polygon, 8453=Base, 42161=Arbitrum)

**Response (relevant fields):**
```json
{
  "result": {
    "0x...": {
      "is_honeypot": "0",
      "is_open_source": "1",
      "is_proxy": "0",
      "is_mintable": "0",
      "owner_address": "0x000...",  // dead address = renounced
      "owner_balance": "0",
      "creator_address": "0x...",
      "creator_balance": "...",
      "lp_holders": [...],
      "lp_total_supply": "...",
      "buy_tax": "0.01",
      "sell_tax": "0.01",
      "hidden_owner": "0",
      "can_take_back_ownership": "0"
    }
  }
}
```

**Decision logic:**
- `is_honeypot == "1"` → EXCLUDE
- `buy_tax > 0.10` OR `sell_tax > 0.10` → EXCLUDE (10%+ tax = rug)
- `hidden_owner == "1"` OR `can_take_back_ownership == "1"` → EXCLUDE
- Top LP holder NOT burn address (0x000...dead / 0x...000) AND NOT locker contract → EXCLUDE (LP not locked)

**Watchpoints:**
- API zwraca STRING "0"/"1" not boolean — uwaga przy parsowaniu
- Chain ID musi być dokładny (1, 56, 137, ...)

---

## 6. Telegram Bot API

**Docs:** https://core.telegram.org/bots/api

**Used in:** Faza 6 (alerts + interactive bot)

**Setup:**
1. Otwórz Telegram, znajdź `@BotFather`
2. `/newbot` → nazwa + username
3. Skopiuj token → `.env` jako `TELEGRAM_BOT_TOKEN`
4. Wyślij wiadomość do bota → uruchom `python -c "from telegram import Bot; ..."` żeby zdobyć `chat_id` → `.env`

**Library:** `python-telegram-bot >= 20.7` (async-native)

**Rate limits:**
- 30 messages/sec per bot total
- 1 message/sec per chat
- 20 messages/min per group

**Komendy do zaimplementowania (Faza 6):**
- `/start`, `/help`, `/signals`, `/fresh`, `/paper`, `/backtest <strategy>`, `/mute <token>`, `/unmute <token>`

**Watchpoints:**
- Bot token = secret, NEVER commit
- Test message format z preview w grupie testowej zanim go-live
- Cooldown per token (6h default) wymusza dedup signal storm

---

## 7. Social_media_scanner (parent reuse — opcjonalnie)

**Path:** `D:/Crypto/Claude/Social_media_scanner/`

**Used in:** Faza 4 (social signal w Module 1 scoring), opcjonalne

**Co oferuje:**
- Twitter scanner + sentiment classifier
- TruthSocial scanner
- Pipeline w `Social_media_scanner/src/scanner/pipeline/sentiment.py`

**Integration plan:**
- Read-only access do parent DuckDB / output JSON
- Mapping: token symbol → mention count + sentiment score
- Rolling 1h vs 24h_avg → velocity feature

**Watchpoints:**
- Parent ma OSOBNY venv — uruchamiamy ją niezależnie, czytamy tylko persisted output
- Jeśli scanner nie działa → Module 1 fallback (waga social = 0, redistribute do innych signals)

---

## Fallback strategy

Per-source fallback w `src/deep_owl/data/registry.py`:

```python
DATA_SOURCE_PRIORITY = {
    "token_overview": ["dexscreener", "birdeye"],
    "holders": ["birdeye_growth", "manual"],  # free tier ma tylko top 10
    "rugpull_solana": ["rugcheck", "manual"],
    "rugpull_evm": ["goplus", "manual"],
    "social": ["parent_scanner", "skip"],
}
```

Pierwszy sukces wygrywa. Skip = sygnał liczony jako 0, redistribute waga do innych w scoring.

---

## Sekrety — gdzie trzymać

| Sekret | Storage | Faza wymagana |
|---|---|---|
| `BIRDEYE_API_KEY` | `.env` (gitignored) | 2 (opt), 4 mandatory |
| `TELEGRAM_BOT_TOKEN` | `.env` (gitignored) | 6 |
| `TELEGRAM_CHAT_ID` | `.env` (gitignored) | 6 |

Brak innych sekretów na razie (Dexscreener, RugCheck, GoPlus, parent recorder = no auth).

**NIE commitować `.env`.** `.env.example` jest committed z pustymi values jako template.
