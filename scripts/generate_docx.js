// Deep Owl — DOCX generator (Faza 0 deliverable)
// Run: node scripts/generate_docx.js
// Output: docs/deep_owl_v1.docx (20 stron, polski, professional styling)

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, PageOrientation, LevelFormat,
  TabStopType, TabStopPosition, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak,
} = require("docx");

// ====== Helpers ======

const FONT = "Calibri";
const COLOR_PRIMARY = "1F4E79";   // navy
const COLOR_ACCENT = "2E75B6";    // blue
const COLOR_MUTED = "595959";     // dark gray
const COLOR_TABLE_HEADER = "1F4E79";
const COLOR_TABLE_HEADER_BG = "D9E2F3";
const COLOR_TABLE_BG_ALT = "F2F2F2";

const PAGE_WIDTH = 12240;   // US Letter
const PAGE_HEIGHT = 15840;
const MARGIN = 1440;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;  // 9360

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

// ====== Content sections ======

const children = [];

// === STRONA 1: Cover + Executive Summary ===
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
    spacing: { after: 800 },
    children: [new TextRun({
      text: "Architektura · Roadmap · Standardy · v1",
      italics: true, size: 26, color: COLOR_MUTED, font: FONT,
    })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 1200 },
    children: [new TextRun({ text: "Faza 0 — Plan-as-docs · 2026-05-15", size: 22, color: COLOR_MUTED, font: FONT })],
  }),
  divider(200),
  H2("Executive Summary"),
  P("Deep Owl to bot do wykrywania sygnałów breakout w krypto, składający się z trzech komplementarnych modułów:"),
  bullet("Module 1 — Early Accumulation Detector: wykrywa cichą akumulację tokenów na DEX-ach ZANIM nastąpi pump, łącząc sygnały wolumetryczne, LP depth, holder distribution, buy/sell pressure i opcjonalnie social mentions w jeden ważony score 0-100."),
  bullet("Module 2 — Fresh Projects Monitor: śledzi świeże launche multi-chain, filtruje rugpulle przez RugCheck.xyz oraz GoPlus Security, i scoruje rokowanie w lifecycle stages 0-4 (od 0-1h do 7-30d)."),
  bullet("Module 3 — Backtesting Engine: weryfikuje strategie breakout (Bollinger Squeeze, Volume Spike, RSI Divergence) na historycznych danych 5/15-min OHLCV z parent CEX recordera (BTC/ETH/HYPE od 2026-04-08), używając walk-forward analysis dla anti-overfitting."),
  P("Output: Telegram alerts + Web dashboard (FastAPI :8001) + paper trading z symulowanym slippage i fees. Bez realnego kapitału w Fazach 0-6.", { spacingBefore: 100 }),
  P("Stack: Python 3.11+, asyncio, DuckDB embedded, Pydantic v2, FastAPI. Deployment: lokalne dev (AWS w roadmap v2). Solo dev tool, standalone repo bez koligacji z parent market_maker."),
  pageBreak(),
);

// === STRONA 2: Glossary ===
children.push(
  H1("1. Glossary — terminy i skróty"),
  P("Definicje terminów pojawiających się w tym dokumencie. Pomocne dla recenzentów spoza świata krypto/trading.", { italic: true, color: COLOR_MUTED }),
  dataTable(
    ["Termin", "Definicja"],
    [
      ["DEX", "Decentralized Exchange — giełda DeFi (np. Raydium, Uniswap, PancakeSwap), brak custody."],
      ["CEX", "Centralized Exchange — Binance, Coinbase, Bybit. Kapitał trzymany przez giełdę."],
      ["LP", "Liquidity Pool — pula tokenów dostarczająca płynność na DEX. LP locked = anti-rug zabezpieczenie."],
      ["OHLCV", "Open / High / Low / Close / Volume — standardowy format świecy (candle) na rynkach."],
      ["TWAP / VWAP", "Time/Volume-Weighted Average Price — mid-price ważony czasem lub wolumenem."],
      ["Slippage", "Różnica między oczekiwaną ceną wejścia a ceną realnie uzyskaną. Rośnie z size i niskim depth."],
      ["MEV", "Maximal Extractable Value — front-running/sandwich attacks na DEX. Mitigated przez private mempools."],
      ["Rugpull", "Scam: dev wycofuje płynność lub sprzedaje supply, zostawiając tradera bez wyjścia."],
      ["FDV", "Fully Diluted Valuation — cena × total supply (ile token byłby wart przy pełnej dystrybucji)."],
      ["Walk-forward", "Backtest gdzie train + test okna przesuwają się w czasie — eliminuje look-ahead bias."],
      ["Sharpe Ratio", "(mean_return / std_return) annualizowany. Risk-adjusted return. >1 dobry, >2 świetny."],
      ["Max Drawdown", "Największy spadek od peak do trough w equity curve. Krytyczna metryka risk."],
      ["Score 0-100", "Output Modułu 1 — ważona suma znormalizowanych sygnałów. Próg alertu domyślnie 65."],
      ["Lifecycle stage", "Klasyfikacja świeżego tokena wg wieku: Stage 0 (0-1h) do Stage 4 (7-30d)."],
      ["Honeypot", "Token gdzie można kupić ale NIE można sprzedać (ukryty mechanizm w smart contract)."],
      ["Mint authority", "Solana SPL — kto może drukować nowe tokeny. Renounced = zniesiona = anti-inflation."],
      ["Pump & Dump", "Skoordynowane pompowanie ceny + masowy sell-off. Cel Modułu 1: złapać akumulację PRZED pump."],
      ["DuckDB", "Embedded analytics DB (jak SQLite ale columnar). 1-file backup, świetne dla backtest."],
      ["Pydantic v2", "Type-safe modele dla configów + API responses. Walidacja przy parsowaniu."],
      ["Async / asyncio", "Współbieżność I/O w Pythonie. Krytyczne dla pollingu API z rate limitami."],
    ],
    [2400, 6960],
  ),
  pageBreak(),
);

