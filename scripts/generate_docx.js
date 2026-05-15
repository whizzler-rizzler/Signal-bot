// Deep Owl — DOCX generator (Faza 0 deliverable, v0.1.0 — big caps CEX-first)
// Run: NODE_PATH="C:/Users/kubag/AppData/Roaming/npm/node_modules" node scripts/generate_docx.js
// Output: docs/deep_owl_v1.docx (20 stron, polski, professional styling)

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType, PageNumber, PageBreak,
} = require("docx");

const FONT = "Calibri";
const COLOR_PRIMARY = "1F4E79";
const COLOR_ACCENT = "2E75B6";
const COLOR_MUTED = "595959";
const COLOR_TABLE_HEADER = "1F4E79";
const COLOR_TABLE_HEADER_BG = "D9E2F3";
const COLOR_TABLE_BG_ALT = "F2F2F2";

const PAGE_WIDTH = 12240;
const PAGE_HEIGHT = 15840;
const MARGIN = 1440;

const border = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
const cellBorders = { top: border, bottom: border, left: border, right: border };

function P(text, opts = {}) {
  const { bold = false, size = 22, color = "000000", italic = false, align = AlignmentType.LEFT,
    spacingAfter = 80, spacingBefore = 0 } = opts;
  return new Paragraph({
    alignment: align,
    spacing: { before: spacingBefore, after: spacingAfter, line: 280 },
    children: [new TextRun({ text, bold, italics: italic, size, color, font: FONT })],
  });
}

function H1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, size: 36, color: COLOR_PRIMARY, font: FONT })],
  });
}

function H2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, color: COLOR_ACCENT, font: FONT })],
  });
}

function H3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 160, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24, color: COLOR_PRIMARY, font: FONT })],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 60, line: 280 },
    children: [new TextRun({ text, size: 22, font: FONT })],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function cell(text, opts = {}) {
  const { bold = false, bg = null, width = 4680, align = AlignmentType.LEFT, size = 20, color = "000000" } = opts;
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: bg ? { fill: bg, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold, size, color, font: FONT })],
    })],
  });
}

function dataTable(headers, rows, columnWidths) {
  const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => cell(h, {
          bold: true, bg: COLOR_TABLE_HEADER_BG, width: columnWidths[i], color: COLOR_TABLE_HEADER, size: 20,
        })),
      }),
      ...rows.map((row, rowIdx) => new TableRow({
        children: row.map((c, i) => cell(String(c), {
          width: columnWidths[i],
          bg: rowIdx % 2 === 1 ? COLOR_TABLE_BG_ALT : null,
        })),
      })),
    ],
  });
}

function divider(spacingAfter = 200) {
  return new Paragraph({
    spacing: { after: spacingAfter, before: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_ACCENT, space: 1 } },
    children: [new TextRun({ text: "" })],
  });
}

function code(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 100, after: 200 },
    children: [new TextRun({ text, font: "Consolas", size: opts.size || 18, color: opts.color || COLOR_MUTED })],
  });
}

const children = [];

// ===== STRONA 1: Cover + Executive Summary =====
children.push(
  new Paragraph({
    spacing: { before: 1600, after: 400 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "DEEP OWL", bold: true, size: 96, color: COLOR_PRIMARY, font: FONT })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: "Breakout Signals Bot", bold: true, size: 48, color: COLOR_ACCENT, font: FONT })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({
      text: "Big Caps CEX-First — Top ~5000 Established Tokens",
      bold: true, size: 28, color: COLOR_PRIMARY, font: FONT,
    })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 800 },
    children: [new TextRun({
      text: "Architektura · Roadmap · Standardy · v0.1.0",
      italics: true, size: 24, color: COLOR_MUTED, font: FONT,
    })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 1200 },
    children: [new TextRun({ text: "Faza 0 — Plan-as-docs · 2026-05-15", size: 22, color: COLOR_MUTED, font: FONT })],
  }),
  divider(200),
  H2("Executive Summary"),
  P("Deep Owl to bot do wykrywania sygnałów akumulacji na big cap tokenach notowanych na CEX-ach. Top 1 priority: established projekty z stażem na giełdach (top ~5000 z CoinMarketCap/CoinGecko po realnym filtrowaniu)."),
  P("Składa się z dwóch modułów core:"),
  bullet("Module 1 — Big Cap Accumulation Detector: liczy 7 sygnałów per token co 5 minut (volume profile, funding rate skew, OI buildup, cross-exchange divergence, liquidation imbalance, social sentiment opt, bid/ask imbalance opt). Tier-aware threshold: Tier 1 (top 100) próg 70+, Tier 2 (top 500) 65+, Tier 3 (top 5000) 60+."),
  bullet("Module 2 — Backtesting Engine: testuje strategie breakout (Bollinger Squeeze, Volume Spike, Funding Squeeze, RSI Divergence) na historycznych klines z REST API CEX (Binance ma do 2017, Bybit od 2020). Walk-forward MANDATORY (anti-overfitting)."),
  P("Universe budowany z CoinMarketCap + CoinGecko (~10k+ tokenów filtrowane do ~5000 po regułach: market cap > $1M, volume > $100k/24h, listed na min 2 CEX, age > 30 dni, NOT stablecoin, NOT wrapped derivative)."),
  P("Output: Telegram alerts + Web dashboard (FastAPI :8001) + paper trading z symulowanym slippage i fees. Bez realnego kapitału w Fazach 0-6.", { spacingBefore: 100 }),
  P("Stack: Python 3.11+, asyncio, DuckDB embedded (columnar, partitioned by month), Pydantic v2, FastAPI. Solo dev tool, standalone repo bez koligacji z parent market_maker."),
  P("OUT OF SCOPE: fresh DEX projects monitor, RugCheck, GoPlus, Pumpfun, Dexscreener, Birdeye — wszystko WYWALONE. Jeśli kiedyś chcemy fresh DEX, to osobny projekt.", { italic: true, color: COLOR_MUTED, spacingBefore: 100 }),
  pageBreak(),
);

