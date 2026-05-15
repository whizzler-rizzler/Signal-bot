-- Deep Owl — DuckDB schema
-- Migration version: 1
-- Apply order: top-to-bottom. Idempotent (IF NOT EXISTS).
--
-- Tables:
--   _meta            — schema version + metadata
--   tokens           — master tokens recognized
--   signals          — Module 1 output (accumulation scores)
--   fresh_projects   — Module 2 time-series state
--   paper_trades     — simulated trades
--   candles_5m       — OHLCV 5min (backtest)
--   candles_15m      — OHLCV 15min (backtest)
--   backtest_runs    — backtest metadata + metrics

-- === Meta ===

CREATE TABLE IF NOT EXISTS _meta (
    key VARCHAR PRIMARY KEY,
    value VARCHAR NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO _meta (key, value) VALUES ('schema_version', '1');
INSERT OR IGNORE INTO _meta (key, value) VALUES ('app_version', '0.1.0');

-- === Tokens ===

CREATE TABLE IF NOT EXISTS tokens (
    token_address VARCHAR PRIMARY KEY,    -- chain-prefixed: "solana:So1...", "ethereum:0x..."
    chain VARCHAR NOT NULL,                -- solana, ethereum, bsc, base, arbitrum, ...
    symbol VARCHAR,
    name VARCHAR,
    first_seen_at TIMESTAMP NOT NULL,
    pair_address VARCHAR,                  -- primary pair
    dex VARCHAR,                           -- raydium, uniswap, pancake, ...
    is_blacklisted BOOLEAN DEFAULT FALSE,
    blacklist_reason VARCHAR,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tokens_chain ON tokens(chain);
CREATE INDEX IF NOT EXISTS idx_tokens_symbol ON tokens(symbol);

-- === Signals (Module 1) ===

CREATE SEQUENCE IF NOT EXISTS signals_id_seq START 1;

CREATE TABLE IF NOT EXISTS signals (
    id BIGINT PRIMARY KEY DEFAULT nextval('signals_id_seq'),
    token_address VARCHAR NOT NULL REFERENCES tokens(token_address),
    timestamp TIMESTAMP NOT NULL,
    score DOUBLE NOT NULL CHECK (score >= 0 AND score <= 100),
    breakdown JSON NOT NULL,               -- {volume_rising: 0.8, lp_growth: 0.4, ...}
    alert_sent BOOLEAN DEFAULT FALSE,
    alert_channels JSON,                   -- ["telegram", "dashboard"]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_signals_token_ts ON signals(token_address, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_signals_alert_pending ON signals(alert_sent) WHERE alert_sent = FALSE;

-- === Fresh projects (Module 2) ===

CREATE TABLE IF NOT EXISTS fresh_projects (
    token_address VARCHAR NOT NULL REFERENCES tokens(token_address),
    snapshot_ts TIMESTAMP NOT NULL,
    lifecycle_stage INTEGER NOT NULL CHECK (lifecycle_stage BETWEEN 0 AND 4),
    growth_score DOUBLE CHECK (growth_score >= 0 AND growth_score <= 100),
    rugpull_flags JSON,                    -- {is_honeypot: false, lp_locked: true, ...}
    rugpull_excluded BOOLEAN DEFAULT FALSE,
    holder_count INTEGER,
    liquidity_usd DOUBLE,
    volume_24h_usd DOUBLE,
    top1_holder_pct DOUBLE,
    PRIMARY KEY (token_address, snapshot_ts)
);

CREATE INDEX IF NOT EXISTS idx_fresh_stage ON fresh_projects(lifecycle_stage, growth_score DESC);
CREATE INDEX IF NOT EXISTS idx_fresh_ts ON fresh_projects(snapshot_ts DESC);

-- === Paper trades ===

CREATE SEQUENCE IF NOT EXISTS paper_trades_id_seq START 1;

CREATE TABLE IF NOT EXISTS paper_trades (
    id BIGINT PRIMARY KEY DEFAULT nextval('paper_trades_id_seq'),
    signal_id BIGINT REFERENCES signals(id),
    token_address VARCHAR NOT NULL REFERENCES tokens(token_address),
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
    close_reason VARCHAR,                  -- stop_loss, take_profit, time_stop, manual
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_paper_status ON paper_trades(status);
CREATE INDEX IF NOT EXISTS idx_paper_token ON paper_trades(token_address);

-- === Candles (backtest source) ===

CREATE TABLE IF NOT EXISTS candles_5m (
    exchange VARCHAR NOT NULL,
    symbol VARCHAR NOT NULL,
    ts TIMESTAMP NOT NULL,
    open DOUBLE NOT NULL,
    high DOUBLE NOT NULL,
    low DOUBLE NOT NULL,
    close DOUBLE NOT NULL,
    volume DOUBLE NOT NULL,
    trades_count INTEGER,
    PRIMARY KEY (exchange, symbol, ts)
);

CREATE INDEX IF NOT EXISTS idx_candles_5m_symbol_ts ON candles_5m(symbol, ts);

CREATE TABLE IF NOT EXISTS candles_15m (
    exchange VARCHAR NOT NULL,
    symbol VARCHAR NOT NULL,
    ts TIMESTAMP NOT NULL,
    open DOUBLE NOT NULL,
    high DOUBLE NOT NULL,
    low DOUBLE NOT NULL,
    close DOUBLE NOT NULL,
    volume DOUBLE NOT NULL,
    trades_count INTEGER,
    PRIMARY KEY (exchange, symbol, ts)
);

CREATE INDEX IF NOT EXISTS idx_candles_15m_symbol_ts ON candles_15m(symbol, ts);

-- === Backtest runs ===

CREATE SEQUENCE IF NOT EXISTS backtest_runs_id_seq START 1;

CREATE TABLE IF NOT EXISTS backtest_runs (
    id BIGINT PRIMARY KEY DEFAULT nextval('backtest_runs_id_seq'),
    strategy_name VARCHAR NOT NULL,
    params JSON NOT NULL,                  -- strategy params
    universe JSON NOT NULL,                -- ["BTC-USDT@binance", ...]
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    metrics JSON NOT NULL,                 -- {win_rate, sharpe, max_dd, ...}
    trade_count INTEGER,
    report_html_path VARCHAR,              -- relative path to HTML report
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backtest_strategy ON backtest_runs(strategy_name, created_at DESC);