// === STRONA 3-4: Architecture overview ===
children.push(
  H1("2. Architektura systemu"),
  H2("2.1 Layered architecture"),
  P("Deep Owl jest aplikacją monolityczną podzieloną na 6 warstw o jasnych zależnościach. Każda warstwa zna tylko warstwy poniżej — to upraszcza testowanie i refactor."),
  dataTable(
    ["Warstwa", "Odpowiedzialność", "Lokalizacja"],
    [
      ["Data adapters", "I/O do external API + parent recorder. Normalizacja do common models.", "src/deep_owl/data/"],
      ["Storage", "DuckDB persistence + schema migrations.", "src/deep_owl/db/"],
      ["Engine modules", "Logika biznesowa: scoring, lifecycle, backtest.", "src/deep_owl/modules/"],
      ["Output", "Telegram bot, FastAPI dashboard, paper trader.", "src/deep_owl/output/"],
      ["CLI", "Entry points: deep-owl discover, backtest, serve.", "src/deep_owl/cli.py"],
      ["Config", "Pydantic Settings + .env loading.", "src/deep_owl/config.py"],
    ],
    [1800, 5160, 2400],
  ),
  H2("2.2 Trzy moduły core"),
  P("System składa się z trzech równoległych modułów silnika (Module 1, 2, 3), które działają niezależnie ale współdzielą Storage layer (DuckDB):"),
  bullet("Module 1 (Accumulation Detector): poller co 60s pobiera snapshoty tokenów z Dexscreener/Birdeye → liczy 7 sygnałów per token → ważona suma → score 0-100. Score > 65 generuje rekord w tabeli signals i kandyduje do Telegram alert (z cooldown 6h per token)."),
  bullet("Module 2 (Fresh Projects Monitor): poller co 5 min po nowych parach Dexscreener → Stage 0 rugpull check (RugCheck/GoPlus) → kandydaci promowani do tabeli fresh_projects → tracking przez 30 dni z growth scoringiem."),
  bullet("Module 3 (Backtesting Engine): off-line tool. CLI command 'deep-owl backtest --strategy X --symbol Y --days N' agreguje tick data z parent recordera do candles_5m/15m, uruchamia Strategy interface, generuje HTML raport z metrics (Sharpe, max DD, win rate)."),
  H2("2.3 Data flow — sygnał live"),
  P("Pełny flow od polling DEX do Telegram alert (dla Module 1):"),
  bullet("Krok 1: asyncio task pobiera top 500 trending tokens z Dexscreener (rate limit: 60 req/min)."),
  bullet("Krok 2: per token, normalize response do TokenSnapshot (Pydantic v2 model)."),
  bullet("Krok 3: upsert do tokens master + insert nowy snapshot (time-series)."),
  bullet("Krok 4: Module 1 czyta ostatnie 7 dni snapshotów per token, liczy sygnały."),
  bullet("Krok 5: weighted sum → score. Jeśli score > 65 i token nie ma alert w ostatnich 6h → INSERT do signals."),
  bullet("Krok 6: alert worker wysyła Telegram message + dashboard subscriber dostaje push."),
  bullet("Krok 7: opcjonalnie paper trader otwiera simulated position (jeśli ENABLE_AUTO_PAPER w config)."),
  pageBreak(),
);

// === STRONA 4: Diagram flow ===
children.push(
  H2("2.4 Diagram architektury — schemat blokowy"),
  P("Schemat poniżej pokazuje uproszczone relacje między warstwami i zewnętrznymi systemami.", { italic: true, color: COLOR_MUTED }),
  new Paragraph({
    spacing: { before: 200, after: 200 },
    alignment: AlignmentType.LEFT,
    children: [new TextRun({
      text:
`+--------------------------------------------------------------+
|                  DEEP OWL (standalone repo)                  |
+--------------------------------------------------------------+
                              |
        +---------------------+---------------------+
        |                     |                     |
   +----v-----+         +-----v-----+         +-----v-----+
   |  DATA    |         |  ENGINE   |         |  OUTPUT   |
   |  LAYER   |         |  LAYER    |         |  LAYER    |
   +----------+         +-----------+         +-----------+
   Dexscreener API      Module 1                Telegram bot
   Birdeye API          (Accumulation)          FastAPI :8001
   Parent CEX recorder  Module 2                Paper Trader
   Social scanner       (Fresh)                 (sim PnL)
   RugCheck + GoPlus    Module 3
                        (Backtest)
                              |
                       +------v------+
                       |   STORAGE   |
                       |   DuckDB    |
                       +-------------+
                       tokens · signals
                       fresh_projects
                       paper_trades
                       candles_5m/15m
                       backtest_runs`,
      font: "Consolas", size: 18, color: COLOR_MUTED,
    })],
  }),
  H2("2.5 Decyzje architektoniczne i ich uzasadnienia"),
  dataTable(
    ["Decyzja", "Wybór", "Alternatywa", "Rationale"],
    [
      ["Język", "Python 3.11+", "Rust dla perf", "Match parent stack, asyncio dla I/O-heavy, Pydantic v2."],
      ["DB", "DuckDB", "Postgres / SQLite", "Embedded, columnar, świetne dla backtest, 1-file backup, brak serwera."],
      ["Chains", "Multi-chain agregat", "Per-chain native", "Dexscreener pokrywa 200+ chains, mniej do utrzymania."],
      ["Output", "Sygnały + paper trading", "Auto-trading", "Wybór userowy, niskie ryzyko, dłuższe testy bez kapitału."],
      ["Repo", "Standalone", "Worktree parent", "Czysta izolacja od market_maker context bleed."],
      ["Backtest data", "Parent CEX recorder", "Birdeye paid", "Mamy dane od 2026-04-08, $0 koszt początkowy."],
      ["Telegram lib", "python-telegram-bot v20", "aiogram", "Większa community, więcej przykładów."],
    ],
    [1700, 1900, 1900, 3860],
  ),
  pageBreak(),
);