// ===== STRONA 2: Glossary =====
children.push(
  H1("1. Glossary — terminy i skróty"),
  P("Definicje terminów pojawiających się w dokumencie. Pomocne dla recenzentów spoza świata krypto/trading.", { italic: true, color: COLOR_MUTED }),
  dataTable(
    ["Termin", "Definicja"],
    [
      ["Big cap", "Token z dużą kapitalizacją rynkową, established (zwykle top 5000 by market cap), z stażem na CEX-ach."],
      ["CEX", "Centralized Exchange — Binance, Bybit, OKX, Coinbase. Kapitał trzymany przez giełdę, REST + WebSocket APIs."],
      ["DEX", "Decentralized Exchange — Raydium, Uniswap. OUT OF SCOPE w Deep Owl (osobny potencjalny projekt)."],
      ["OHLCV / Klines", "Open / High / Low / Close / Volume — standardowy format świecy. Klines = nazwa Binance dla candles."],
      ["Funding rate", "Płatność co 8h między longs i shorts na perpetual futures. Negative funding = shorty płacą longom = za dużo shortów."],
      ["Open Interest (OI)", "Sumaryczna wartość wszystkich otwartych pozycji futures. Rosnący OI = nowy kapitał napływa."],
      ["Liquidation", "Wymuszone zamknięcie pozycji futures z powodu margin call. Long liq = długi liquidated (price spadła)."],
      ["TWAP / VWAP", "Time/Volume-Weighted Average Price — mid-price ważony czasem lub wolumenem."],
      ["Slippage", "Różnica między oczekiwaną ceną wejścia a ceną realnie uzyskaną. Rośnie z size i niskim depth."],
      ["FDV", "Fully Diluted Valuation — cena × total supply (ile token byłby wart przy pełnej dystrybucji)."],
      ["Walk-forward", "Backtest gdzie train + test okna przesuwają się w czasie — eliminuje look-ahead bias."],
      ["Sharpe Ratio", "(mean_return / std_return) × sqrt(252). Risk-adjusted return. >1 dobry, >2 świetny."],
      ["Max Drawdown (DD)", "Największy spadek od peak do trough w equity curve. Krytyczna metryka risk."],
      ["Score 0-100", "Output Modułu 1 — ważona suma znormalizowanych sygnałów. Próg alertu zależny od tier."],
      ["Tier (1/2/3)", "Klasyfikacja big cap wg market cap rank: 1=top100, 2=101-500, 3=501-5000."],
      ["Wyckoff method", "Klasyczna metoda analizy akumulacji/dystrybucji oparta na volume/price relationship."],
      ["Squeeze (short squeeze)", "Wymuszony wzrost ceny gdy zatłoczone shorty są liquidated, podbijając cenę dalej."],
      ["DuckDB", "Embedded analytics DB (jak SQLite ale columnar). 1-file backup, świetne dla backtest."],
      ["Pydantic v2", "Type-safe modele dla configów + API responses. Walidacja przy parsowaniu."],
      ["Async / asyncio", "Współbieżność I/O w Pythonie. Krytyczne dla pollingu API z rate limitami."],
    ],
    [2400, 6960],
  ),
  pageBreak(),
);

// ===== STRONA 3-4: Architecture overview =====
children.push(
  H1("2. Architektura systemu"),
  H2("2.1 Layered architecture"),
  P("Deep Owl jest aplikacją monolityczną podzieloną na 6 warstw o jasnych zależnościach. Każda warstwa zna tylko warstwy poniżej — to upraszcza testowanie i refactor."),
  dataTable(
    ["Warstwa", "Odpowiedzialność", "Lokalizacja"],
    [
      ["Data adapters", "I/O do CMC, CoinGecko, CEX REST APIs + parent recorder reuse. Normalizacja do common models.", "src/deep_owl/data/"],
      ["Storage", "DuckDB persistence + schema migrations + partitioning dla skali ~25GB/rok.", "src/deep_owl/db/"],
      ["Engine modules", "Universe builder, accumulation scoring, backtest runner.", "src/deep_owl/modules/"],
      ["Output", "Telegram bot, FastAPI dashboard, paper trader.", "src/deep_owl/output/"],
      ["CLI", "Entry points: deep-owl universe build, ingest, backtest, detect, run, serve.", "src/deep_owl/cli.py"],
      ["Config", "Pydantic Settings + .env loading + filter rules + tier thresholds.", "src/deep_owl/config.py"],
    ],
    [1800, 5160, 2400],
  ),
  H2("2.2 Pipeline: Universe → Ingest → Detect"),
  P("Trzystopniowa pipeline współdzielona przez wszystkie moduły:"),
  bullet("Etap 1 (Universe Builder, 24h cron): Pobiera ~10k tokenów z CoinGecko + CMC, filtruje do ~5000 realnych według reguł (market cap, volume, age, listings, blacklists). Wynik trafia do tabel tokens + token_listings."),
  bullet("Etap 2 (Klines/Funding/OI Ingester, continuous): Per CEX (Binance/Bybit/OKX/Coinbase) z respect dla rate limit, pobiera klines 5m + 15m + funding rates + open interest dla aktywnych tokenów. Bulk INSERT do DuckDB partitioned tables."),
  bullet("Etap 3 (Module 1 Detector, 5min cycle): Iteruje universe, dla każdego tokena liczy 7 sygnałów na podstawie ostatnich 7 dni klines + funding + OI. Score > tier_threshold → INSERT do signals table → alert worker dispatch (Telegram, dashboard)."),
  H2("2.3 Decyzje architektoniczne (top 9)"),
  dataTable(
    ["Decyzja", "Wybór", "Alternatywa", "Rationale"],
    [
      ["Język", "Python 3.11+", "Rust dla perf", "Match parent stack, asyncio dla I/O-heavy"],
      ["DB", "DuckDB + parquet", "Postgres / SQLite", "Embedded, columnar, krytyczne dla skali ~5000×klines"],
      ["Universe scope", "~5000 filtered z 10k+", "Top 10/50/100", "User explicit: full coverage CMC/CoinGecko"],
      ["Data primary", "CEX REST API", "Parent recorder tick", "Recorder tylko BTC/ETH/HYPE; REST pokrywa 5000"],
      ["Exchange priority", "Binance/Bybit/OKX/Coinbase", "All 14 z parent", "~95% global volume, best APIs"],
      ["Module count", "2 (accumulation + backtest)", "3 (poprzednio + fresh DEX)", "Fresh DEX wywalone z scope"],
      ["Output", "Sygnały + paper trading", "Auto-trading", "User wybór, niskie ryzyko"],
      ["Repo", "Standalone", "Worktree parent", "Czysta izolacja od market_maker"],
      ["Telegram lib", "python-telegram-bot v20", "aiogram", "Większa community"],
    ],
    [1700, 1900, 1900, 3860],
  ),
  pageBreak(),
);

children.push(
  H2("2.4 Diagram architektury — schemat blokowy"),
  P("Schemat poniżej pokazuje uproszczone relacje między warstwami i zewnętrznymi systemami.", { italic: true, color: COLOR_MUTED }),
  code(
`+--------------------------------------------------------------+
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
                       backtest_runs`,
    { size: 18 }
  ),
  H2("2.5 Skala i performance"),
  P("Universe ~5000 tokenów × ~3 CEX listings × klines 5m to znaczna skala. Estymowany growth:"),
  dataTable(
    ["Komponent", "Skala", "Storage estimate"],
    [
      ["Universe rebuild", "5000 tokens × 24h refresh", "~5MB/dzień"],
      ["Klines 5m", "5000 × 3 listings × 288 candles/d", "~13GB/rok (DuckDB columnar 3x compression)"],
      ["Klines 15m", "Jak wyżej, ÷3", "~4.5GB/rok"],
      ["Funding (8h cycle)", "5000 × 1 CEX × 3 calls/d", "<1GB/rok"],
      ["Open Interest (1h)", "5000 × 1 CEX × 24 calls/d", "~3GB/rok"],
      ["Signals (50 alerts/d)", "Indexed time-series", "<500MB/rok"],
    ],
    [2400, 3500, 3460],
  ),
  P("Total roczny: ~25GB DuckDB. Po 2-3 latach archiwizacja klines starszych niż 90 dni do parquet (cold storage).", { spacingBefore: 100 }),
  P("Bottleneck: API rate limits. Binance 6000 weight/min ≈ 6000 calls/min. Top 5000 × 4 CEX = 20k calls — wymaga round-robin między CEX-ami + smart caching + priorytetyzacji per tier (Tier 1 częściej, Tier 3 rzadziej).", { italic: true, color: COLOR_MUTED }),
  pageBreak(),
);

