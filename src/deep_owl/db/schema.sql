-- Deep Owl — DuckDB schema (v0.1.2 — big caps CEX-first, WebSocket-first, 3 modules)
-- Migration version: 3
-- Apply order: top-to-bottom. Idempotent (IF NOT EXISTS).
--
-- Tables (v3):
--   _meta                  — schema version + metadata
--   tokens                 — master tokens (CoinGecko ID-based)
--   token_listings         — per-CEX listing per token
--   cex_symbols_snapshot   — daily snapshot symboli per CEX (dla Module 3 diff)
--   klines_5m              — OHLCV 5min z WS primary + REST backfill
--   klines_15m             — OHLCV 15min
--   funding_history        — funding rate per 8h cycle
--   open_interest          — OI snapshots
--   liquidations           — WS liquidations stream (Module 1 signal #5)
--   signals                — Module 1 output
--   paper_trades           — Module 1+3 simulated trades
--   backtest_runs          — Module 2 metadata + metrics
--   new_listings           — Module 3 detected listings
--   new_listing_filters    — Module 3 user-defined filter sets (config + UI overrides)
--   new_listing_matches    — Module 3 token × filter_set matches
--   ws_status              — WS connection health metrics

-- === Meta ===

CREATE TABLE IF NOT EXISTS _meta (
    key VARCHAR PRIMARY KEY,
    value VARCHAR NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO _meta (key, value) VALUES ('schema_version', '3');
INSERT OR IGNORE INTO _meta (key, value) VALUES ('app_version', '0.1.2');
INSERT OR IGNORE INTO _meta (key, value) VALUES ('scope', 'big_caps_cex_first_ws_3modules');

-- === Tokens (master, CoinGecko ID-based) ===

CREATE TABLE IF NOT EXISTS tokens (
    token_id VARCHAR PRIMARY KEY,           -- CoinGecko ID: "bitcoin", "ethereum"
    symbol VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    cmc_id INTEGER,
    market_cap_rank INTEGER,
    market_cap_usd DOUBLE,
    volume_24h_usd DOUBLE,
    age_days INTEGER,
    tier INTEGER NOT NULL DEFAULT 4 CHECK (tier IN (1, 2, 3, 4)),  -- 1=top100, 2=top500, 3=top2000, 4=rest
    is_active BOOLEAN DEFAULT TRUE,
    is_blacklisted BOOLEAN DEFAULT FALSE,
    blacklist_reason VARCHAR,
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tokens_active_tier ON tokens(is_active, tier, market_cap_rank);
CREATE INDEX IF NOT EXISTS idx_tokens_symbol ON tokens(symbol);
CREATE INDEX IF NOT EXISTS idx_tokens_cmc ON tokens(cmc_id);

-- === Token listings (per CEX) ===

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

CREATE INDEX IF NOT EXISTS idx_listings_exchange ON token_listings(exchange, is_active);
CREATE INDEX IF NOT EXISTS idx_listings_token ON token_listings(token_id, is_active);

-- === CEX symbols snapshot (daily, dla Module 3 diff) ===

CREATE TABLE IF NOT EXISTS cex_symbols_snapshot (
    exchange VARCHAR NOT NULL,
    snapshot_date DATE NOT NULL,
    symbol VARCHAR NOT NULL,
    market_type VARCHAR NOT NULL,
    quote_asset VARCHAR,
    PRIMARY KEY (exchange, snapshot_date, symbol)
);

CREATE INDEX IF NOT EXISTS idx_cex_snapshot_date ON cex_symbols_snapshot(snapshot_date, exchange);

-- === Klines 5m (WS primary + REST backfill) ===

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
    source VARCHAR DEFAULT 'ws',            -- 'ws' lub 'rest_backfill' lub 'rest_sanity'
    PRIMARY KEY (exchange, symbol, ts)
);

CREATE INDEX IF NOT EXISTS idx_klines_5m_symbol_ts ON klines_5m(symbol, ts DESC);
CREATE INDEX IF NOT EXISTS idx_klines_5m_ts ON klines_5m(ts);

-- === Klines 15m ===

CREATE TABLE IF NOT EXISTS klines_15m (
    exchange VARCHAR NOT NULL,
    symbol VARCHAR NOT NULL,
    ts TIMESTAMP NOT NULL,
    open DOUBLE NOT NULL,
    high DOUBLE NOT NULL,
    low DOUBLE NOT NULL,
    close DOUBLE NOT NULL,
    volume_base DOUBLE NOT NULL,
    volume_quote DOUBLE NOT NULL,
    trades_count INTEGER,
    taker_buy_volume_base DOUBLE,
    source VARCHAR DEFAULT 'ws',
    PRIMARY KEY (exchange, symbol, ts)
);

CREATE INDEX IF NOT EXISTS idx_klines_15m_symbol_ts ON klines_15m(symbol, ts DESC);

-- === Funding history (perpetuals only) ===

CREATE TABLE IF NOT EXISTS funding_history (
    exchange VARCHAR NOT NULL,
    symbol VARCHAR NOT NULL,
    ts TIMESTAMP NOT NULL,
    funding_rate DOUBLE NOT NULL,           -- 0.0001 = 0.01% per 8h
    mark_price DOUBLE,
    source VARCHAR DEFAULT 'ws',
    PRIMARY KEY (exchange, symbol, ts)
);

CREATE INDEX IF NOT EXISTS idx_funding_symbol_ts ON funding_history(symbol, ts DESC);

-- === Open Interest ===

CREATE TABLE IF NOT EXISTS open_interest (
    exchange VARCHAR NOT NULL,
    symbol VARCHAR NOT NULL,
    ts TIMESTAMP NOT NULL,
    open_interest_base DOUBLE NOT NULL,
    open_interest_usd DOUBLE,
    source VARCHAR DEFAULT 'ws',
    PRIMARY KEY (exchange, symbol, ts)
);

CREATE INDEX IF NOT EXISTS idx_oi_symbol_ts ON open_interest(symbol, ts DESC);

-- === Liquidations (Module 1 signal #5) ===

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

CREATE INDEX IF NOT EXISTS idx_liq_symbol_ts ON liquidations(symbol, ts DESC);

-- === Signals (Module 1 output) ===

CREATE SEQUENCE IF NOT EXISTS signals_id_seq START 1;

CREATE TABLE IF NOT EXISTS signals (
    id BIGINT PRIMARY KEY DEFAULT nextval('signals_id_seq'),
    token_id VARCHAR NOT NULL REFERENCES tokens(token_id),
    primary_exchange VARCHAR NOT NULL,
    primary_symbol VARCHAR NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    score DOUBLE NOT NULL CHECK (score >= 0 AND score <= 100),
    tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3, 4)),
    breakdown JSON NOT NULL,
    alert_sent BOOLEAN DEFAULT FALSE,
    alert_channels JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_signals_token_ts ON signals(token_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_signals_alert_pending ON signals(alert_sent, tier) WHERE alert_sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_signals_score ON signals(score DESC, timestamp DESC);

-- === Paper trades ===

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
    close_reason VARCHAR,
    source_module VARCHAR DEFAULT 'module1' CHECK (source_module IN ('module1', 'module3', 'manual')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_paper_status ON paper_trades(status);
CREATE INDEX IF NOT EXISTS idx_paper_token ON paper_trades(token_id);

-- === Backtest runs ===

CREATE SEQUENCE IF NOT EXISTS backtest_runs_id_seq START 1;

CREATE TABLE IF NOT EXISTS backtest_runs (
    id BIGINT PRIMARY KEY DEFAULT nextval('backtest_runs_id_seq'),
    strategy_name VARCHAR NOT NULL,
    params JSON NOT NULL,
    universe JSON NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    metrics JSON NOT NULL,
    trade_count INTEGER,
    report_html_path VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backtest_strategy ON backtest_runs(strategy_name, created_at DESC);

-- === New Listings (Module 3) ===

CREATE SEQUENCE IF NOT EXISTS new_listings_id_seq START 1;

CREATE TABLE IF NOT EXISTS new_listings (
    id BIGINT PRIMARY KEY DEFAULT nextval('new_listings_id_seq'),
    token_id VARCHAR REFERENCES tokens(token_id),   -- nullable bo nowy listing może nie być w universe jeszcze
    symbol VARCHAR NOT NULL,
    first_exchange VARCHAR NOT NULL,
    first_listed_at TIMESTAMP NOT NULL,
    detection_source VARCHAR NOT NULL CHECK (detection_source IN ('cex_diff', 'binance_rss', 'bybit_announce', 'okx_announce', 'coinbase_announce')),
    market_cap_usd_at_listing DOUBLE,
    volume_24h_usd_at_listing DOUBLE,
    cex_listings_count INTEGER DEFAULT 1,
    has_perpetual BOOLEAN DEFAULT FALSE,
    is_processed BOOLEAN DEFAULT FALSE,             -- czy już zostało zaewaluowane przez filter sets
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_new_listings_unprocessed ON new_listings(is_processed, created_at DESC) WHERE is_processed = FALSE;
CREATE INDEX IF NOT EXISTS idx_new_listings_token ON new_listings(token_id);

-- === New Listing Filters (user-defined sets) ===

CREATE SEQUENCE IF NOT EXISTS new_listing_filters_id_seq START 1;

CREATE TABLE IF NOT EXISTS new_listing_filters (
    id BIGINT PRIMARY KEY DEFAULT nextval('new_listing_filters_id_seq'),
    name VARCHAR NOT NULL UNIQUE,                   -- "conservative", "aggressive_alts", "meme_hunt"
    enabled BOOLEAN DEFAULT TRUE,
    config JSON NOT NULL,                           -- full filter config (min_market_cap, etc.)
    alert_on_match BOOLEAN DEFAULT FALSE,
    source VARCHAR DEFAULT 'config_yaml' CHECK (source IN ('config_yaml', 'dashboard_ui')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- === New Listing Matches (M2M: listing × filter_set match) ===

CREATE TABLE IF NOT EXISTS new_listing_matches (
    new_listing_id BIGINT NOT NULL REFERENCES new_listings(id),
    filter_set_id BIGINT NOT NULL REFERENCES new_listing_filters(id),
    matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    alert_sent BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (new_listing_id, filter_set_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_alert_pending ON new_listing_matches(alert_sent, matched_at DESC) WHERE alert_sent = FALSE;

-- === WS Status (connection health) ===

CREATE TABLE IF NOT EXISTS ws_status (
    exchange VARCHAR NOT NULL,
    connection_id VARCHAR NOT NULL,                 -- np. "binance_spot_1", "binance_spot_2"
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

CREATE INDEX IF NOT EXISTS idx_ws_state ON ws_status(state);