// === STRONA 5: Data sources matrix ===
children.push(
  H1("3. Data sources — matryca źródeł danych"),
  P("Wszystkie źródła z których czerpie Deep Owl. Per faza wskazane jest, kiedy adapter staje się aktywny."),
  H2("3.1 Quick reference"),
  dataTable(
    ["#", "Źródło", "Faza", "Auth", "Rate limit (free)", "Koszt"],
    [
      ["1", "Dexscreener", "2", "None", "60 req/min", "$0"],
      ["2", "Birdeye", "2", "API key", "30 req/min (free)", "$0 free / $99/mo growth"],
      ["3", "Parent CEX recorder", "3", "filesystem", "—", "$0 (zebrane)"],
      ["4", "RugCheck.xyz", "5", "None", "~30 req/min", "$0"],
      ["5", "GoPlus Security", "5", "None", "30 req/min", "$0"],
      ["6", "Telegram Bot API", "6", "Bot token", "30 msg/s per bot", "$0"],
      ["7", "Social_media_scanner (parent)", "4 opt", "parent venv", "—", "$0"],
    ],
    [600, 2400, 600, 1200, 2160, 2400],
  ),
  H2("3.2 Strategie fallback i degradacji"),
  P("Każdy primary source ma fallback. Jeśli oba zawodzą — sygnał oparty na tym źródle wyłączony, waga rozdystrybuowana do pozostałych:"),
  bullet("token_overview: dexscreener → birdeye → SKIP (token nie ingestowany)"),
  bullet("holders top10: birdeye_growth → manual SKIP (free tier ma tylko top 10, growth $99/mo dla pełnej listy)"),
  bullet("rugpull_solana: rugcheck → manual review queue"),
  bullet("rugpull_evm: goplus → manual review queue"),
  bullet("social: parent_scanner → SKIP (waga 0, redystrybucja do innych signals)"),
  H2("3.3 Sekrety — gdzie trzymać"),
  P("Wszystkie API keys i tokens TYLKO w pliku .env (gitignored). Template .env.example committed bez wartości:"),
  bullet("BIRDEYE_API_KEY — Faza 2 (opcjonalne), Faza 4 (mandatory dla holders)"),
  bullet("TELEGRAM_BOT_TOKEN — Faza 6"),
  bullet("TELEGRAM_CHAT_ID — Faza 6"),
  bullet("PARENT_RECORDER_DATA_PATH — pełna ścieżka do D:/Crypto/Claude/data (read-only access)"),
  P("Brak innych sekretów na obecnym etapie. Dexscreener, RugCheck, GoPlus są zupełnie public.", { color: COLOR_MUTED, italic: true }),
  pageBreak(),
);

// === STRONA 6-8: Module 1 deep dive ===
children.push(
  H1("4. Module 1 — Early Accumulation Detector"),
  H2("4.1 Pytanie biznesowe"),
  P("Czy ten token akumuluje się PRZED pumpem? Cel: złapać moment, w którym whales i smart money cicho budują pozycje, ZANIM publiczność zauważy ruch ceny."),
  P("Naturalny insight: prawdziwa akumulacja zwykle pokazuje wzrost wolumenu PRZY płaskiej lub lekko spadającej cenie (smart money kupuje od wystraszonych). To jeden z najbardziej kontr-intuicyjnych sygnałów dla retail tradera, ale jeden z najbardziej trafnych historycznie.", { italic: true, color: COLOR_MUTED }),
  H2("4.2 Sygnały — siedem źródeł evidence"),
  P("Każdy sygnał zwraca wartość znormalizowaną do [0, 1] (sigmoid od threshold). Następnie ważona suma daje score 0-100:"),
  dataTable(
    ["#", "Sygnał", "Metoda", "Threshold", "Waga"],
    [
      ["1", "Volume rising on flat/down price", "vol_24h / vol_7d_avg > 2.0 ORAZ price_chg_24h ∈ [-5%, +5%]", ">2.0 + |Δp|<5%", "0.20"],
      ["2", "LP depth growth", "liquidity_usd[now] - liquidity_usd[24h_ago] > +20%", "+20%", "0.15"],
      ["3", "Holder count growth", "holders[now] / holders[24h_ago] > 1.15", "+15%", "0.15"],
      ["4", "Top-10 wallet concentration drop", "top10_pct[now] - top10_pct[24h_ago] < -3pp", "-3pp", "0.10"],
      ["5", "Buy/sell tx ratio", "buys_1h / sells_1h > 1.3", "1.3", "0.15"],
      ["6", "Social mention velocity (opt)", "mentions_1h / mentions_24h_avg > 3.0", "3.0", "0.15"],
      ["7", "CEX bid imbalance (opt)", "bid_volume / ask_volume > 1.5 (orderbook L5)", "1.5", "0.10"],
    ],
    [400, 2300, 3960, 1500, 1200],
  ),
  P("Suma wag = 1.00. Jeśli sygnał nie jest dostępny (np. token tylko-DEX → CEX bid imbalance niedostępny), jego waga jest redystrybuowana proporcjonalnie do pozostałych aktywnych sygnałów."),
  H2("4.3 Score formula"),
  P("Pseudocode scoring procedury:"),
  new Paragraph({
    spacing: { before: 100, after: 200 },
    children: [new TextRun({
      text:
`score = 0
total_weight = 0
for signal in active_signals:
    norm = sigmoid((signal.value - signal.threshold) / signal.scale)
    score += norm * signal.weight
    total_weight += signal.weight
score = (score / total_weight) * 100  # normalize to 0-100
return score`,
      font: "Consolas", size: 20,
    })],
  }),
  P("sigmoid() używana zamiast clip([0,1]) bo daje miękkie przejście i lepiej współpracuje z weighted sum (sygnał lekko poniżej thresholdu nadal daje 0.4-0.5, nie ostre 0)."),
  pageBreak(),
);