// ===== STRONA 5: Universe Builder =====
children.push(
  H1("3. Universe Builder — co skanujemy"),
  H2("3.1 Cel i source"),
  P("Universe Builder ma odpowiedzieć na pytanie: które ~5000 tokenów monitorować? CMC i CoinGecko mają 10k+ tokenów ale 70% to dead/scam. Filtrujemy aktywne."),
  bullet("Source primary: CoinGecko /coins/markets (paginated, 30 req/min free wystarczy dla daily refresh ~10k tokens w 1-2 min)"),
  bullet("Source secondary: CoinMarketCap /v1/cryptocurrency/listings/latest (top 5000 w 1 call, free 333/dzień — wystarczy na cross-check)"),
  H2("3.2 Filter pipeline (configurable)"),
  P("Default reguły filtrowania w config.yaml:"),
  dataTable(
    ["Reguła", "Default value", "Rationale"],
    [
      ["min_market_cap_usd", "$1,000,000", "Ekskluzja absolutnych dust tokens"],
      ["min_volume_24h_usd", "$100,000", "Wymagana realna płynność"],
      ["min_age_days", "30", "Eliminuje świeże launches (out of scope)"],
      ["min_cex_listings", "2 z top 20 CEX", "Wymaga realnej adopcji"],
      ["stablecoin_blacklist", "USDT,USDC,DAI,FDUSD,...", "Stable nie ma volatility do detekcji breakout"],
      ["wrapped_synthetic_blacklist", "WBTC,stETH,jupSOL,...", "Same risk profile co underlying"],
    ],
    [3000, 2160, 4200],
  ),
  H2("3.3 Per-token CEX listing detector"),
  P("Po filtrowaniu, dla każdego tokena resolveujemy listing per CEX (na których z 4 prioritized CEX-ów jest dostępny i pod jakim symbolem):"),
  dataTable(
    ["Token", "Binance", "Bybit", "OKX", "Coinbase"],
    [
      ["bitcoin (BTC)", "BTCUSDT", "BTCUSDT", "BTC-USDT", "BTC-USD"],
      ["ethereum (ETH)", "ETHUSDT", "ETHUSDT", "ETH-USDT", "ETH-USD"],
      ["solana (SOL)", "SOLUSDT", "SOLUSDT", "SOL-USDT", "SOL-USD"],
      ["chainlink (LINK)", "LINKUSDT", "LINKUSDT", "LINK-USDT", "LINK-USD"],
      ["...", "...", "...", "...", "..."],
    ],
    [2400, 1740, 1740, 1740, 1740],
  ),
  P("Result: tabela token_listings z one-to-many: 1 token → N listings (typowo 1-4 dla top tokens, 0-2 dla niższych tier)."),
  H2("3.4 Refresh policy"),
  bullet("Daily rebuild full pipeline (24h cron)"),
  bullet("Delta detection: nowe tokeny w universe (mark new=TRUE), usunięte (delisted lub spadły poniżej filter — soft delete is_active=FALSE, NIE delete row)"),
  bullet("Per-token first_seen_at zachowane (audyt: kiedy pojawił się w universe)"),
  pageBreak(),
);

// ===== STRONA 6: Data sources matrix =====
children.push(
  H1("4. Data sources — matryca"),
  P("Wszystkie źródła z których czerpie Deep Owl. Per faza wskazane jest kiedy adapter staje się aktywny."),
  H2("4.1 Quick reference"),
  dataTable(
    ["#", "Źródło", "Faza", "Auth", "Rate limit (free)", "Koszt"],
    [
      ["1", "CoinGecko API", "2", "key opt", "30 req/min", "$0 / $129 mo Pro"],
      ["2", "CoinMarketCap", "2", "API key", "333 req/d", "$0 / $79 mo Hobbyist"],
      ["3", "Binance REST", "3", "None", "6000 weight/min", "$0"],
      ["4", "Bybit REST", "3", "None", "50 req/sec", "$0"],
      ["5", "OKX REST", "3", "None", "20 req/2s", "$0"],
      ["6", "Coinbase REST", "3", "None", "10 req/sec", "$0 (spot only)"],
      ["7", "Parent recorder", "3 opt", "filesystem", "—", "$0 (BTC/ETH/HYPE)"],
      ["8", "Telegram Bot API", "6", "Bot token", "30 msg/s", "$0"],
      ["9", "Social_media_scanner", "5 opt", "parent venv", "—", "$0"],
    ],
    [600, 2400, 600, 1200, 2160, 2400],
  ),
  H2("4.2 CEX endpoints — common shape"),
  dataTable(
    ["Endpoint", "Binance", "Bybit", "OKX", "Coinbase"],
    [
      ["Klines (spot)", "/api/v3/klines", "/v5/market/kline", "/api/v5/market/candles", "/products/{id}/candles"],
      ["Klines (perp)", "/fapi/v1/klines", "/v5/market/kline (linear)", "/api/v5/market/candles (SWAP)", "(brak public)"],
      ["Funding", "/fapi/v1/fundingRate", "/v5/market/funding/history", "/api/v5/public/funding-rate-history", "(brak public)"],
      ["Open Interest", "/futures/data/openInterestHist", "/v5/market/open-interest", "/api/v5/public/open-interest", "(brak public)"],
      ["Symbols meta", "/api/v3/exchangeInfo", "/v5/market/instruments-info", "(per req)", "/products"],
    ],
    [2160, 1800, 2200, 1800, 1400],
  ),
  H2("4.3 Sekrety — gdzie trzymać"),
  dataTable(
    ["Sekret", "Storage", "Wymagany w fazie"],
    [
      ["COINMARKETCAP_API_KEY", ".env (gitignored)", "2 (cross-check)"],
      ["COINGECKO_API_KEY", ".env (gitignored, opt)", "2 opt (Pro tier)"],
      ["TELEGRAM_BOT_TOKEN", ".env (gitignored)", "6"],
      ["TELEGRAM_CHAT_ID", ".env (gitignored)", "6"],
    ],
    [3500, 3500, 2360],
  ),
  P("CEX public APIs (Binance, Bybit, OKX, Coinbase) NIE wymagają auth dla publicznych endpointów (klines, funding, OI).", { spacingBefore: 100 }),
  pageBreak(),
);

