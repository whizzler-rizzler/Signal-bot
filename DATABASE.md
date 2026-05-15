# DATABASE — Deep Owl

> Deep dive na DuckDB schema, partitioning, query patterns, migrations, performance.

## Spis treści

1. [Overview](#1-overview)
2. [Schema — wszystkie tabele](#2-schema)
3. [Partitioning strategy](#3-partitioning)
4. [Indexes](#4-indexes)
5. [Common query patterns](#5-common-queries)
6. [Migrations](#6-migrations)
7. [Backup & recovery](#7-backup--recovery)
8. [Performance tuning](#8-performance)
9. [Skala estimates](#9-skala)

---

## 1. Overview

**Engine:** DuckDB (embedded, columnar, multi-threaded query execution).

**File:** `data/deep_owl.duckdb` (gitignored, single file backup).

**Schema location:** [`src/deep_owl/db/schema.sql`](src/deep_owl/db/schema.sql) — single source of truth.

**Migration model:** version-tracked w `_meta` table, idempotent CREATE TABLE IF NOT EXISTS pattern.

### Architektura

```
┌─────────────────────────────────────────────────────────┐
│                     APPLICATION                          │
│  WS Ingester  │  Orchestrator  │  Dashboard  │  CLI    │
└───────┬───────┴────────┬───────┴──────┬──────┴────┬─────┘
        │                │              │           │
        │ bulk INSERT    │ SELECT       │ SELECT    │ ad-hoc
        ▼                ▼              ▼           ▼
┌─────────────────────────────────────────────────────────┐
│                  DuckDB (embedded)                       │
│                  data/deep_owl.duckdb                    │
└──────────────┬──────────────────────────────────────────┘
               │ archive >90d
               ▼
┌─────────────────────────────────────────────────────────┐
│           Parquet cold storage                           │
│           data/archive/{year}/{month}/*.parquet          │
└─────────────────────────────────────────────────────────┘
```

**Concurrency model:**
- Single writer (WS ingester process)
- Multiple readers (dashboard, scorer, CLI) — DuckDB supports concurrent reads while one writer

---

## 2. Schema

Aktualna wersja: **3** (post v0.1.2). Zarządzana w `_meta` table.

### 2.1 Foundational tables

#### `_meta`
Schema version + app metadata.

```sql
CREATE TABLE IF NOT EXISTS _meta (
    key VARCHAR PRIMARY KEY,
    value VARCHAR NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO _meta (key, value) VALUES
    ('schema_version', '3'),
    ('app_version', '0.1.3'),
    ('scope', 'big_caps_cex_first_ws_3modules_hexagonal');
```

### 2.2 Universe tables

#### `tokens` — master tokens

Per token (CoinGecko ID-based). Zachowuje delisted (soft delete `is_active=FALSE`) — anti-survivorship-bias.

```sql
CREATE TABLE IF NOT EXISTS tokens (
    token_id VARCHAR PRIMARY KEY,           -- "bitcoin", "ethereum"
    symbol VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    cmc_id INTEGER,
    market_cap_rank INTEGER,
    market_cap_usd DOUBLE,
    volume_24h_usd DOUBLE,
    age_days INTEGER,
    tier INTEGER NOT NULL DEFAULT 4 CHECK (tier IN (1, 2, 3, 4)),
    is_active BOOLEAN DEFAULT TRUE,
    is_blacklisted BOOLEAN DEFAULT FALSE,
    blacklist_reason VARCHAR,
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tokens_active_tier ON tokens(is_active, tier, market_cap_rank);
CREATE INDEX idx_tokens_symbol ON tokens(symbol);
CREATE INDEX idx_tokens_cmc ON tokens(cmc_id);
```

#### `token_listings` — per-CEX symbol mapping

One-to-many: 1 token → N listings (typowo 1-4).

```sql
CREATE TABLE IF NOT EXISTS token_listings (
    token_id VARCHAR NOT NULL REFERENCES tokens(token_id),
    exchange VARCHAR NOT NULL,              -- 'binance', 'bybit', 'okx', 'coinbase'
    symbol VARCHAR NOT NULL,                -- 'BTCUSDT', 'BTC-USD', 'BTC-USDT-SWAP'
    market_type VARCHAR NOT NULL,           -- 'spot', 'perpetual', 'inverse'
    quote_asset VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    listed_at TIMESTAMP,
    delisted_at TIMESTAMP,
    PRIMARY KEY (token_id, exchange, symbol)
);

CREATE INDEX idx_listings_exchange ON token_listings(exchange, is_active);
CREATE INDEX idx_listings_token ON token_listings(token_id, is_active);
```

#### `cex_symbols_snapshot` — daily snapshot per CEX (Module 3 diff)

```sql
CREATE TABLE IF NOT EXISTS cex_symbols_snapshot (
    exchange VARCHAR NOT NULL,
    snapshot_date DATE NOT NULL,
    symbol VARCHAR NOT NULL,
    market_type VARCHAR NOT NULL,
    quote_asset VARCHAR,
    PRIMARY KEY (exchange, snapshot_date, symbol)
);

CREATE INDEX idx_cex_snapshot_date ON cex_symbols_snapshot(snapshot_date, exchange);
```

### 2.3 Live market data tables (highest write volume)

#### `klines_5m` — OHLCV 5min

Dominant table by row count (~13GB/year). WS primary writer + REST backfill.

```sql
CREATE TABLE IF NOT EXISTS klines_5m (
    exchange VARCHAR NOT NULL,
    symbol VARCHAR NOT NULL,
    ts TIMESTAMP NOT NULL,                  -- candle open time
    open DOUBLE NOT NULL,
    high DOUBLE NOT NULL,
    low DOUBLE NOT NULL,
    close DOUBLE NOT NULL,
    volume_base DOUBLE NOT NULL,
    volume_quote DOUBLE NOT NULL,
    trades_count INTEGER,
    taker_buy_volume_base DOUBLE,
    source VARCHAR DEFAULT 'ws',            -- 'ws' | 'rest_backfill' | 'rest_sanity'
    PRIMARY KEY (exchange, symbol, ts)
);

CREATE INDEX idx_klines_5m_symbol_ts ON klines_5m(symbol, ts DESC);
CREATE INDEX idx_klines_5m_ts ON klines_5m(ts);
```

#### `klines_15m` — OHLCV 15min

Identyczna struktura, mniejsza skala (÷3).

#### `funding_history` — funding rate per 8h cycle

Tylko dla perpetuals (~600 tokenów × 4 CEX × 3 calls/dzień = ~7200 rows/dzień).

```sql
CREATE TABLE IF NOT EXISTS funding_history (
    exchange VARCHAR NOT NULL,
    symbol VARCHAR NOT NULL,
    ts TIMESTAMP NOT NULL,
    funding_rate DOUBLE NOT NULL,           -- 0.0001 = 0.01% per 8h
    mark_price DOUBLE,
    source VARCHAR DEFAULT 'ws',
    PRIMARY KEY (exchange, symbol, ts)
);

CREATE INDEX idx_funding_symbol_ts ON funding_history(symbol, ts DESC);
```

#### `open_interest` — OI snapshots per godzinę

```sql
CREATE TABLE IF NOT EXISTS open_interest (
    exchange VARCHAR NOT NULL,
    symbol VARCHAR NOT NULL,
    ts TIMESTAMP NOT NULL,
    open_interest_base DOUBLE NOT NULL,
    open_interest_usd DOUBLE,
    source VARCHAR DEFAULT 'ws',
    PRIMARY KEY (exchange, symbol, ts)
);

CREATE INDEX idx_oi_symbol_ts ON open_interest(symbol, ts DESC);
```

#### `liquidations` — WS liquidations stream (Module 1 sygnał #5)

```sql
CREATE SEQUENCE IF NOT EXISTS liquidations_id_seq START 1;

CREATE TABLE IF NOT EXISTS liquidations (
    id BIGINT PRIMARY KEY DEFAULT nextval('liquidations_id_seq'),
    exchange VARCHAR NOT NULL,
    symbol VARCHAR NOT NULL,
    ts TIMESTAMP NOT NULL,
    side VARCHAR NOT NULL CHECK (side IN ('long', 'short')),
    size_base DOUBLE NOT NULL,
    size_usd DOUBLE,
    price DOUBLE NOT NULL,
    source VARCHAR DEFAULT 'ws'
);

CREATE INDEX idx_liq_symbol_ts ON liquidations(symbol, ts DESC);
```

### 2.4 Engine output tables

#### `signals` — Module 1 output

```sql
CREATE SEQUENCE IF NOT EXISTS signals_id_seq START 1;

CREATE TABLE IF NOT EXISTS signals (
    id BIGINT PRIMARY KEY DEFAULT nextval('signals_id_seq'),
    token_id VARCHAR NOT NULL REFERENCES tokens(token_id),
    primary_exchange VARCHAR NOT NULL,
    primary_symbol VARCHAR NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    score DOUBLE NOT NULL CHECK (score >= 0 AND score <= 100),
    tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3, 4)),
    breakdown JSON NOT NULL,                -- {volume_rising: {raw: 2.5, norm: 0.85}, ...}
    alert_sent BOOLEAN DEFAULT FALSE,
    alert_channels JSON,                    -- ["telegram", "dashboard"]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_signals_token_ts ON signals(token_id, timestamp DESC);
CREATE INDEX idx_signals_alert_pending ON signals(alert_sent, tier) WHERE alert_sent = FALSE;
CREATE INDEX idx_signals_score ON signals(score DESC, timestamp DESC);
```

#### `paper_trades` — symulowane trades

```sql
CREATE SEQUENCE IF NOT EXISTS paper_trades_id_seq START 1;

CREATE TABLE IF NOT EXISTS paper_trades (
    id BIGINT PRIMARY KEY DEFAULT nextval('paper_trades_id_seq'),
    signal_id BIGINT REFERENCES signals(id),
    token_id VARCHAR NOT NULL REFERENCES tokens(token_id),
    exchange VARCHAR NOT NULL,
    symbol VARCHAR NOT NULL,
    side VARCHAR NOT NULL CHECK (side IN ('buy', 'sell')),
    entry_ts TIMESTAMP NOT NULL,
    entry_price DOUBLE NOT NULL,
    exit_ts TIMESTAMP,
    exit_price DOUBLE,
    size_usd DOUBLE NOT NULL CHECK (size_usd > 0),
    fee_usd DOUBLE DEFAULT 0,
    slippage_bps DOUBLE DEFAULT 0,
    pnl_usd DOUBLE,
    pnl_pct DOUBLE,
    status VARCHAR NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
    close_reason VARCHAR,                   -- stop_loss, take_profit, time_stop, manual
    source_module VARCHAR DEFAULT 'module1' CHECK (source_module IN ('module1', 'module3', 'manual')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_paper_status ON paper_trades(status);
CREATE INDEX idx_paper_token ON paper_trades(token_id);
```

#### `backtest_runs` — Module 2 metadata + metrics

```sql
CREATE SEQUENCE IF NOT EXISTS backtest_runs_id_seq START 1;

CREATE TABLE IF NOT EXISTS backtest_runs (
    id BIGINT PRIMARY KEY DEFAULT nextval('backtest_runs_id_seq'),
    strategy_name VARCHAR NOT NULL,
    params JSON NOT NULL,
    universe JSON NOT NULL,                 -- ["bitcoin@binance:BTCUSDT", ...]
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    metrics JSON NOT NULL,                  -- {win_rate, sharpe, max_dd, ...}
    trade_count INTEGER,
    report_html_path VARCHAR,               -- relative path to HTML report
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_backtest_strategy ON backtest_runs(strategy_name, created_at DESC);
```

### 2.5 Module 3 New Listings tables

#### `new_listings`

```sql
CREATE SEQUENCE IF NOT EXISTS new_listings_id_seq START 1;

CREATE TABLE IF NOT EXISTS new_listings (
    id BIGINT PRIMARY KEY DEFAULT nextval('new_listings_id_seq'),
    token_id VARCHAR REFERENCES tokens(token_id),  -- nullable (może być przed universe rebuild)
    symbol VARCHAR NOT NULL,
    first_exchange VARCHAR NOT NULL,
    first_listed_at TIMESTAMP NOT NULL,
    detection_source VARCHAR NOT NULL CHECK (detection_source IN
        ('cex_diff', 'binance_rss', 'bybit_announce', 'okx_announce', 'coinbase_announce')),
    market_cap_usd_at_listing DOUBLE,
    volume_24h_usd_at_listing DOUBLE,
    cex_listings_count INTEGER DEFAULT 1,
    has_perpetual BOOLEAN DEFAULT FALSE,
    is_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_new_listings_unprocessed ON new_listings(is_processed, created_at DESC)
    WHERE is_processed = FALSE;
CREATE INDEX idx_new_listings_token ON new_listings(token_id);
```

#### `new_listing_filters` — user filter sets

```sql
CREATE SEQUENCE IF NOT EXISTS new_listing_filters_id_seq START 1;

CREATE TABLE IF NOT EXISTS new_listing_filters (
    id BIGINT PRIMARY KEY DEFAULT nextval('new_listing_filters_id_seq'),
    name VARCHAR NOT NULL UNIQUE,           -- "conservative", "aggressive_alts"
    enabled BOOLEAN DEFAULT TRUE,
    config JSON NOT NULL,
    alert_on_match BOOLEAN DEFAULT FALSE,
    source VARCHAR DEFAULT 'config_yaml' CHECK (source IN ('config_yaml', 'dashboard_ui')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `new_listing_matches` — M2M listing × filter set

```sql
CREATE TABLE IF NOT EXISTS new_listing_matches (
    new_listing_id BIGINT NOT NULL REFERENCES new_listings(id),
    filter_set_id BIGINT NOT NULL REFERENCES new_listing_filters(id),
    matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    alert_sent BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (new_listing_id, filter_set_id)
);

CREATE INDEX idx_matches_alert_pending ON new_listing_matches(alert_sent, matched_at DESC)
    WHERE alert_sent = FALSE;
```

### 2.6 Operational tables

#### `ws_status` — WS connection health

```sql
CREATE TABLE IF NOT EXISTS ws_status (
    exchange VARCHAR NOT NULL,
    connection_id VARCHAR NOT NULL,         -- "binance_spot_1", "binance_futures"
    last_connected_at TIMESTAMP,
    last_disconnected_at TIMESTAMP,
    last_heartbeat_at TIMESTAMP,
    last_message_at TIMESTAMP,
    state VARCHAR NOT NULL CHECK (state IN ('connecting', 'connected', 'disconnected', 'error')),
    subscriptions_count INTEGER DEFAULT 0,
    frames_received_total BIGINT DEFAULT 0,
    reconnect_attempts BIGINT DEFAULT 0,
    last_error VARCHAR,
    PRIMARY KEY (exchange, connection_id)
);

CREATE INDEX idx_ws_state ON ws_status(state);
```

---

## 3. Partitioning

### 3.1 Strategy

DuckDB single-file model nie wspiera native table partitioning (jak Postgres) — używamy **virtual partitioning przez parquet archive**.

**Hot tier (DuckDB main file):**
- Klines, funding, OI, liquidations: ostatnie 90 dni
- Signals, paper_trades, backtest_runs, new_listings: pełna historia (małe tabele)
- Tokens, token_listings, cex_symbols_snapshot: pełna historia (referencyjne)

**Cold tier (parquet w `data/archive/`):**
- Klines/funding/OI/liquidations starsze niż 90 dni
- Per-month files: `data/archive/{year}/{month}/{table}.parquet`

### 3.2 Archive job (cron daily lub manual)

```sql
-- Archive klines_5m starsze niż 90 dni
COPY (
    SELECT * FROM klines_5m
    WHERE ts < NOW() - INTERVAL 90 DAY
)
TO 'data/archive/2026/01/klines_5m_2025-12.parquet'
(FORMAT PARQUET, COMPRESSION 'zstd', PARTITION_BY (date_trunc('month', ts)));

-- Po sukcesie:
DELETE FROM klines_5m WHERE ts < NOW() - INTERVAL 90 DAY;

-- Update _meta z last archive date
UPDATE _meta SET value = '2026-01-15', updated_at = CURRENT_TIMESTAMP
WHERE key = 'last_archive_date';
```

### 3.3 Querying archive transparentnie

```sql
-- Query że łączy hot + cold tier
SELECT * FROM (
    SELECT * FROM klines_5m
    UNION ALL
    SELECT * FROM read_parquet('data/archive/**/*.parquet', hive_partitioning=true)
)
WHERE symbol = 'BTCUSDT' AND ts BETWEEN '2024-01-01' AND '2024-06-30';
```

DuckDB native parquet reader = zero migration overhead. Może być wolniejsze (10-30%) niż hot tier ale akceptowalne dla historical queries.

### 3.4 View dla seamless query

```sql
CREATE OR REPLACE VIEW klines_5m_full AS
SELECT * FROM klines_5m
UNION ALL
SELECT * FROM read_parquet('data/archive/**/klines_5m_*.parquet', hive_partitioning=true);
```

Aplikacja używa `klines_5m_full` zamiast `klines_5m` gdy potrzebuje pełnej historii.

---

## 4. Indexes

### 4.1 Index strategy

**Pattern:** PRIMARY KEY (exchange, symbol, ts) ZAWSZE — to natural query pattern (per-symbol time series).

**Plus secondary indexes:**
- `(symbol, ts DESC)` — query "ostatnie N candles per symbol" bez exchange filter
- `(ts)` — global time range queries (dashboard "last 1h all symbols")
- `(alert_sent, tier) WHERE alert_sent = FALSE` — partial index, fast pending alerts pull

### 4.2 Index tradeoffs

DuckDB indexes są **zone maps + min/max statistics**, NIE B-tree (jak Postgres). To znaczy:
- ✅ Bardzo lekkie storage overhead (~1-2% table size)
- ✅ Świetne dla range scans (time-series queries)
- ⚠️ Słabsze dla equality lookups (single-row by id) — używaj PK zamiast index dla tych
- ⚠️ Brak typowych B-tree gwarancji (no UNIQUE enforcement bez PK)

### 4.3 Index audit pattern

```sql
-- Pokazuje wszystkie indexes
SELECT * FROM duckdb_indexes();

-- Sprawdź czy query używa indexu (EXPLAIN)
EXPLAIN ANALYZE SELECT * FROM klines_5m WHERE symbol = 'BTCUSDT' AND ts > NOW() - INTERVAL 7 DAY;
```

---

## 5. Common queries

### 5.1 Module 1 scoring — pull last 7d klines per token

```sql
SELECT exchange, symbol, ts, open, high, low, close, volume_base, volume_quote, taker_buy_volume_base
FROM klines_5m
WHERE symbol = ?
  AND ts > NOW() - INTERVAL 7 DAY
ORDER BY ts DESC;
```

**Performance:** dzięki PK (exchange, symbol, ts) — single-symbol scan ~50ms dla 7 dni × 5min candles (2016 rows).

### 5.2 Cross-exchange volume divergence

```sql
SELECT exchange, AVG(volume_quote) as avg_vol_24h
FROM klines_5m
WHERE symbol IN (
    SELECT symbol FROM token_listings WHERE token_id = 'bitcoin' AND is_active = TRUE
)
  AND ts > NOW() - INTERVAL 24 HOUR
GROUP BY exchange
ORDER BY avg_vol_24h DESC;
```

### 5.3 Funding rate skew (24h average)

```sql
SELECT exchange, symbol, AVG(funding_rate) as avg_funding_24h
FROM funding_history
WHERE symbol = ?
  AND ts > NOW() - INTERVAL 24 HOUR
GROUP BY exchange, symbol;
```

### 5.4 Open Interest growth (vs 7d avg)

```sql
WITH oi_now AS (
    SELECT exchange, symbol, open_interest_usd
    FROM open_interest
    WHERE symbol = ?
    ORDER BY ts DESC
    LIMIT 1
),
oi_7d_avg AS (
    SELECT exchange, symbol, AVG(open_interest_usd) as avg_7d
    FROM open_interest
    WHERE symbol = ? AND ts > NOW() - INTERVAL 7 DAY
    GROUP BY exchange, symbol
)
SELECT
    n.exchange, n.symbol,
    (n.open_interest_usd - a.avg_7d) / a.avg_7d as oi_growth_pct
FROM oi_now n
JOIN oi_7d_avg a USING (exchange, symbol);
```

### 5.5 Pending alerts (Telegram worker)

```sql
SELECT s.id, s.token_id, t.symbol, s.score, s.tier, s.breakdown
FROM signals s
JOIN tokens t USING (token_id)
WHERE s.alert_sent = FALSE
  AND s.created_at > NOW() - INTERVAL 1 HOUR  -- nie wysyłamy stale alertów
ORDER BY s.tier ASC, s.score DESC               -- top tier first, highest score first
LIMIT 30;                                        -- daily cap
```

Partial index `idx_signals_alert_pending` przyspiesza ten query do ~5ms.

### 5.6 Module 3 — new listings matching active filter sets

```sql
SELECT
    nl.id, nl.symbol, nl.first_exchange, nl.first_listed_at,
    nl.market_cap_usd_at_listing, nl.volume_24h_usd_at_listing,
    f.name as filter_set_name
FROM new_listings nl
CROSS JOIN new_listing_filters f
WHERE f.enabled = TRUE
  AND nl.is_processed = FALSE
  AND nl.created_at > NOW() - INTERVAL (
      CAST(json_extract_string(f.config, '$.max_age_hours') AS INTEGER)
  ) HOUR
  AND nl.market_cap_usd_at_listing >= CAST(json_extract_string(f.config, '$.min_market_cap_usd') AS DOUBLE)
  AND nl.volume_24h_usd_at_listing >= CAST(json_extract_string(f.config, '$.min_volume_24h_usd') AS DOUBLE)
ORDER BY nl.created_at DESC;
```

(Filter logika fully w SQL gdzie możliwe — szybciej niż app-side filtering.)

### 5.7 Backtest results comparison

```sql
SELECT
    strategy_name,
    AVG(CAST(json_extract_string(metrics, '$.sharpe') AS DOUBLE)) as avg_sharpe,
    AVG(CAST(json_extract_string(metrics, '$.win_rate') AS DOUBLE)) as avg_win_rate,
    AVG(CAST(json_extract_string(metrics, '$.max_dd') AS DOUBLE)) as avg_max_dd,
    COUNT(*) as run_count
FROM backtest_runs
WHERE created_at > NOW() - INTERVAL 30 DAY
GROUP BY strategy_name
ORDER BY avg_sharpe DESC;
```

### 5.8 WS health dashboard

```sql
SELECT
    exchange,
    connection_id,
    state,
    subscriptions_count,
    frames_received_total,
    EXTRACT(EPOCH FROM (NOW() - last_message_at)) as seconds_since_last_msg,
    reconnect_attempts,
    last_error
FROM ws_status
ORDER BY exchange, connection_id;
```

---

## 6. Migrations

### 6.1 Pattern

DuckDB nie ma natywnego migration system jak Alembic. Używamy **idempotent SQL + version tracking w `_meta`**.

```sql
-- src/deep_owl/db/migrations/v003_add_liquidations.sql
INSERT OR IGNORE INTO _meta (key, value) VALUES ('migration_v003_started', CURRENT_TIMESTAMP);

-- Migration body (CREATE TABLE IF NOT EXISTS pattern — idempotent)
CREATE TABLE IF NOT EXISTS liquidations (...);
CREATE INDEX IF NOT EXISTS idx_liq_symbol_ts ON liquidations(...);

-- Mark complete
UPDATE _meta SET value = '3' WHERE key = 'schema_version';
INSERT OR IGNORE INTO _meta (key, value) VALUES ('migration_v003_completed', CURRENT_TIMESTAMP);
```

### 6.2 Migration runner

`src/deep_owl/db/client.py`:

```python
class DuckDBClient:
    def apply_schema(self) -> None:
        current_version = self.execute_scalar("SELECT value FROM _meta WHERE key='schema_version'")
        target_version = 3  # hardcoded in code

        if current_version is None:
            self.run_sql_file("schema.sql")  # initial setup
            return

        for v in range(int(current_version) + 1, target_version + 1):
            migration_path = Path(f"src/deep_owl/db/migrations/v{v:03d}_*.sql")
            for migration_file in sorted(glob(str(migration_path))):
                log.info("apply_migration", version=v, file=migration_file)
                self.run_sql_file(migration_file)
```

### 6.3 Backward compatibility

**ADR-able decyzja:** czy schema migrations are forward-only?

Default: **YES, forward-only.** Downgrade migrations skomplikowane, rzadko potrzebne dla solo dev. Jeśli rollback potrzebny → restore z file backup (patrz sekcja 7).

---

## 7. Backup & recovery

### 7.1 Backup strategy

**Hot backup (no downtime):** DuckDB EXPORT DATABASE.

```sql
EXPORT DATABASE 'data/backup/snapshot_2026-05-15.db' (FORMAT PARQUET);
```

Outputs directory z parquet files per table + schema.sql + load.sql. Re-import:

```sql
IMPORT DATABASE 'data/backup/snapshot_2026-05-15.db';
```

**Pattern (cron daily):**
```python
async def daily_backup():
    today = datetime.now().strftime("%Y-%m-%d")
    backup_dir = Path(f"data/backup/snapshot_{today}.db")
    conn.execute(f"EXPORT DATABASE '{backup_dir}' (FORMAT PARQUET)")
    log.info("backup_completed", dir=str(backup_dir))
```

### 7.2 Retention policy

- Daily snapshots: keep last 7
- Weekly snapshots: keep last 4 (1 month)
- Monthly snapshots: keep last 12 (1 year)

Cleanup script:
```python
async def prune_old_backups():
    backup_dir = Path("data/backup")
    snapshots = sorted(backup_dir.glob("snapshot_*"), reverse=True)
    # Keep 7 daily, 4 weekly, 12 monthly per cron
    ...
```

### 7.3 Disaster recovery

**Scenario: DuckDB file corruption.**

1. Stop all writers (WS ingester)
2. Move corrupted file: `mv data/deep_owl.duckdb data/deep_owl.duckdb.corrupt`
3. Restore from latest snapshot: `IMPORT DATABASE 'data/backup/snapshot_YYYY-MM-DD.db'`
4. Replay missing data:
   - REST backfill klines from last snapshot timestamp to NOW
   - Re-detect new_listings (CEX symbols snapshot diff)
5. Restart WS ingester (catches live data forward)

**RTO target:** < 30 min (ze świeżego backupu + 15 min REST backfill).

### 7.4 Off-site backup (Faza 7+)

Rsync `data/backup/` → external storage (S3, Backblaze B2). Encrypted (gocryptfs lub age) bo zawiera potencjalnie wrażliwe data (alertów, paper trades).

---

## 8. Performance

### 8.1 Write performance

**Target:** sustain ~10,000 INSERTs/sec do `klines_5m` (~4000 tokens × 4 CEX × 1 candle co 5min = 3200 inserts/min, ale z bursty WS ingestion peak ~10k/sec).

**Pattern: bulk INSERT z prepared statement:**

```python
async def flush_klines_batch(klines: list[Kline]):
    if not klines:
        return
    # Convert to columnar
    data = {
        "exchange": [k.exchange for k in klines],
        "symbol": [k.symbol for k in klines],
        "ts": [k.ts for k in klines],
        "open": [k.open for k in klines],
        # ...
    }
    arrow_table = pyarrow.Table.from_pydict(data)
    conn.execute("INSERT INTO klines_5m SELECT * FROM arrow_table")
```

**Throughput:** ~50,000 rows/sec dla bulk INSERT z arrow (10x faster niż row-by-row).

### 8.2 Read performance

**Target:** Module 1 scoring full universe < 2 min (4000 tokens, 7 engines każdy 50ms compute, ale data fetch dominuje).

**Pattern: batched SELECT:**

```python
# ZAMIAST 4000 osobnych queries:
for token in universe:
    klines = conn.execute("SELECT ... WHERE symbol = ?", [token.symbol]).fetchall()

# JEDEN query, batch processing po app-side:
all_klines = conn.execute("""
    SELECT exchange, symbol, ts, open, high, low, close, volume_quote
    FROM klines_5m
    WHERE symbol = ANY(?)
      AND ts > NOW() - INTERVAL 7 DAY
""", [[t.symbol for t in universe]]).arrow()
# Group by symbol app-side dla per-engine processing
```

**Speedup:** 100-500x dla full universe (1 query zamiast 4000).

### 8.3 Memory

DuckDB ma adaptive memory limit — domyślnie 80% RAM. Dla naszego use case (1 ingester process + 1 dashboard process):

```python
conn.execute("SET memory_limit='4GB'")  # leave room for engines + OS
```

### 8.4 Concurrent access

Single writer (WS ingester) + multiple readers (dashboard, scorer, CLI):

```python
# Writer connection (mode = 'rw'):
write_conn = duckdb.connect(db_path, read_only=False)

# Reader connections (mode = 'ro') — bezpieczne do współdzielenia:
read_conn = duckdb.connect(db_path, read_only=True)
```

**Pattern multi-process:** każdy proces tworzy własną connection (DuckDB safe), ale tylko 1 process pisze.

### 8.5 Query optimization tips

1. **Always include time filter** (PK natural ordering) — `WHERE ts > X`
2. **Use ANY() / IN() dla batch lookups** zamiast loop
3. **Aggregate w DB, NIE w app** — przesyłanie 1M rows do app = waste
4. **Use arrow() zamiast fetchall()** dla numpy interop (zero copy)
5. **EXPLAIN ANALYZE** dla wątpliwych queries

---

## 9. Skala estimates

### 9.1 Per komponent (yearly)

| Tabela | Rows/dzień | Bytes/row (arrow encoded) | GB/rok |
|---|---|---|---|
| klines_5m | ~3.5M (4000 tokens × 3 CEX × 288 candles) | ~80 | ~13 |
| klines_15m | ~1.2M | ~80 | ~4.5 |
| funding_history | ~7,200 | ~50 | ~0.13 |
| open_interest | ~57,600 | ~50 | ~1.0 |
| liquidations | ~50,000 (bursty) | ~80 | ~1.5 |
| signals | ~50-100 alerts | ~500 | ~0.02 |
| paper_trades | ~50 trades | ~600 | ~0.01 |
| backtest_runs | ~10 runs | ~5KB | ~0.02 |
| new_listings | ~20 | ~400 | ~0.003 |
| cex_symbols_snapshot | ~16,000 (4000 × 4 CEX) | ~50 | ~0.3 |

**Total roczny: ~21GB DuckDB hot tier.** Po archiwizacji 90+ dni → ~5GB hot + 16GB cold parquet.

### 9.2 Worst case scenario

Bull market (więcej liquidations, więcej trading volume → więcej signals):
- klines_5m: bez zmian (świece deterministyczne)
- liquidations: 5-10x normal = ~10GB/rok
- signals: 5x normal = ~0.1GB/rok
- paper_trades: 10x normal = ~0.1GB/rok

**Worst case ~30GB/rok DuckDB.** Wciąż w sweet spot DuckDB.

### 9.3 Beyond DuckDB sweet spot (>100GB)

Jeśli grow przekroczy ekspectations (dłuższa historia, więcej strategies, etc.):

**Option A (Faza 7+):** migrate do Postgres + TimescaleDB hypertables. Większy overhead operacyjny ale skala terabajtów.

**Option B (Faza 7+):** ClickHouse (columnar production-grade). Lepsza skala niż DuckDB, ale wymaga deployment.

**Option C (Faza 7+):** archive aggressive (>30d zamiast >90d → parquet) — wystarczy dla większości use cases.