children.push(
  H2("4.4 Universe — co skanujemy"),
  P("Universe Modułu 1 to zbiór tokenów aktualnie monitorowanych. Compounded z trzech źródeł:"),
  bullet("Top 500 trending z Dexscreener (endpoint /token-profiles/latest/v1)"),
  bullet("Nowe pary z liquidity > $10k (cross-reference z Module 2)"),
  bullet("Tokeny manualnie dodane przez user przez CLI: deep-owl watch <address>"),
  P("Filtr wykluczeń: blacklisted tokens (tabela tokens.is_blacklisted = TRUE) — automatycznie z rugpull check Modułu 2 lub manualne mute.", { spacingBefore: 100 }),
  H2("4.5 Cadence — częstotliwość skanowania"),
  dataTable(
    ["Komponent", "Interval", "Rationale"],
    [
      ["Dexscreener trending poll", "60s", "Wystarczająco dla early-stage; rate limit 60/min."],
      ["Birdeye top-up (Solana)", "5 min", "Free tier 30/min; oszczędzamy quota dla holders endpoint."],
      ["Module 1 scoring", "60s (po pollingu)", "Świeży snapshot → świeży score; minimal latency."],
      ["Telegram alert send", "Async, po INSERT signal", "Nie blokuje pollingu; cooldown 6h per token."],
    ],
    [3000, 2160, 4200],
  ),
  H2("4.6 Threshold tuning — backtest informuje config"),
  P("Wagi i thresholds w config.yaml NIE są arbitralne. Każdy threshold ma być dostrojony przez:"),
  bullet("Backtest sygnałów na 30+ historycznych przypadkach pumpów (z Module 3 candles)"),
  bullet("Walk-forward: train weights na 60 dniach, test na 14, slide"),
  bullet("Out-of-sample sprawdzenie czy alerty BYŁY przed pumpami (precision) vs ile pumpów przegapiliśmy (recall)"),
  bullet("Default values w skeleton są punktem startu — pierwsza iteracja Fazy 4 dostraja je danymi"),
  H2("4.7 Edge cases i znane ograniczenia"),
  bullet("False positive: bot trading może symulować akumulację (high volume, brak holder growth → cross-check pomaga)"),
  bullet("False positive: airdrop farming generuje sztuczny holder growth (filter: holders bez tx history excluded)"),
  bullet("Missed signal: bardzo szybki pump (5-10 min) — między pollingami; mitigation: zwiększyć cadence dla flagged tokens"),
  bullet("Missed signal: pump driven czysto przez news (no on-chain accumulation) — out of scope, rozważyć news feed w v2"),
  bullet("CEX-only token nie ma DEX signals — fallback na CEX-only sygnały (volume profile + bid imbalance)"),
  pageBreak(),
);

children.push(
  H2("4.8 Output — schemat alert message"),
  P("Format wiadomości Telegram + wpis w dashboard:"),
  new Paragraph({
    spacing: { before: 100, after: 200 },
    children: [new TextRun({
      text:
`[score: 78/100] SOL: $BONK
DEX: Raydium  Liquidity: $2.1M  Volume 24h: $890k
Signals:
  - vol +245% on flat price (+1.2%)
  - LP +32% (24h)
  - holders +18%
  - buy/sell 1h: 1.7x
Chart: https://dexscreener.com/solana/{pair}
Alert id: #1234  ·  Cooldown: 6h`,
      font: "Consolas", size: 20,
    })],
  }),
  P("Dashboard pokazuje to samo + breakdown bar chart per signal + histogram score w czasie + chart price/volume z markerami alertów."),
  H2("4.9 Persist — co trafia do DuckDB"),
  P("Każdy run scoring (co 60s) generuje snapshot do tokens, ale wpisy do signals tworzone TYLKO gdy score >= alert_threshold (default 65). Tabela signals zawiera:"),
  dataTable(
    ["Kolumna", "Typ", "Opis"],
    [
      ["id", "BIGINT", "Auto-increment PK"],
      ["token_address", "VARCHAR (FK)", "Chain-prefixed: 'solana:...'"],
      ["timestamp", "TIMESTAMP", "Moment scoring"],
      ["score", "DOUBLE", "0-100 (CHECK constraint)"],
      ["breakdown", "JSON", "Per-signal raw + normalized values + ważone wkłady"],
      ["alert_sent", "BOOLEAN", "Czy alert został wysłany (cooldown logic)"],
      ["alert_channels", "JSON", "Lista kanałów: ['telegram', 'dashboard']"],
    ],
    [2400, 2160, 4800],
  ),
  H2("4.10 Roadmap iteracji Modułu 1"),
  bullet("v0.4.0 (Faza 4): MVP z domyślnymi wagami, backtest scoringu na 30 historycznych pumpach"),
  bullet("v0.4.1: Tuning wag na podstawie precision/recall"),
  bullet("v0.4.2: Dodanie sygnału #6 social velocity (parent scanner integration)"),
  bullet("v0.4.3: Dodanie sygnału #7 CEX bid imbalance (parent recorder cross)"),
  bullet("v0.5.0+: Per-chain sub-tuning (Solana inny vs EVM inny)"),
  pageBreak(),
);

// === STRONA 9-10: Module 2 deep dive ===
children.push(
  H1("5. Module 2 — Fresh Projects Monitor"),
  H2("5.1 Pytanie biznesowe"),
  P("Czy ten świeży token rokuje, czy to rugpull? Cel: filtrować szum z setek nowych launches dziennie i znaleźć kandydatów wartych dalszego trackingu w Module 1."),
  H2("5.2 Lifecycle stages"),
  P("Każdy świeży token przechodzi przez 5 stages. W każdym wykonujemy inne checks:"),
  dataTable(
    ["Stage", "Wiek", "Filter / Action"],
    [
      ["0", "0-1h", "Rugpull check (BLOKUJĄCY — fail = exclude z dalszego trackingu)"],
      ["1", "1-6h", "Initial validation (early growth indicators, 2x re-check rugpull)"],
      ["2", "6-24h", "Survival window (czy nie umarł? volume nie spadł >70%?)"],
      ["3", "1-7d", "Growth phase (najbardziej interesujący dla Module 1 handoff)"],
      ["4", "7-30d", "Maturity check (graduacja do 'established', exit z Fresh universe)"],
    ],
    [800, 1200, 7360],
  ),
  H2("5.3 Rugpull filter — Stage 0"),
  P("Token wykluczony jeśli SPEŁNIA którekolwiek z poniższych. Wykorzystujemy RugCheck.xyz dla Solana SPL i GoPlus Security dla EVM tokens."),
  bullet("Liquidity NOT locked (LP token nie burned ani w lockerze)"),
  bullet("Mint authority NOT renounced (Solana SPL — dev może wydrukować nową supply)"),
  bullet("Top-1 holder > 25% supply (concentrated risk)"),
  bullet("Liquidity < $5,000 USD (manipulable, exit slippage > 50%)"),
  bullet("Dev wallet sprzedał > 50% holdings w ostatnich 24h (red flag)"),
  bullet("Honeypot detected (GoPlus is_honeypot=true — można kupić, nie można sprzedać)"),
  bullet("Buy tax LUB sell tax > 10% (rug-via-fees)"),
  bullet("Hidden owner LUB can_take_back_ownership flagi (GoPlus)"),
  H2("5.4 Growth scoring — Stage 1+"),
  P("Po przejściu Stage 0, token dostaje growth_score 0-100 który jest re-liczone z każdym snapshot:"),
  new Paragraph({
    spacing: { before: 100, after: 200 },
    children: [new TextRun({
      text:
`growth_score = w1*volume_velocity      # vol[1h]/vol[24h_avg]
             + w2*holder_growth         # %change holders 24h
             + w3*liquidity_stability   # 1 - max_liq_drop_pct
             + w4*buy_pressure          # buys/sells ratio
             + w5*social_pickup         # mention velocity (opt)
default weights: w1..w5 = 0.20 (równe)`,
      font: "Consolas", size: 20,
    })],
  }),
  pageBreak(),
);