// ===== STRONA 7-9: Module 1 deep dive =====
children.push(
  H1("5. Module 1 — Big Cap Accumulation Detector"),
  H2("5.1 Pytanie biznesowe"),
  P("Czy ten established big cap akumuluje się PRZED breakoutem? Cel: złapać moment, w którym smart money cicho buduje pozycje na tokenach z stażem na CEX-ach, ZANIM publiczność zauważy ruch."),
  P("Insight metodologiczny: prawdziwa akumulacja często pokazuje wzrost wolumenu PRZY płaskiej cenie + negative funding (zatłoczone shorty) + rosnący OI (build-up). Klasyk Wyckoff method dla spot + cross-validate z funding/OI metrics dla futures.", { italic: true, color: COLOR_MUTED }),
  H2("5.2 Sygnały — siedem źródeł evidence"),
  P("Każdy sygnał zwraca wartość znormalizowaną do [0, 1] (sigmoid od threshold). Następnie ważona suma daje score 0-100:"),
  dataTable(
    ["#", "Sygnał", "Threshold", "Waga", "Skąd dane"],
    [
      ["1", "Volume rising on flat/down price", ">2.0 + |Δp|<5%", "0.20", "klines_5m + klines_15m"],
      ["2", "Funding rate skew (negative)", "<-0.01% przez 24h", "0.20", "funding_history"],
      ["3", "Open Interest buildup", "+20% vs 7d_avg", "0.15", "open_interest"],
      ["4", "Cross-exchange volume divergence", ">2x między CEX-ami", "0.15", "klines_5m × N CEX"],
      ["5", "Liquidation imbalance (long)", "long_liq/short_liq > 2.0", "0.10", "(parent recorder lub CEX REST)"],
      ["6", "Social mention velocity (opt)", ">3x vs 24h_avg", "0.10", "Social_media_scanner reuse"],
      ["7", "Bid/ask order book imbalance (opt)", ">1.5x bid", "0.10", "(parent recorder L5)"],
    ],
    [400, 2300, 1500, 1000, 4160],
  ),
  P("Suma wag = 1.00. Jeśli sygnał nie jest dostępny (np. token spot-only → no funding/OI), waga jest redystrybuowana proporcjonalnie do pozostałych aktywnych sygnałów."),
  H2("5.3 Score formula"),
  P("Pseudocode procedury scoring per token:"),
  code(
`def score_token(token, klines, funding, oi, social, orderbook):
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
    return score, signals  # signals = breakdown JSON`,
    { size: 18 }
  ),
  pageBreak(),
);

children.push(
  H2("5.4 Tier-aware threshold"),
  P("Nie wszystkie tokeny są sobie równe. Top 100 ma lepszą data quality, większe moves wymagają wyższych scores. Niskie tiery są bardziej zaszumione — niższy threshold + krótszy cooldown żeby nie przegapić alt sezonu:"),
  dataTable(
    ["Tier", "Definicja", "Alert threshold", "Cooldown per token"],
    [
      ["Tier 1", "Top 100 by market cap", "70+", "12h"],
      ["Tier 2", "Top 101-500", "65+", "8h"],
      ["Tier 3", "Top 501-5000", "60+", "4h"],
    ],
    [1200, 3500, 2400, 2260],
  ),
  H2("5.5 Sygnały — uzasadnienie metodologiczne"),
  bullet("Sygnał 1 (volume on flat price): klasyczny smart money pattern. Wysoki volume bez ruchu ceny = smart money kupuje od retail panicked sellers (Wyckoff accumulation)."),
  bullet("Sygnał 2 (funding skew): specyficzny dla perpetual futures. Negative funding = shorty płacą longom = za dużo shortów = squeeze potential. Backtest historyczny pokazuje że kombinacja negative funding + low volatility często poprzedza pumpy 5-15% w 24-72h."),
  bullet("Sygnał 3 (OI buildup): rosnący Open Interest przy stabilnej cenie = nowy kapitał napływa do pozycji. W połączeniu z negative funding (Sygnał 2) jednoznacznie wskazuje na build-up shorts → squeeze."),
  bullet("Sygnał 4 (cross-exchange divergence): smart money często koncentruje aktywność na jednym CEX (najlepsza płynność). Volume na Bybit 2x vs Binance dla danego tokena → coś się dzieje na Bybit."),
  bullet("Sygnał 5 (long liquidation imbalance): masowe liquidations longów to capitulation/bottom. >2x long liq vs short liq w 24h = weak hands flushed, potencjalnie lepsza relative entry."),
  bullet("Sygnał 6 (social): opcjonalne. Velocity > 3x = nagły wzrost zainteresowania, często poprzedza retail FOMO."),
  bullet("Sygnał 7 (bid/ask imbalance): tylko jeśli mamy orderbook snapshot (parent recorder dla BTC/ETH/HYPE). Imbalance > 1.5x na bid side = bid pressure."),
  H2("5.6 Cadence — częstotliwość skanowania"),
  dataTable(
    ["Komponent", "Interval", "Rationale"],
    [
      ["Universe rebuild", "24h", "Mało zmienne; delisting/listing rzadkie"],
      ["Klines pull (5m/15m)", "Per CEX rate limit", "Świeże dane co interval świecy"],
      ["Funding rates pull", "8h (funding cykl)", "Tyle ile warto"],
      ["Open Interest pull", "1h", "Wolniej zmienne"],
      ["Module 1 scoring", "5m (po zamknięciu świecy)", "Świeży snapshot → świeży score"],
      ["Telegram alert send", "Async po INSERT signal", "Cooldown per tier"],
    ],
    [3000, 2160, 4200],
  ),
  pageBreak(),
);

children.push(
  H2("5.7 Output — schemat alert message"),
  P("Format wiadomości Telegram + wpis w dashboard:"),
  code(
`[score: 82/100] BINANCE: BTCUSDT
Tier: 1 (top 100)  ·  $98,432.10  ·  +0.3% (24h)
Signals:
  - vol +185% on flat price
  - funding -0.024% (24h avg, negative = squeeze setup)
  - OI +28% (vs 7d avg)
  - cross-exchange: Bybit volume 2.4x vs Binance
Chart: https://www.tradingview.com/chart/?symbol=BINANCE:BTCUSDT
Alert id: #4521  ·  Cooldown: 12h`,
    { size: 18 }
  ),
  P("Dashboard pokazuje to samo + breakdown bar chart per signal + histogram score w czasie + chart price/volume/OI/funding z markerami alertów."),
  H2("5.8 Persist — schema signals"),
  dataTable(
    ["Kolumna", "Typ", "Opis"],
    [
      ["id", "BIGINT", "Auto-increment PK"],
      ["token_id", "VARCHAR (FK)", "CoinGecko ID: 'bitcoin'"],
      ["primary_exchange", "VARCHAR", "CEX z highest signal score"],
      ["primary_symbol", "VARCHAR", "CEX-specific symbol"],
      ["timestamp", "TIMESTAMP", "Moment scoring"],
      ["score", "DOUBLE", "0-100 (CHECK constraint)"],
      ["tier", "INTEGER", "1, 2, 3 (CHECK)"],
      ["breakdown", "JSON", "Per-signal raw + normalized values"],
      ["alert_sent", "BOOLEAN", "Czy alert wysłany (cooldown logic)"],
      ["alert_channels", "JSON", "['telegram', 'dashboard']"],
    ],
    [2400, 2160, 4800],
  ),
  H2("5.9 Cross-validation Modułu 1 (KRYTYCZNE)"),
  P("Nie wdrażamy live Modułu 1 z arbitralnymi wagami. Najpierw evidence że historycznie działało:"),
  bullet("Krok 1: Pull historical klines + funding + OI dla top 100 tokenów (1-2 lata)"),
  bullet("Krok 2: Replay Module 1 scoring na każdej świecy"),
  bullet("Krok 3: Compare alerty (score > threshold) vs realne breakouts (price +20% w 24h od alertu)"),
  bullet("Krok 4: Precision/Recall/F1 per signal weight config"),
  bullet("Krok 5: Tune wagi (grid search lub Bayesian opt)"),
  bullet("Krok 6: Walk-forward sprawdzenie out-of-sample"),
  P("Target: precision > 0.4 (lepsza niż random) na out-of-sample → wdrożenie live. Inaczej iteruj wagi/thresholds.", { italic: true, color: COLOR_MUTED, spacingBefore: 100 }),
  pageBreak(),
);

