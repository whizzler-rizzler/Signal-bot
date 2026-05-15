-- Deep Owl — DuckDB schema (v0.1.0 — big caps CEX-first)
-- Migration version: 2 (zmienione z v1 fresh DEX → v2 big caps CEX)
-- Apply order: top-to-bottom. Idempotent (IF NOT EXISTS).
--
-- Tables:
--   _meta             — schema version + metadata
--   tokens            — master tokens recognized (CMC/CoinGecko ID-based)
--   token_listings    — per-CEX listing per token (mapping symbol)
--   klines_5m         — OHLCV 5min z REST API CEX
--   klines_15m        — OHLCV 15min
--   funding_history   — funding rate per 8h cycle (perpetuals)
--   open_interest     — OI snapshots per godzinę
--   signals           — Module 1 output (accumulation scores)
--   paper_trades      — simulated trades
--   backtest_runs     — backtest metadata + metrics

-- === Meta ===

CREATE TABLE IF NOT EXISTS _meta (
    key VARCHAR PRIMARY KEY,
    value VARCHAR NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO _meta (key, value) VALUES ('schema_version', '2');
INSERT OR IGNORE INTO _meta (key, value) VALUES ('app_version', '0.1.0');
INSERT OR IGNORE INTO _meta (key, value) VALUES ('scope', 'big_caps_cex_first');

-- === Tokens (master, CMC/CoinGecko ID-based) ===

CREATE TABLE IF NOT EXISTS tokens (
    token_id VARCHAR PRIMARY KEY,           -- CoinGecko ID: "bitcoin", "ethereum", etc.
    symbol VARCHAR NOT NULL,                -- "BTC", "ETH"
    name VARCHAR NOT NULL,
    cmc_id INTEGER,                         -- CoinMarketCap ID (cross-ref)
    market_cap_rank INTEGER,
    market_cap_usd DOUBLE,
    volume_24h_usd DOUBLE,
    age_days INTEGER,                       -- since first listing
    tier INTEGER NOT NULL DEFAULT 3 CHECK (tier IN (1, 2, 3)),  -- 1=top100, 2=top500, 3=top5000
    is_active BOOLEAN DEFAULT TRUE,         -- czy w aktualnym universe
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
    symbol VARCHAR NOT NULL,                -- exchange-specific: 'BTCUSDT', 'BTC-USD', 'BTC-USDT-SWAP'
    market_type VARCHAR NOT NULL,           -- 'spot', 'perpetual', 'inverse'
    quote_asset VARCHAR NOT NULL,           -- 'USDT', 'USD', 'USDC'
    is_active BOOLEAN DEFAULT TRUE,
    listed_at TIMESTAMP,
    delisted_at TIMESTAMP,
    PRIMARY KEY (token_id, exchange, symbol)
);

CREATE INDEX IF NOT EXISTS idx_listings_exchange ON token_listings(exchange, is_active);
CREATE INDEX IF NOT EXISTS idx_listings_token ON token_listings(token_id, is_active);

-- === Klines 5m ===

CREATE TABLE IF NOT EXISTS klines_5m (
    exchange VARCHAR NOT NULL,
    symbol VARCHAR NOT NULL,
    ts TIMESTAMP NOT NULL,                  -- candle open time
    open DOUBLE NOT NULL,
    high DOUBLE NOT NULL,
    low DOUBLE NOT NULL,
    close DOUBLE NOT NULL,
    volume_base DOUBLE NOT NULL,            -- BTC, ETH, etc.
    volume_quote DOUBLE NOT NULL,           -- USDT, USD
    trades_count INTEGER,
    taker_buy_volume_base DOUBLE,           -- buy pressure proxy
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
    PRIMARY KEY (exchange, symbol, ts)
);

CREATE INDEX IF NOT EXISTS idx_klines_15m_symbol_ts ON klines_15m(symbol, ts DESC);

-- === Funding history (perpetuals only) ===

CREATE TABLE IF NOT EXISTS funding_history (
    exchange VARCHAR NOT NULL,
    symbol VARCHAR NOT NULL,                -- perpetual symbol
    ts TIMESTAMP NOT NULL,                  -- funding time
    funding_rate DOUBLE NOT NULL,           -- np. 0.0001 = 0.01% per 8h
    mark_price DOUBLE,
    PRIMARY KEY (exchange, symbol, ts)
);

CREATE INDEX IF NOT EXISTS idx_funding_symbol_ts ON funding_history(symbol, ts DESC);

-- === Open Interest ===

CREATE TABLE IF NOT EXISTS open_interest (
    exchange VARCHAR NOT NULL,
    symbol VARCHAR NOT NULL,
    ts TIMESTAMP NOT NULL,                  -- snapshot time
    open_interest_base DOUBLE NOT NULL,     -- in token units
    open_interest_usd DOUBLE,               -- value w USD (jeśli mark price available)
    PRIMARY KEY (exchange, symbol, ts)
);

CREATE INDEX IF NOT EXISTS idx_oi_symbol_ts ON open_interest(symbol, ts DESC);

-- === Signals (Module 1 output) ===

CREATE SEQUENCE IF NOT EXISTS signals_id_seq START 1;

CREATE TABLE IF NOT EXISTS signals (
    id BIGINT PRIMARY KEY DEFAULT nextval('signals_id_seq'),
    token_id VARCHAR NOT NULL REFERENCES tokens(token_id),
    primary_exchange VARCHAR NOT NULL,      -- na którym CEX wykryto (highest score)
    primary_symbol VARCHAR NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    score DOUBLE NOT NULL CHECK (score >= 0 AND score <= 100),
    tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
    breakdown JSON NOT NULL,                -- per-signal scores
    alert_sent BOOLEAN DEFAULT FALSE,
    alert_channels JSON,                    -- ["telegram", "dashboard"]
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
    close_reason VARCHAR,                   -- stop_loss, take_profit, time_stop, manual
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_paper_status ON paper_trades(status);
CREATE INDEX IF NOT EXISTS idx_paper_token ON paper_trades(token_id);

-- === Backtest runs ===

CREATE SEQUENCE IF NOT EXISTS backtest_runs_id_seq START 1;

CREATE TABLE IF NOT EXISTS backtest_runs (
    id BIGINT PRIMARY KEY DEFAULT nextval('backtest_runs_id_seq'),
    strategy_name VARCHAR NOT NULL,
    params JSON NOT NULL,                   -- strategy params
    universe JSON NOT NULL,                 -- ["bitcoin@binance:BTCUSDT", ...]
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    metrics JSON NOT NULL,                  -- {win_rate, sharpe, max_dd, ...}
    trade_count INTEGER,
    report_html_path VARCHAR,               -- relative path to HTML report
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backtest_strategy ON backtest_runs(strategy_name, created_at DESC);