children.push(
  H2("5.5 Handoff do Module 1"),
  P("Tokeny które osiągnęły Stage 2+ i mają growth_score > 60 są automatycznie dodawane do universe Modułu 1. Module 1 wykonuje na nich pełny accumulation scoring (siedem sygnałów)."),
  P("To dwustopniowa pipeline: Module 2 jest sieve (filtruje 99% śmieci z setek launchów), Module 1 jest decision engine (scoruje obiecujących kandydatów)."),
  H2("5.6 Persist — fresh_projects schema"),
  dataTable(
    ["Kolumna", "Typ", "Opis"],
    [
      ["token_address", "VARCHAR (FK)", "Chain-prefixed"],
      ["snapshot_ts", "TIMESTAMP", "Composite PK z token_address"],
      ["lifecycle_stage", "INTEGER", "0-4 (CHECK)"],
      ["growth_score", "DOUBLE", "0-100"],
      ["rugpull_flags", "JSON", "{is_honeypot, lp_locked, mint_renounced, ...}"],
      ["rugpull_excluded", "BOOLEAN", "TRUE = nie używamy więcej w Module 1"],
      ["holder_count", "INTEGER", "Snapshot top-1 i count"],
      ["liquidity_usd", "DOUBLE", "Total LP liquidity"],
      ["volume_24h_usd", "DOUBLE", "Volume 24h USD"],
      ["top1_holder_pct", "DOUBLE", "Concentration metric"],
    ],
    [2400, 2160, 4800],
  ),
  H2("5.7 Edge cases"),
  bullet("Migracja z Pumpfun → Raydium (Solana): token zmienia kontrakt — śledzimy oba przez okres przejścia"),
  bullet("Bridge tokens: ten sam token na różnych chainach — traktujemy jako osobne (different liquidity, different communities)"),
  bullet("Dev re-launch: ten sam dev wypuszcza wersję 2/3/4 — manual blacklist po N rugpullach (config: max_dev_rug_count=2)"),
  bullet("Stealth launch (no marketing): może wymknąć się z trending feedu — fallback Birdeye scan all new tokens (Solana)"),
  H2("5.8 Roadmap iteracji Modułu 2"),
  bullet("v0.5.0 (Faza 5): MVP z RugCheck + GoPlus, lifecycle stages 0-4, growth score"),
  bullet("v0.5.1: Dev wallet tracking (cross-token correlation — jeśli dev rugpullował X razy → blacklist)"),
  bullet("v0.5.2: Pumpfun → Raydium migration tracking (Solana specific)"),
  bullet("v0.5.3: Bridge token clustering (cross-chain identity)"),
  pageBreak(),
);