// ===== STRONA 10-12: Module 2 (Backtest) deep dive =====
children.push(
  H1("6. Module 2 — Backtesting Engine"),
  H2("6.1 Pytanie biznesowe"),
  P("Czy moja strategia ZADZIAŁAŁABY na historycznych pumpach big cap? Cel: walidacja strategii przed wdrożeniem live, oszacowanie ryzyka (max DD, exposure), tuning parametrów."),
  P("Backtest zwraca metrics + lista hipotetycznych trades + HTML raport z wykresami. Anti-overfitting przez walk-forward analysis MANDATORY.", { italic: true, color: COLOR_MUTED }),
  H2("6.2 Komponenty"),
  dataTable(
    ["Plik", "Rola"],
    [
      ["backtest/candles.py", "Pull historical klines z CEX REST (Binance ma do 2017, Bybit od 2020)"],
      ["backtest/universe.py", "Wybór tokenów do backtestu (subset z universe builder, top_100/500/5000)"],
      ["backtest/strategies/base.py", "Strategy interface (Protocol): warmup_bars + on_bar"],
      ["backtest/strategies/breakout_consolidation.py", "Bollinger Squeeze + volume confirmation"],
      ["backtest/strategies/volume_spike.py", "vol > 3x SMA20 + close > prev high"],
      ["backtest/strategies/funding_squeeze.py", "negative funding + price consolidation → long entry"],
      ["backtest/strategies/rsi_divergence.py", "RSI oversold + bullish divergence"],
      ["backtest/slippage.py", "Linear slippage model"],
      ["backtest/fees.py", "Per-CEX fee table"],
      ["backtest/metrics.py", "Sharpe, Sortino, Calmar, max DD, win rate, exposure time"],
      ["backtest/engine.py", "Walk-forward runner"],
    ],
    [3000, 6360],
  ),
  H2("6.3 Strategy interface"),
  code(
`class Strategy(Protocol):
    name: str
    params: dict[str, Any]

    def warmup_bars(self) -> int:
        """Ile świec potrzebne ZANIM strategia może działać (np. 20 dla SMA20)."""

    def on_bar(self, ctx: BacktestContext) -> Optional[Signal]:
        """Wywoływana per bar. Zwraca Signal jeśli wejście, None inaczej."""

# Signal:
{ side: 'buy'|'sell',
  size_usd: float,
  stop_loss_pct: float,
  take_profit_pct: float,
  max_hold_bars: int }`,
    { size: 18 }
  ),
  pageBreak(),
);

children.push(
  H2("6.4 Walk-forward analysis"),
  P("Anti-overfitting protocol mandatory. Standardowy backtest na całym dataset prowadzi do over-fitting (parametry strojone na danych które testują). Walk-forward eliminuje to:"),
  bullet("Train window: 60 dni (parametry optimalizowane)"),
  bullet("Test window: 14 dni (out-of-sample evaluation)"),
  bullet("Slide: 14 dni (przesuwamy całość naprzód)"),
  bullet("Out-of-sample: zawsze ≥ 30% total dataset"),
  bullet("Final score = średnia metrics z wszystkich test windows"),
  H2("6.5 Slippage model"),
  P("Dla CEX big caps (high liquidity), slippage jest niski. Linear model:"),
  code(
`slippage_bps = base_bps + (size_usd / volume_5m_usd) * 10000 * impact_factor

defaults dla CEX:
  base_bps = 2     (0.02% — bid/ask spread crossing dla top tokens)
  impact_factor = 1.5  (size 1% rolling 5m volume = ~150 bps slippage)`,
    { size: 18 }
  ),
  H2("6.6 Fees per CEX"),
  dataTable(
    ["Exchange", "Spot fee taker", "Futures fee taker", "Notes"],
    [
      ["Binance", "0.10%", "0.040%", "VIP 0; może być niższe z BNB discount"],
      ["Bybit", "0.10%", "0.060%", "Standard"],
      ["OKX", "0.10%", "0.050%", "Standard"],
      ["Coinbase", "0.40%", "(brak public futures)", "Spot only"],
    ],
    [2400, 2160, 2400, 2400],
  ),
  H2("6.7 Metryki — co wychodzi z backtestu"),
  dataTable(
    ["Metryka", "Definicja", "Cel"],
    [
      ["Win rate", "wins / total_trades", ">50%"],
      ["Avg PnL", "mean(trade_pnl_pct)", "Positive po fees"],
      ["Total PnL", "sum(trade_pnl_usd)", "Absolute zysk"],
      ["Sharpe", "mean(ret) / std(ret) * √252 (annualized)", ">1 (>2 świetne)"],
      ["Sortino", "Jak Sharpe, denom = downside std", ">1.5"],
      ["Calmar", "annualized_return / max_drawdown", ">2"],
      ["Max DD", "max(peak - trough) / peak", "<25% pref."],
      ["Max DD duration", "Bars between peak and recovery", "Krótko = lepsze"],
      ["Exposure time", "% bars in-position", "30-70% optymalne"],
      ["Trade count", "Liczba completed trades", ">30 dla istotności statystycznej"],
    ],
    [1800, 4500, 3060],
  ),
  pageBreak(),
);

children.push(
  H2("6.8 Universe backtestu"),
  P("Faza 4 start: top 100 tokenów (manageable scale, dobre data quality, ~3-5 lat history dla większości). Następnie ekspansja:"),
  dataTable(
    ["Universe size", "Faza", "Tokens", "Estimated klines", "Backtest time/strategy"],
    [
      ["top_100", "4 (start)", "100", "~150M (5m × 1y × 3 CEX)", "<5 min"],
      ["top_500", "4+", "500", "~750M", "~30 min"],
      ["top_5000", "4++", "5000", "~7.5B", "~5h (parallel)"],
      ["custom", "—", "user-defined", "varies", "varies"],
    ],
    [1500, 800, 1000, 3000, 3060],
  ),
  H2("6.9 HTML report — co user widzi"),
  P("Każdy backtest run produkuje samodzielny HTML plik z plotly wykresami. Zawiera:"),
  bullet("Equity curve (skumulowany PnL w czasie)"),
  bullet("Drawdown chart (underwater curve)"),
  bullet("Per-trade scatter (entry/exit annotated na price chart)"),
  bullet("Distribution PnL per trade (histogram)"),
  bullet("Tabela trades z entry/exit/pnl/duration"),
  bullet("Metrics panel (wszystkie z 6.7)"),
  bullet("Strategy params used (full reproducibility)"),
  bullet("Walk-forward windows breakdown"),
  bullet("Per-token breakdown (które tokeny dawały najwięcej PnL, które najgorsze)"),
  H2("6.10 Strategie — overview"),
  bullet("breakout_consolidation: Bollinger Bands squeeze (band width < 30 percentile) + close > upper band z volume > SMA20×1.5. Long entry, stop 5% poniżej entry, target 15%."),
  bullet("volume_spike: vol > 3x SMA20 + close > 5d high. Entry confirmed by next bar > entry. Trailing stop 7%."),
  bullet("funding_squeeze: avg funding 24h < -0.005% + price w bands ±3% przez 12h + OI rosnący. Long entry, stop 4%, target 12%."),
  bullet("rsi_divergence: RSI(14) < 30 z bullish divergence (price lower low + RSI higher low w ciągu 20 bars). Long entry, stop 6%, target 18%."),
  H2("6.11 Backtest Modułu 1"),
  P("Cross-validation Modułu 1 to drugi tryb backtestu (patrz 5.9). Replay scoring na historical data, pomiar precision/recall sygnałów vs realne breakouts."),
  pageBreak(),
);