// === STRONA 11-13: Module 3 deep dive ===
children.push(
  H1("6. Module 3 — Backtesting Engine"),
  H2("6.1 Pytanie biznesowe"),
  P("Czy moja strategia ZADZIAŁAŁABY na historycznych pumpach? Cel: walidacja strategii przed wdrożeniem live, oszacowanie ryzyka (max DD, exposure), tuning parametrów."),
  P("Backtest zwraca metrics + lista hipotetycznych trades + HTML raport z wykresami. Nie jest to optymalizacja per-se (anti-overfitting przez walk-forward), tylko evidence że strategia ma edge.", { italic: true, color: COLOR_MUTED }),
  H2("6.2 Komponenty"),
  dataTable(
    ["Plik", "Rola"],
    [
      ["backtest/candles.py", "Aggregator: czyta tick zst z parent recordera, buduje OHLCV 5/15m, zapisuje do DuckDB"],
      ["backtest/strategies/base.py", "Strategy interface (Protocol): warmup_bars + on_bar"],
      ["backtest/strategies/breakout_consolidation.py", "Bollinger Squeeze + volume confirmation"],
      ["backtest/strategies/volume_spike.py", "vol > 3x SMA20 + close > prev high"],
      ["backtest/strategies/rsi_divergence.py", "RSI oversold + bullish divergence"],
      ["backtest/slippage.py", "Linear slippage model: base_bps + (size/liquidity)*impact"],
      ["backtest/fees.py", "Per-exchange fee table"],
      ["backtest/metrics.py", "Sharpe, Sortino, Calmar, max DD, win rate, exposure time"],
      ["backtest/engine.py", "Walk-forward runner — train/test windows + slide"],
    ],
    [3000, 6360],
  ),
  H2("6.3 Strategy interface"),
  P("Strategy implementuje Protocol z dwoma metodami. Dzięki temu można dodawać własne strategie bez zmiany engine."),
  new Paragraph({
    spacing: { before: 100, after: 200 },
    children: [new TextRun({
      text:
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
      font: "Consolas", size: 18,
    })],
  }),
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
  P("Realistyczny model wpływa na trafność backtestu. Linear approximation:"),
  new Paragraph({
    spacing: { before: 100, after: 200 },
    children: [new TextRun({
      text:
`slippage_bps = base_bps + (size_usd / liquidity_usd) * 10000 * impact_factor

defaults:
  base_bps = 5      (0.05% — bid/ask spread crossing)
  impact_factor = 2.0  (size 1% liquidity = 200 bps slippage)`,
      font: "Consolas", size: 20,
    })],
  }),
  H2("6.6 Fees per exchange"),
  dataTable(
    ["Exchange / DEX", "Fee taker", "Notes"],
    [
      ["Binance", "0.10%", "VIP 0 (default); może być niższe z BNB discount"],
      ["Bybit", "0.10%", "Standard"],
      ["OKX", "0.10%", "Standard"],
      ["Coinbase", "0.40%", "Higher than Asian peers"],
      ["Raydium (Solana)", "0.25%", "Pool fee — czasem 0.30% dla low-liq"],
      ["Jupiter aggregator", "0.10-0.30%", "Variable per route"],
      ["Uniswap V3", "0.05-1.00%", "Per-pool tier"],
    ],
    [3000, 1800, 4560],
  ),
  H2("6.7 Metryki — co wychodzi z backtestu"),
  dataTable(
    ["Metryka", "Definicja", "Cel"],
    [
      ["Win rate", "wins / total_trades", ">50%"],
      ["Avg PnL", "mean(trade_pnl_pct)", "Positive po fees"],
      ["Total PnL", "sum(trade_pnl_usd)", "Asbolutny zysk"],
      ["Sharpe", "mean(ret) / std(ret) * √252 (annualized)", ">1 (>2 świetne)"],
      ["Sortino", "Jak Sharpe, denominator = downside std", ">1.5"],
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
  P("Faza 3 (start): BTC, ETH, HYPE w wariantach USDT/USDC. Mamy parent recorder dane od 2026-04-08, więc na start dostajemy ~30+ dni live data. Walk-forward na 60+14 wymaga dłuższego dataset, więc Faza 3 ograniczona do prostszych testów (60 dni full = niemożliwe początkowo, używamy 30+5 jako compromise, ekspand z czasem)."),
  P("Faza 3+ (extension): top-50 alts po dodaniu Birdeye historical (paid tier $99/mo growth) lub Coingecko historical CSV downloads (free, gorsza granularity). To staje się dostępne gdy mamy potwierdzoną wartość Modułu 1."),
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
  H2("6.10 Backtest Modułu 1 sygnałów"),
  P("Ważny use-case: backtest NIE strategii price-action, ale sygnałów Modułu 1. Pytanie: czy gdyby Moduł 1 działał historycznie, alerty BYŁY przed pumpami?"),
  bullet("Krok 1: Reconstruct historyczne snapshoty (potrzebujemy zapis Birdeye/Dexscreener — to wymaga prowadzenia własnego recordera DEX podobnie jak parent ma CEX)"),
  bullet("Krok 2: Replay Module 1 na tych snapshotach"),
  bullet("Krok 3: Compare alerty vs realne pumpy (pump = price +30% w 24h od alertu)"),
  bullet("Krok 4: Precision/Recall/F1 score Modułu 1"),
  P("Caveat: w Fazie 3 nie mamy własnego DEX recordera, więc backtest sygnałów ograniczony do top-tokens które są na CEX (gdzie mamy parent data). Pełen DEX backtest wymaga dodania DEX recordera w v2 roadmap."),
  H2("6.11 Roadmap iteracji Modułu 3"),
  bullet("v0.3.0 (Faza 3): Candle aggregator + 3 strategie + walk-forward + HTML reports"),
  bullet("v0.3.1: Dodatkowe metrics (Calmar, Information Ratio, Tail Ratio)"),
  bullet("v0.3.2: Vectorbt integracja jako alternative engine (perf comparison)"),
  bullet("v0.3.3: Multi-symbol portfolio backtests (basket strategies)"),
  pageBreak(),
);

// === STRONA 14: Paper Trading ===
children.push(
  H1("7. Paper Trading layer"),
  H2("7.1 Cel i zakres"),
  P("Paper trading symuluje rzeczywiste wejścia/wyjścia w bazie danych BEZ dotykania realnego kapitału. Pozwala walidować strategie i Module 1 sygnały na real-time data, ale bez ryzyka. Decyzja userowa potwierdzona w Fazie 0 — żaden real wallet nie jest częścią scope Fazy 0-6."),
  H2("7.2 Architektura"),
  P("Worker subskrybuje INSERT do tabeli signals. Gdy nowy signal score > config.auto_paper_threshold (default: disabled, opt-in):"),
  bullet("Pull current price + liquidity z Dexscreener (best-effort fresh)"),
  bullet("Compute size_usd z portfolio config (default: 1% capital, max $100 per trade)"),
  bullet("Apply slippage: entry_price = current_price * (1 + slippage_bps/10000)"),
  bullet("Apply fee: fee_usd = size_usd * fee_pct (per dex from fees.py)"),
  bullet("INSERT do paper_trades z status='open'"),
  H2("7.3 Exit logic"),
  P("Trade jest zamknięty gdy któraś z czterech reguł zachodzi:"),
  bullet("stop_loss: cena spadła o X% od entry (default 8%)"),
  bullet("take_profit: cena wzrosła o Y% od entry (default 25%)"),
  bullet("time_stop: trade open dłużej niż max_hold_hours (default 48h)"),
  bullet("manual: user zamknął przez CLI lub dashboard"),
  H2("7.4 PnL accounting"),
  P("Zamknięcie wpisuje exit_ts, exit_price, pnl_usd, pnl_pct, close_reason. Cumulative metrics w dashboardzie liczone on-the-fly z agregacji tabeli paper_trades."),
  H2("7.5 Co NIE robi paper trader"),
  bullet("NIE łączy się z real wallet (brak private keys w systemie)"),
  bullet("NIE wykonuje real swaps (brak Web3 / Jupiter / Uniswap router integration)"),
  bullet("NIE zarządza real portfolio (brak rebalancing real assets)"),
  bullet("NIE retoryczna ochrona MEV (paper = brak ryzyka MEV; w v2 jeśli auto-trading → flashbots/jito)"),
  pageBreak(),
);

// === STRONA 15: Output layer ===
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
      ["/fresh [stage]", "Top fresh projects, opcjonalnie filter stage"],
      ["/paper", "Open positions + cumulative PnL summary"],
      ["/backtest <strategy>", "Uruchom backtest na default universe (async, link do raportu)"],
      ["/mute <token>", "Wycisz alerty dla token na 12h"],
      ["/unmute <token>", "Anuluj mute"],
    ],
    [3000, 6360],
  ),
  H3("Rate limiting & dedup"),
  bullet("Cooldown 6h per token (config) — ten sam token nie alertowany dwa razy w krótkim czasie"),
  bullet("Daily cap 20 alerts (config) — chroni przed alert fatigue"),
  bullet("Telegram bot rate limit: 30 msg/s globalny — implementujemy queue + throttle"),
  H2("8.2 FastAPI dashboard"),
  P("Local-only (bind 127.0.0.1:8001), zero auth (jest local-only). Pięć zakładek:"),
  dataTable(
    ["Zakładka", "Zawartość"],
    [
      ["Live Signals", "Tabela auto-refresh (HTMX 30s) + filtry score/chain/timestamp"],
      ["Fresh Projects", "Lista z filtrem lifecycle stage + sortowanie growth_score"],
      ["Paper Trading", "Open positions + closed trades + cumulative PnL chart"],
      ["Backtests", "Historia runs + uruchamianie nowych + inline HTML reports"],
      ["Settings", "View-only display config.yaml + env var status (without values)"],
    ],
    [2400, 6960],
  ),
  H2("8.3 Stack frontend"),
  P("Minimalistyczny — Jinja2 templates + HTMX dla reactivity + Plotly dla charts. Brak React/Vue/Svelte (overkill dla solo dev tool)."),
  pageBreak(),
);

// === STRONA 16-17: Phase plan ===
children.push(
  H1("9. Phase plan — roadmap implementacji"),
  H2("9.1 Six fazes overview"),
  dataTable(
    ["Faza", "Cel", "Deliverable", "Tag"],
    [
      ["0 (NOW)", "Plan-as-docs", "20p DOCX + 8 MD + skeleton + git init", "v0.0.0"],
      ["1", "Repo bootstrap", "venv + deps + DB client + logger + CLI stub", "v0.1.0"],
      ["2", "DEX adapters", "Dexscreener + Birdeye async clients", "v0.2.0"],
      ["3", "Backtesting", "Candles + 3 strategie + walk-forward + reports", "v0.3.0"],
      ["4", "Module 1", "Accumulation Detector + scoring + alert gating", "v0.4.0"],
      ["5", "Module 2", "Fresh Monitor + RugCheck + GoPlus + lifecycle", "v0.5.0"],
      ["6", "Output", "Telegram + Dashboard + Paper Trader", "v0.6.0/v1.0.0"],
    ],
    [800, 1800, 5160, 1600],
  ),
  H2("9.2 Definition of Done — per faza"),
  bullet("All tests pass: pytest -x dev, pytest tests/ pre-commit"),
  bullet("Coverage >= 80% (jeśli dotyka kodu hot-path)"),
  bullet("ruff + mypy clean"),
  bullet("PHASES.md checkbox flipped"),
  bullet("CHANGELOG.md zaktualizowany"),
  bullet("Tag git v0.{N}.0"),
  bullet("Demo lokalnie (gdzie możliwe)"),
  H2("9.3 Estymacja timeline (orientacyjna)"),
  dataTable(
    ["Faza", "Effort", "Calendar"],
    [
      ["0", "1-2 dni", "Teraz"],
      ["1", "3-5 dni", "+1 tydzień"],
      ["2", "5-7 dni", "+2 tygodnie"],
      ["3", "10-14 dni", "+1 miesiąc"],
      ["4", "10-14 dni", "+1.5 miesiąca"],
      ["5", "7-10 dni", "+2 miesiące"],
      ["6", "10-14 dni", "+3 miesiące"],
    ],
    [1200, 2400, 5760],
  ),
  P("Powyższe są estimates dla solo dev pełen czas. Rzeczywista calendar zależy od dostępności + nieprzewidzianych blockerów (API changes, edge cases)."),
  pageBreak(),
);

children.push(
  H2("9.4 Risk per faza"),
  dataTable(
    ["Faza", "Risk", "Mitigation"],
    [
      ["1", "Pre-commit hooks za wolne", "Split: ruff/mypy w pre-commit, pytest w pre-push only"],
      ["2", "Dexscreener API change/rate limit", "Birdeye fallback już w Fazie 2; cache 60s; monitoring 429"],
      ["3", "Parent recorder format change", "Pin parent reader version; integration tests na sample data"],
      ["3", "Backtest overfitting", "Walk-forward MANDATORY; out-of-sample >= 30%"],
      ["4", "False positive alerts", "Conservative defaults + per-token mute + manual review"],
      ["5", "Rugpull API false-positives", "Cross-check RugCheck + GoPlus; manual override"],
      ["6", "Telegram spam", "Cooldown 6h + daily cap 20"],
    ],
    [800, 3000, 5560],
  ),
  H2("9.5 Anti-regression checklist"),
  P("Wymuszany przed każdym tag (manual + automated)"),
  bullet("Pre-commit hook: pytest -x + ruff check"),
  bullet("Pre-faza-N+1: pytest tests/ (full) + manual demo Fazy N (CLI smoke test)"),
  bullet("Każdy ADR ma sekcję 'What it would break if reversed' (impact transparency)"),
  bullet("CHANGELOG.md changes diff > 0 lines (zmuszamy do udokumentowania)"),
  bullet("Tag tylko jeśli git status clean (no uncommitted)"),
  H2("9.6 Co NIE jest w roadmapie"),
  P("Out of scope dla całego planu (Faza 0-6), nie tylko bieżącej:"),
  bullet("Real wallet integration / private keys / on-chain transaction execution"),
  bullet("Per-chain native RPC adapters (Solana web3.py, Ethereum eth_call)"),
  bullet("Mobile app"),
  bullet("Multi-user / SaaS layer"),
  bullet("AWS deploy w Fazach 0-6 (lokalne dev — parent ma już AWS Tokyo dla recordera)"),
  bullet("Powielanie funkcjonalności parent market_maker (live MM, spread reversion)"),
  P("Wszystkie powyższe to potencjalna v2 — wymagają osobnej decyzji business + budget + ryzyko.", { italic: true, color: COLOR_MUTED }),
  pageBreak(),
);