// ===== STRONA 13: Paper Trading =====
children.push(
  H1("7. Paper Trading layer"),
  H2("7.1 Cel i zakres"),
  P("Paper trading symuluje rzeczywiste wejścia/wyjścia w bazie danych BEZ dotykania realnego kapitału. Pozwala walidować strategie i sygnały Modułu 1 na real-time data, ale bez ryzyka. Decyzja userowa potwierdzona w Fazie 0."),
  H2("7.2 Architektura"),
  P("Worker subskrybuje INSERT do tabeli signals. Gdy nowy signal score > config.auto_paper_threshold (default: disabled, opt-in):"),
  bullet("Pull current price + 5m volume z CEX REST (best-effort fresh)"),
  bullet("Compute size_usd z portfolio config (default: 1% capital, max $100 per trade)"),
  bullet("Apply slippage: entry_price = current_price * (1 + slippage_bps/10000)"),
  bullet("Apply fee: fee_usd = size_usd * fee_pct (per CEX from fees.py)"),
  bullet("INSERT do paper_trades z status='open'"),
  H2("7.3 Exit logic"),
  P("Trade jest zamknięty gdy któraś z czterech reguł zachodzi:"),
  bullet("stop_loss: cena spadła o X% od entry (default 5%)"),
  bullet("take_profit: cena wzrosła o Y% od entry (default 15%)"),
  bullet("time_stop: trade open dłużej niż max_hold_hours (default 48h)"),
  bullet("manual: user zamknął przez CLI lub dashboard"),
  H2("7.4 PnL accounting"),
  P("Zamknięcie wpisuje exit_ts, exit_price, pnl_usd, pnl_pct, close_reason. Cumulative metrics w dashboardzie liczone on-the-fly z agregacji tabeli paper_trades."),
  H2("7.5 Co NIE robi paper trader"),
  bullet("NIE łączy się z real wallet (brak private keys w systemie)"),
  bullet("NIE wykonuje real swaps (brak Web3 integration)"),
  bullet("NIE zarządza real portfolio"),
  bullet("NIE retoryczna ochrona MEV (paper = brak ryzyka MEV)"),
  pageBreak(),
);

// ===== STRONA 14-15: Output layer =====
children.push(
  H1("8. Output layer — Telegram + Dashboard"),
  H2("8.1 Telegram bot"),
  P("Async bot używający python-telegram-bot v20+. Wysyła alerts + odpowiada na komendy interactive."),
  H3("Komendy"),
  dataTable(
    ["Komenda", "Akcja"],
    [
      ["/start", "Register chat (zapisz chat_id w config)"],
      ["/help", "Lista komend"],
      ["/signals [N]", "Ostatnie N (default 10) sygnałów z Modułu 1"],
      ["/top", "Top tokeny wg score w ostatnich 24h"],
      ["/paper", "Open positions + cumulative PnL summary"],
      ["/backtest <strategy>", "Uruchom backtest na default universe (async, link do raportu)"],
      ["/mute <token>", "Wycisz alerty dla token na 12h"],
      ["/tier <1|2|3>", "Change min alert tier (silenced for tier above)"],
    ],
    [3000, 6360],
  ),
  H3("Rate limiting & dedup"),
  bullet("Cooldown per token zależny od tier (12h/8h/4h)"),
  bullet("Daily cap 30 alerts (config)"),
  bullet("Telegram bot rate limit: 30 msg/s globalny — implementujemy queue + throttle"),
  H2("8.2 FastAPI dashboard"),
  P("Local-only (bind 127.0.0.1:8001), zero auth. Sześć zakładek:"),
  pageBreak(),
);

children.push(
  dataTable(
    ["Zakładka", "Zawartość"],
    [
      ["Universe", "Przegląd ~5000 tokenów z filtrami (tier, market cap, listing count, age)"],
      ["Live Signals", "Tabela auto-refresh (HTMX 30s) + filtry score/tier/timestamp"],
      ["Top Movers", "Top 50 tokenów wg recent score (ostatnie 24h)"],
      ["Paper Trading", "Open positions + closed trades + cumulative PnL chart"],
      ["Backtests", "Historia runs + uruchamianie nowych + inline HTML reports"],
      ["Settings", "View-only display config.yaml + env var status (without values)"],
    ],
    [2400, 6960],
  ),
  H2("8.3 Stack frontend"),
  P("Minimalistyczny — Jinja2 templates + HTMX dla reactivity + Plotly dla charts. Brak React/Vue/Svelte (overkill dla solo dev tool)."),
  H2("8.4 Mockup screen — Live Signals tab"),
  code(
`+--------------------------------------------------------------+
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
+--------------------------------------------------------------+`,
    { size: 16 }
  ),
  pageBreak(),
);

// ===== STRONA 16-17: Phase plan =====
children.push(
  H1("9. Phase plan — roadmap implementacji"),
  H2("9.1 Six fazes overview"),
  dataTable(
    ["Faza", "Cel", "Deliverable", "Tag"],
    [
      ["0 (DONE)", "Plan-as-docs + pivot v0.1.0", "20p DOCX + 8 MD + skeleton + git init + tag", "v0.0.0 / v0.1.0"],
      ["1", "Repo bootstrap", "venv + deps + DB client + logger + CLI stub", "v0.2.0"],
      ["2", "Universe Builder", "CMC + CoinGecko clients + filter pipeline + listing resolver", "v0.3.0"],
      ["3", "CEX REST adapters", "Binance/Bybit/OKX/Coinbase clients (klines+funding+OI)", "v0.4.0"],
      ["4", "Backtesting", "Candles + 4 strategies + walk-forward + reports", "v0.5.0"],
      ["5", "Module 1", "Big Cap Accumulation Detector + cross-validation historical", "v0.6.0"],
      ["6", "Output", "Telegram + Dashboard + Paper Trader", "v0.7.0/v1.0.0"],
    ],
    [800, 1800, 5160, 1600],
  ),
  H2("9.2 Definition of Done — per faza"),
  bullet("All tests pass: pytest -x dev, pytest tests/ pre-commit"),
  bullet("Coverage ≥ 80% (jeśli dotyka kodu hot-path)"),
  bullet("ruff + mypy clean"),
  bullet("PHASES.md checkbox flipped"),
  bullet("CHANGELOG.md zaktualizowany"),
  bullet("Tag git v0.{N}.0"),
  bullet("Demo lokalnie (gdzie możliwe)"),
  H2("9.3 Estymacja timeline"),
  dataTable(
    ["Faza", "Effort", "Calendar"],
    [
      ["0", "Done (1-2 dni)", "Teraz"],
      ["1", "3-5 dni", "+1 tydzień"],
      ["2", "5-7 dni", "+2 tygodnie"],
      ["3", "7-10 dni", "+3 tygodnie"],
      ["4", "10-14 dni", "+1.5 miesiąca"],
      ["5", "10-14 dni", "+2 miesiące"],
      ["6", "10-14 dni", "+3 miesiące"],
    ],
    [1200, 2400, 5760],
  ),
  P("Powyższe są estimates dla solo dev pełen czas. Rzeczywista calendar zależy od dostępności + nieprzewidzianych blockerów (API changes, edge cases, scale challenges przy 5000 tokenów)."),
  pageBreak(),
);