// === STRONA 18: Tech stack + DB schema ===
children.push(
  H1("10. Tech stack + DB schema"),
  H2("10.1 Stack — co i dlaczego"),
  dataTable(
    ["Warstwa", "Wybór", "Uzasadnienie"],
    [
      ["Język", "Python 3.11+", "Match parent stack, asyncio dla I/O-heavy DEX polling"],
      ["Async", "asyncio + aiohttp", "Standard parent"],
      ["API framework", "FastAPI + uvicorn", "Parent uses it, dashboard reuse pattern"],
      ["Storage", "DuckDB (file-based)", "Embedded, columnar, 1-file backup, brak serwera"],
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
  bullet("Redis — DuckDB + asyncio queue wystarczą do ~1M signals/mo"),
  bullet("Kafka / RabbitMQ — overengineering dla solo dev monolith"),
  bullet("Docker — lokalne dev na razie (parent ma docker w roadmap, my w v2)"),
  bullet("Kubernetes — overkill na zawsze (single-node deployment wystarczy)"),
  bullet("React / Vue / Svelte — Jinja2 + HTMX wystarczą dla dashboard"),
  H2("10.3 DB schema — tabele"),
  dataTable(
    ["Tabela", "Klucz główny", "Cel"],
    [
      ["_meta", "key", "Schema version + app metadata"],
      ["tokens", "token_address", "Master tokens recognized w systemie"],
      ["signals", "id", "Output Modułu 1 (timestamp, score, breakdown JSON)"],
      ["fresh_projects", "(token_address, snapshot_ts)", "Time-series state Modułu 2"],
      ["paper_trades", "id", "Open + closed positions, simulated PnL"],
      ["candles_5m", "(exchange, symbol, ts)", "OHLCV 5min aggregated z tick data"],
      ["candles_15m", "(exchange, symbol, ts)", "OHLCV 15min interval"],
      ["backtest_runs", "id", "Metadata per backtest run + metrics JSON"],
    ],
    [2160, 3000, 4200],
  ),
  P("Pełen schema: src/deep_owl/db/schema.sql (134 linie SQL z indexes + CHECK constraints + sequences).", { color: COLOR_MUTED, italic: true }),
  pageBreak(),
);

// === STRONA 19: Repo + file hygiene + git ===
children.push(
  H1("11. Repo structure + standards"),
  H2("11.1 Repo skeleton (po Fazie 0)"),
  new Paragraph({
    spacing: { before: 100, after: 200 },
    children: [new TextRun({
      text:
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
│   ├── deep_owl_v1.docx   # ten dokument
│   └── decisions/         # ADRs
├── src/deep_owl/
│   ├── __init__.py
│   ├── cli.py             # entry point: deep-owl
│   ├── config.py
│   ├── logger.py
│   ├── db/
│   ├── data/
│   ├── modules/
│   └── output/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── scripts/
    ├── bootstrap.ps1
    └── generate_docx.js   # generator tego dokumentu`,
      font: "Consolas", size: 18,
    })],
  }),
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

// === STRONA 20: Risk register + future ===
children.push(
  H1("12. Risk register + future expansions"),
  H2("12.1 Top risks"),
  dataTable(
    ["Risk", "Likelihood", "Impact", "Mitigation"],
    [
      ["Dexscreener rate limit / API change", "Medium", "High", "Birdeye fallback, cache 60s, monitoring 429"],
      ["DuckDB row count > 100M (slow queries)", "Low (rok+)", "Medium", "Partition by month, archive old to parquet"],
      ["Rugpull filter false-positives", "High", "Medium", "Conservative defaults + manual override per token"],
      ["Backtest overfitting", "High", "High", "Walk-forward MANDATORY, out-of-sample >= 30%"],
      ["Telegram bot spam (zbyt dużo alertów)", "Medium", "Low", "Per-token cooldown 6h, daily cap 20"],
      ["CLAUDE.md drift vs reality", "Medium", "Medium", "Co fazę: re-read i update jeśli stale"],
      ["Birdeye paid tier wymagany za wcześnie", "Medium", "Medium", "Free tier holders top-10 wystarczy do v0.4; growth od v0.5"],
      ["Parent recorder data outage", "Low", "High (Faza 3+)", "Local backup snapshot przed start backtestu"],
      ["Solo dev burnout / deprioritization", "Medium", "High", "Phase plan jako commitment device, CHANGELOG jako evidence progress"],
    ],
    [3000, 1300, 1300, 3760],
  ),
  H2("12.2 Future expansions (v2+, post Fazie 6)"),
  bullet("Auto-trading: real wallet via Jupiter/Uniswap router + MEV protection (Flashbots/Jito)"),
  bullet("Per-chain native adapters: Solana web3.py, Ethereum eth_call (lepsza precyzja niż agregator API)"),
  bullet("Własny DEX recorder (jak parent CEX recorder ale dla DEX) — wymagane dla pełnego backtest sygnałów Modułu 1"),
  bullet("News feed integration (CryptoPanic, Twitter API v2 paid) — sygnał news-driven pumps"),
  bullet("Multi-user SaaS: per-user portfolio, shared signals, premium tiers"),
  bullet("Mobile push notifications (Pushover, Pushbullet) jako alternatywa Telegram"),
  bullet("AWS deploy: parent ma AWS Tokyo Lightsail, można zrobić sister deploy dla Deep Owl"),
  bullet("Backtesting na parach DEX (Birdeye historical paid tier, $99/mo)"),
  bullet("Strategy ensemble: Module 1 score + technical signals + news score → meta-classifier"),
  bullet("Kelly criterion position sizing (zamiast fixed %)"),
  H2("12.3 Wniosek końcowy"),
  P("Deep Owl jest zaprojektowany jako solo dev tool z naciskiem na: (1) izolacja od parent market_maker context, (2) anti-sprawl docs i kodu, (3) rygor backtestingu z walk-forward, (4) paper trading first / real money never w Fazie 0-6, (5) hard limits na dependencies + file count + LOC żeby zapobiec rozrostowi."),
  P("Faza 0 produkuje ten dokument + kompletny skeleton repo z własnym CLAUDE.md, 8 MD docs, 33 plikami źródłowymi, gotową strukturą bazy danych i CLI stubem. Implementacja Fazy 1-6 ma wyraźne deliverables i acceptance criteria. Sukces mierzony tagami git i CHANGELOG entries — nie linijkami kodu."),
  P("End of v1 architecture document.", { italic: true, color: COLOR_MUTED, align: AlignmentType.CENTER, spacingBefore: 400 }),
);

// ====== Document config ======

const doc = new Document({
  creator: "Deep Owl",
  title: "Deep Owl - Breakout Signals Bot - Architecture & Roadmap v1",
  description: "Architektura + roadmap + standardy projektu Deep Owl (Faza 0 deliverable)",
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
            text: "Deep Owl · Architecture & Roadmap v1",
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
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`OK: ${outputPath}`);
  console.log(`Size: ${buffer.length} bytes`);
});