children.push(
  H2("9.4 Risk per faza"),
  dataTable(
    ["Faza", "Risk", "Mitigation"],
    [
      ["1", "Pre-commit hooks za wolne", "Split: ruff/mypy w pre-commit, pytest w pre-push only"],
      ["2", "CMC free tier 333/d za niski", "CoinGecko jako primary, CMC jako monthly cross-check"],
      ["2", "Universe size > expected (10k+)", "Filter aggressive defaults; tune po pierwszym rebuild"],
      ["3", "CEX rate limit hits", "Round-robin 4 CEX + smart cache + per-tier priorytetyzacja"],
      ["3", "Coinbase brak public futures", "Coinbase = spot only universe coverage"],
      ["4", "Backtest overfitting", "Walk-forward MANDATORY, out-of-sample ≥ 30%"],
      ["4", "Storage > 100GB szybciej niż przewidywano", "Partition by month + archive >90 dni do parquet"],
      ["5", "False positive alerts", "Conservative defaults + per-token mute + cross-validation precision target"],
      ["6", "Telegram spam", "Cooldown per tier + daily cap 30"],
    ],
    [800, 3000, 5560],
  ),
  H2("9.5 Anti-regression checklist"),
  P("Wymuszany przed każdym tag (manual + automated):"),
  bullet("Pre-commit hook: pytest -x + ruff check"),
  bullet("Pre-faza-N+1: pytest tests/ (full) + manual demo Fazy N (CLI smoke test)"),
  bullet("Każdy ADR ma sekcję 'What it would break if reversed'"),
  bullet("CHANGELOG.md changes diff > 0 lines (zmuszamy do udokumentowania)"),
  bullet("Tag tylko jeśli git status clean (no uncommitted)"),
  H2("9.6 Co NIE jest w roadmapie (out of scope całkowicie)"),
  bullet("Fresh DEX projects monitor (Pumpfun, Raydium new pairs, Birdeye new tokens)"),
  bullet("Rugpull detection (RugCheck.xyz, GoPlus Security)"),
  bullet("DEX adapters (Dexscreener, Birdeye, Jupiter, Uniswap)"),
  bullet("Per-chain native RPC (Solana web3.py, Ethereum eth_call)"),
  bullet("Real wallet / private keys / on-chain transactions"),
  bullet("Mobile app, multi-user SaaS"),
  bullet("AWS deploy w Fazach 0-6 (lokalne dev)"),
  bullet("Powielanie funkcjonalności parent market_maker"),
  P("Wszystkie powyższe to potencjalna v2 — wymagają osobnej decyzji. Fresh DEX = OSOBNY projekt nie Deep Owl.", { italic: true, color: COLOR_MUTED, spacingBefore: 100 }),
  pageBreak(),
);

// ===== STRONA 18: Tech stack + DB schema =====
children.push(
  H1("10. Tech stack + DB schema"),
  H2("10.1 Stack — co i dlaczego"),
  dataTable(
    ["Warstwa", "Wybór", "Uzasadnienie"],
    [
      ["Język", "Python 3.11+", "Match parent stack, asyncio dla I/O-heavy CEX polling"],
      ["Async", "asyncio + aiohttp", "Standard parent"],
      ["API framework", "FastAPI + uvicorn", "Parent uses it, dashboard reuse pattern"],
      ["Storage", "DuckDB (file-based)", "Embedded, columnar, krytyczne dla skali"],
      ["Candle agg", "numpy + pyarrow", "Parent uses pyarrow, fast columnar"],
      ["HTTP client", "aiohttp + tenacity", "Standard for rate-limited APIs"],
      ["Telegram", "python-telegram-bot v20+", "Async-native, large community"],
      ["Tests", "pytest + pytest-asyncio + pytest-cov", "Parent stack, target 80%+"],
      ["Linting", "ruff + mypy", "Modern, fast, strict mode"],
      ["Config", "pydantic-settings", "Type-safe + .env loading"],
      ["Logging", "stdlib logging + structlog", "Structured for dashboard ingestion"],
    ],
    [1800, 2400, 5160],
  ),
  H2("10.2 Co NIE używamy (świadome decyzje)"),
  bullet("Postgres / MySQL — overhead serwera, nie potrzebujemy multi-writer"),
  bullet("Redis — DuckDB + asyncio queue wystarczą"),
  bullet("Kafka / RabbitMQ — overengineering dla solo dev monolith"),
  bullet("Docker — lokalne dev na razie"),
  bullet("Kubernetes — overkill na zawsze"),
  bullet("React / Vue / Svelte — Jinja2 + HTMX wystarczą dla dashboard"),
  H2("10.3 DB schema — tabele (v0.1.0)"),
  dataTable(
    ["Tabela", "Klucz główny", "Cel"],
    [
      ["_meta", "key", "Schema version + app metadata"],
      ["tokens", "token_id (CoinGecko ID)", "Master tokens recognized"],
      ["token_listings", "(token_id, exchange, symbol)", "Per-CEX listing per token"],
      ["klines_5m", "(exchange, symbol, ts)", "OHLCV 5min z REST API CEX"],
      ["klines_15m", "(exchange, symbol, ts)", "OHLCV 15min"],
      ["funding_history", "(exchange, symbol, ts)", "Funding rate per 8h cycle"],
      ["open_interest", "(exchange, symbol, ts)", "OI snapshot per godzinę"],
      ["signals", "id", "Output Modułu 1 (score + breakdown JSON + tier)"],
      ["paper_trades", "id", "Open + closed positions, simulated PnL"],
      ["backtest_runs", "id", "Metadata per backtest run + metrics JSON"],
    ],
    [2160, 3000, 4200],
  ),
  P("Pełen schema: src/deep_owl/db/schema.sql.", { color: COLOR_MUTED, italic: true }),
  pageBreak(),
);

// ===== STRONA 19: Repo + standards =====
children.push(
  H1("11. Repo structure + standards"),
  H2("11.1 Repo skeleton (po Fazie 0)"),
  code(
`Breakout_signals/
├── .git/                  # standalone repo
├── .gitignore             # data/, logs/, .env, venv/, *.duckdb
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
│   ├── deep_owl_v1.docx   # ten dokument (v0.1.0)
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
    ├── bootstrap.ps1
    └── generate_docx.js   # generator tego dokumentu`,
    { size: 17 }
  ),
  H2("11.2 File hygiene — hard limity"),
  dataTable(
    ["Lokalizacja", "Limit", "Action po przekroczeniu"],
    [
      ["MD w root", "max 8", "Audit + konsolidacja"],
      ["ADR w docs/decisions/", "max 5 w Fazach 0-6", "Sygnał over-engineering"],
      ["Python modules w src/deep_owl/ (top-level)", "max 6", "Wymuszony refactor do podpakietów"],
      ["Lines per Python file", "max 400 (max 800 absolute)", "Split"],
      ["Functions per file", "max 15", "Split"],
      ["Function length", "max 50 linii", "Refactor — extract helpers"],
    ],
    [3500, 1800, 4060],
  ),
  H2("11.3 Git workflow — TLDR"),
  bullet("Branch naming: phase-N/short-slug, fix/short-slug, docs/short-slug"),
  bullet("Direct push do main ZABRONIONY (po Fazie 1 — local pre-commit hook)"),
  bullet("PR-only flow: gh pr create → self-review → squash merge"),
  bullet("Conventional Commits: feat/fix/refactor/docs/test/chore/perf"),
  bullet("Tag per faza: v0.{N}.0"),
  bullet("ZAKAZANE: --no-verify, --amend na pushed, push --force na main"),
  pageBreak(),
);

// ===== STRONA 20: Risk + future =====
children.push(
  H1("12. Risk register + future expansions"),
  H2("12.1 Top risks"),
  dataTable(
    ["Risk", "Likelihood", "Impact", "Mitigation"],
    [
      ["CEX API change/rate limit", "Medium", "High", "Per-CEX fallback (4 priorytetów), monitoring 429"],
      ["DuckDB > 100GB (slow queries)", "Medium (rok+)", "Medium", "Partition by month, archive starsze >90d do parquet"],
      ["Backtest overfitting", "High", "High", "Walk-forward MANDATORY, out-of-sample ≥ 30%"],
      ["False positive alerts (Module 1)", "High", "Medium", "Cross-validation pre-deployment, tier-aware threshold"],
      ["Telegram bot spam", "Medium", "Low", "Cooldown per tier, daily cap 30"],
      ["CLAUDE.md drift vs reality", "Medium", "Medium", "Co fazę: re-read i update jeśli stale"],
      ["CMC free tier 333/d niewystarczający", "Medium", "Low", "CoinGecko jako primary, CMC tylko miesięczny cross-check"],
      ["CoinGecko free 30/min za niski", "Low", "Medium", "Pro tier $129/mo jeśli wymusi (Faza 2 evaluation)"],
      ["Solo dev burnout", "Medium", "High", "Phase plan jako commitment device, CHANGELOG jako evidence"],
    ],
    [3000, 1300, 1300, 3760],
  ),
  H2("12.2 Future expansions (v2+)"),
  bullet("Auto-trading: real wallet via CEX private API (Binance/Bybit/OKX trade endpoint)"),
  bullet("On-chain analytics integration (Glassnode/Dune/Nansen) — exchange flows, whale wallet tracking"),
  bullet("News feed integration (CryptoPanic, Twitter API v2 paid)"),
  bullet("Strategy ensemble: Module 1 score + technical signals + news → meta-classifier"),
  bullet("Kelly criterion position sizing (zamiast fixed %)"),
  bullet("Multi-user SaaS: per-user portfolio, shared signals, premium tiers"),
  bullet("Mobile push notifications (Pushover, Pushbullet) jako alternatywa Telegram"),
  bullet("AWS deploy: parent ma AWS Tokyo Lightsail, sister deploy"),
  bullet("Fresh DEX monitor jako OSOBNY projekt (Pumpfun, Raydium, Birdeye)"),
  H2("12.3 Wniosek końcowy"),
  P("Deep Owl v0.1.0 jest big caps CEX-first tool: ~5000 established tokenów z CMC/CoinGecko po filtrowaniu, 4 prioritized CEX-y (Binance/Bybit/OKX/Coinbase) jako primary data source, 2 moduły (accumulation detector + backtester), tier-aware scoring (top 100 strict, top 5000 soft), paper trading first, no real wallet w fazach 0-6."),
  P("Faza 0 zamknięta dwoma tagami: v0.0.0 (initial DEX-first plan, deprecated) + v0.1.0 (pivot na big caps CEX-first). Faza 1+ to rzeczywista implementacja z wyraźnymi deliverables i acceptance criteria. Sukces mierzony tagami git, CHANGELOG entries, oraz precision/recall Modułu 1 na cross-validation — nie linijkami kodu."),
  P("End of v0.1.0 architecture document.", { italic: true, color: COLOR_MUTED, align: AlignmentType.CENTER, spacingBefore: 400 }),
);

// ===== Document config =====

const doc = new Document({
  creator: "Deep Owl",
  title: "Deep Owl - Breakout Signals Bot - Architecture & Roadmap v0.1.0",
  description: "Architektura + roadmap + standardy projektu Deep Owl (Faza 0 deliverable, big caps CEX-first)",
  styles: {
    default: {
      document: { run: { font: FONT, size: 22 } },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: FONT, color: COLOR_PRIMARY },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: FONT, color: COLOR_ACCENT },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: FONT, color: COLOR_PRIMARY },
        paragraph: { spacing: { before: 160, after: 100 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 540, hanging: 270 } } },
          },
          {
            level: 1, format: LevelFormat.BULLET, text: "-", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1080, hanging: 270 } } },
          },
        ],
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({
            text: "Deep Owl · Big Caps CEX-First · v0.1.0",
            italics: true, size: 18, color: COLOR_MUTED, font: FONT,
          })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Strona ", size: 18, color: COLOR_MUTED, font: FONT }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLOR_MUTED, font: FONT }),
            new TextRun({ text: " z ", size: 18, color: COLOR_MUTED, font: FONT }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLOR_MUTED, font: FONT }),
          ],
        })],
      }),
    },
    children,
  }],
});

const outputPath = path.join(__dirname, "..", "docs", "deep_owl_v1.docx");
const fallbackPath = path.join(__dirname, "..", "docs", "deep_owl_v0_1_0.docx");
Packer.toBuffer(doc).then((buffer) => {
  try {
    fs.writeFileSync(outputPath, buffer);
    console.log(`OK: ${outputPath}`);
    console.log(`Size: ${buffer.length} bytes`);
  } catch (e) {
    if (e.code === "EBUSY") {
      console.warn(`Primary path ${outputPath} is locked — writing to ${fallbackPath} instead`);
      fs.writeFileSync(fallbackPath, buffer);
      console.log(`OK (fallback): ${fallbackPath}`);
      console.log(`Size: ${buffer.length} bytes`);
      console.log("Zamknij plik deep_owl_v1.docx w Word/edytorze i uruchom ponownie zeby nadpisac primary path.");
    } else {
      throw e;
    }
  }
});
