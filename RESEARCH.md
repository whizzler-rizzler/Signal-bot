# RESEARCH — Deep Owl

> Methodology, signal theory, walk-forward methodology, literature pointers. Akademicki/badawczy backbone projektu.

## Spis treści

1. [Podstawa filozoficzna](#1-podstawa-filozoficzna)
2. [Sygnały Module 1 — theory & evidence](#2-sygna%C5%82y-module-1)
3. [Walk-forward methodology](#3-walk-forward-methodology)
4. [Cross-validation Module 1 — protocol](#4-cross-validation-module-1)
5. [Module 3 New Listings — research](#5-module-3-new-listings)
6. [Risk metrics](#6-risk-metrics)
7. [Statistical significance](#7-statistical-significance)
8. [Literature & references](#8-literature--references)
9. [Anti-patterns metodologiczne](#9-anti-patterns)

---

## 1. Podstawa filozoficzna

### 1.1 Premise

Hipoteza Deep Owl: **"Akumulacja przed breakoutem zostawia ślad observable na danych on-exchange (volume, funding, OI, liquidations) ZANIM cena się ruszy."** Smart money musi otwierać pozycje, a otwarcie pozycji generuje footprint, którego nie da się ukryć w pełni — szczególnie na big cap tokenach gdzie skala kapitału jest istotna.

### 1.2 Co NIE jest tą hipotezą

- ❌ "Każda akumulacja prowadzi do breakout" — false positives są nieuniknione
- ❌ "Zawsze złapiemy moment" — często sygnały pojawiają się PO już rozpoczętym ruchu
- ❌ "Backtest historyczny gwarantuje przyszłe wyniki" — over-fitting jest realnym ryzykiem (mitigowanym walk-forward)
- ❌ "System bez ludzkiego nadzoru" — paper trading first, decyzje review-able

### 1.3 Edge type — gdzie szukamy alpha

**Nie szukamy:**
- Predykcji ceny (zostawiamy to ML/stats specialistom)
- HFT arbitrage (parent market_maker robi inne rzeczy)
- Insider info (legal + dane niedostępne)

**Szukamy:**
- **Statistical edge na anomaliach price/volume/funding/OI relationship** (Wyckoff-style, ale ilościowo)
- **Information asymmetry timing** — moment gdy on-chain footprint jest widoczny ale retail nie zauważył
- **Cross-exchange divergence** — smart money koncentruje się na konkretnym CEX, daje sygnał o intencji

---

## 2. Sygnały Module 1

Każdy sygnał to **hipoteza statystyczna** + **threshold based on empirical evidence** + **fallback gdy data niedostępna**.

### Sygnał #1 — Volume rising on flat/down price

**Hipoteza:** Wzrost wolumenu (>2x rolling 7d avg) PRZY płaskiej lub lekko spadającej cenie (Δp ∈ [-5%, +5%]) jest indykatorem akumulacji według Wyckoff method ("Wyckoff Phase B accumulation").

**Theoretical basis:**
- *Wyckoff Method* (Richard Wyckoff, 1900s) — Phase B (cause building) charakteryzuje się: high volume on no-progress price (smart money kupuje od panicked sellers).
- Współczesne potwierdzenie: VWAP/PVT divergence indicators (Granville, 1963) — On-Balance Volume rośnie podczas akumulacji nawet bez ruchu ceny.

**Threshold rationale:**
- `vol_24h / vol_7d_avg > 2.0` — empirycznie w crypto big caps, 2x SMA20 wolumen przy stagnant price ma ~35-40% precision (jeden z lepszych single signals)
- `|Δp_24h| < 5%` — eliminuje "volume on breakout" (chcemy PRZED, nie W TRAKCIE)

**Edge cases:**
- Bot trading może symulować volume bez prawdziwej akumulacji → cross-validate z holder count (jeśli dane on-chain dostępne)
- Wash trading na małych CEX-ach → ograniczamy do top 4 priorytetowych CEX-ów

### Sygnał #2 — Funding rate skew (negative)

**Hipoteza:** Negative funding rate (shorty płacą longom) utrzymujące się 24h+ na perpetual futures = market jest crowded short side = squeeze setup. Historycznie krótkie squeeze rallies +5-15% w 24-72h.

**Theoretical basis:**
- *Funding rate as sentiment indicator* — perpetual futures funding mechanism wymusza convergence z spot price. Negative funding = derivative price < spot = za dużo shorts.
- Empirical: badania na BTC perpetuals (Ferko et al., 2021) pokazują że extreme negative funding (<-0.05% per 8h) precedes mean reversion w 65%+ przypadków w okresie 72h.

**Threshold rationale:**
- `avg(funding_8h) < -0.01%` przez 24h (3 funding cycles) — stabilność, nie spike noise
- 24h window — eliminuje 1-cycle noise (single funding outlier)

**Edge cases:**
- Tylko perpetuals — spot tokens nie mają funding, signal niedostępny → redystrybucja wagi
- Bardzo niskie OI → funding może być volatile bez znaczenia signal-wise → filter `OI > $1M`

### Sygnał #3 — Open Interest buildup

**Hipoteza:** OI rośnie przy stabilnej cenie = nowy kapitał napływa do pozycji. Kierunek długi/krótki nie jasny SAM W SOBIE, ale w połączeniu z #2 (negative funding) jednoznacznie wskazuje na build-up shortów = squeeze potential.

**Theoretical basis:**
- *OI as commitment metric* (Schwager, 1989, "Market Wizards") — rosnący OI bez ruchu ceny = consensus na pozycji directionalnej (rzadko obie strony rosną symetrycznie).
- Crypto specific: badania na perp futures pokazują że OI growth >20% w 24h przy płaskiej cenie ma 45%+ precision dla move >5% w kolejnych 72h.

**Threshold:**
- `(OI_now - OI_7d_avg) / OI_7d_avg > 0.20` (+20%)
- Cena flat ±5% w tym samym oknie

### Sygnał #4 — Cross-exchange volume divergence

**Hipoteza:** Smart money/whale traders wybierają CEX z najlepszą płynnością i najniższym slippage dla swojej pozycji. Volume divergence (jeden CEX ma >2x volume vs inne dla tego samego tokena) wskazuje na koncentrację działalności = smart money signal.

**Theoretical basis:**
- *Market microstructure literature* — institutional flow często koncentruje się na one venue (lower information leakage).
- Crypto specific: Asian retail momentum często precedes USD market movement (Korean Premium, Bybit/OKX vs Binance volume divergence).

**Threshold:**
- `max(vol_per_cex) / median(vol_per_cex) > 2.0` dla 4-CEX coverage

**Edge cases:**
- Token tylko na 1 CEX — sygnał niedostępny
- Manipulation na małym CEX → ograniczamy do top 4

### Sygnał #5 — Liquidation imbalance (long)

**Hipoteza:** Masowe long liquidations (>2x short liq w 24h) reprezentują "weak hands flushed" capitulation — często bottom dla mean reversion.

**Theoretical basis:**
- *Cascading liquidations as bottom signal* — long liq cascade wyciska weak holders, zostają strong holders + smart money kupujący na taniej.
- BitMEX research (2018-2020 perpetuals data) pokazuje że >2x long-liq imbalance precedes recovery >5% w 72h w 55%+ przypadków.

**Threshold:**
- `long_liquidations_24h_usd / short_liquidations_24h_usd > 2.0`

### Sygnał #6 — Social mention velocity (opt)

**Hipoteza:** Nagły wzrost social mentions (>3x rolling 24h avg) precedes retail FOMO entry, którego można użyć jako confirmation dla smart money positioning.

**Theoretical basis:**
- *Attention as price driver* (Da et al., 2011 "In Search of Attention") — Google Trends spikes precede price runs.
- Crypto specific: Twitter mention velocity precede pumps w ~60% przypadków w okresie 24-48h, ale z high false positive rate (też precede dump po news).

**Threshold:**
- `mentions_1h / mentions_24h_avg > 3.0`

**Status:** OPCJONALNY — wymaga parent `Social_media_scanner` running. Bez niego waga redystrybuowana.

### Sygnał #7 — Bid/ask order book imbalance (opt)

**Hipoteza:** Bid pressure (bid_volume_L5 / ask_volume_L5 > 1.5) wskazuje na buy-side accumulation na orderbook level.

**Theoretical basis:**
- *Order book imbalance as predictor* (Cont et al., 2014 "The Price Impact of Order Book Events") — short-term price moves correlate with imbalance.
- Crypto: ograniczone evidence dla mid/long-term, ale dobre dla cross-validate spot accumulation w connection z innymi sygnałami.

**Threshold:**
- `sum(bid_volume_L5) / sum(ask_volume_L5) > 1.5`

**Status:** OPCJONALNY — wymaga orderbook L5 (parent recorder ma dla BTC/ETH/HYPE; CEX REST nie pushuje L5 typically). Bez niego waga redystrybuowana.

### Score formula uzasadnienie

```python
score = sum(signal_normalized * weight) / total_active_weight * 100
gdzie signal_normalized = sigmoid((value - threshold) / scale)
```

**Dlaczego sigmoid a nie clip([0,1])?**
- Sigmoid daje miękkie przejście — sygnał lekko poniżej thresholdu nadal daje 0.4-0.5 (nie ostre 0)
- Pozwala kombinować sygnały które są "prawie" przekroczone (kombinacja 5 sygnałów po 0.4 = silniejszy signal niż 1 sygnał na 0.9)
- Empirycznie lepsze precision/recall vs hard threshold

**Dlaczego weighted sum a nie ML classifier?**
- Interpretowalność: każdy sygnał z osobnym weight, łatwo audytować dlaczego score wysoki
- Robust dla missing data: brak sygnału → redystrybucja wagi
- Łatwo tunować pojedyncze wagi bez retraining całego modelu
- ML jako Faza 7+ optionally jeśli evidence że worth it

---

## 3. Walk-forward methodology

### 3.1 Dlaczego walk-forward (a nie standard split)?

**Standard train/test split** zawodzi w time series:
1. **Look-ahead bias:** parametry strojone na całym dataset (włącznie z test set leakage przez feature engineering)
2. **Stationarity assumption:** rynek się zmienia, parametry z 2022 niekoniecznie działają w 2026
3. **Single-fold variance:** jeden split daje 1 miarę performance, nie distribution

**Walk-forward** rozwiązuje:
1. Train tylko na danych przed test window
2. Slide window — pomiar w wielu okresach (2022 vs 2023 vs 2024 itd)
3. Distribution metryk → bardziej robust ocena

### 3.2 Konfiguracja

```
| Train (60d) | Test (14d) | <- window 1
              | Train (60d) | Test (14d) | <- window 2 (slide 14d)
                             ...
```

**Default:** train=60d, test=14d, slide=14d. Out-of-sample = 100% testów (każdy test window jest forward).

**Rationale wartości:**
- 60d train: wystarczająco długie żeby uchwycić cykl 4-tygodniowy + spike events
- 14d test: 2 tygodnie out-of-sample, wystarczy na ~10-30 trades dla statistical relevance
- 14d slide: nakładające się okresy minimalne (test 1 nie overlap z train 2)

### 3.3 Final score aggregation

Per strategy/config:
- Średnia metrics z N test windows (Sharpe, win rate, max DD, etc.)
- Standard deviation per metric (consistency check)
- Worst-case window analysis (jak strategia performs w gorszych okresach)

**Decision rule:** strategy passes deploy bar jeśli:
- Median Sharpe across windows > 1.0
- Worst window Sharpe > 0 (nie traci na pewno)
- Max DD across all windows < 30%
- Win rate stability: stdev(win_rate) / mean(win_rate) < 0.3 (consistency)

---

## 4. Cross-validation Module 1

**Pre-deploy KRYTYCZNE.** Module 1 NIE wdrażamy live z arbitralnymi wagami.

### 4.1 Protocol

```
Krok 1: Pull historical klines + funding + OI (top 100 tokens × 1-2 lata = ~52k klines per token × 5m)
Krok 2: Replay Module 1 scoring co świecę 5m, persist score do tymczasowej tabeli
Krok 3: Define "realny breakout" = price +20% w 24h od momentu T
Krok 4: Per próg threshold (60, 65, 70, 75, 80) compute:
        - True Positive: score > threshold AND breakout w ciągu 24h
        - False Positive: score > threshold AND NO breakout w ciągu 24h
        - True Negative: score < threshold AND NO breakout
        - False Negative: score < threshold AND breakout
Krok 5: Per próg compute Precision = TP / (TP + FP), Recall = TP / (TP + FN), F1
Krok 6: Per próg × tier (1-4): osobne metryki bo top 100 vs tail mają różne characteristics
Krok 7: Walk-forward na różne weighty (grid search lub Bayesian opt)
```

### 4.2 Acceptance threshold

**Deploy live JEŚLI:**
- Precision > 0.40 na out-of-sample (lepsza niż random — random by była ~0.10-0.15)
- Recall > 0.30 (łapiemy choć 30% prawdziwych breakouts)
- F1 > 0.35 (balance)
- Te metryki konsystentne across windows (stdev < 30% mean)

**Inaczej:** iteracja wagi/thresholds + retest. Maksymalnie 3 iteracje przed eskalacja "hipoteza signal-set może wymagać redesign".

### 4.3 Multi-objective trade-off

Tier 1 (top 100) — strict precision (>0.5 ideal). False alert na BTC kosztuje credibility bot.
Tier 4 (tail) — soft, recall ważniejszy (lepiej złapać małego pumpa z 0.3 precision niż przegapić).

---

## 5. Module 3 New Listings

### 5.1 Hipoteza

**"CEX listing event (post-vetting przez giełdę) generuje predictable price patterns w okresie 48-168h, z parametrami zależnymi od market cap, volume, listing exchange tier."**

### 5.2 Empirical patterns (z badań rynkowych 2020-2025)

**Pattern A — Initial pump (T+0 do T+24h):**
- Listing announcement → 30-100% pump w ciągu 24h (Binance listings często +50% średnio)
- Variance: nowo wydany token (low circulating supply) może +200-500%; established token (już na innych CEX) może być +5-20%

**Pattern B — Post-listing dump (T+24h do T+72h):**
- Profit-taking, airdrop recipients sell, market makers stabilize → -30 do -50% od peak
- Variance zależy od: token hype level, liquidity depth, free float

**Pattern C — Reversal & reaccumulation (T+72h do T+168h):**
- Stable buyers entry, dump exhausted → +20-50% reversal w wielu przypadkach
- **Sweet spot dla swing entry** — Module 3 cel uchwycić ten pattern

**Pattern D — Mature trend (T+168h+):**
- Token ustabilizowany w universe Module 1, normalne signals stosujemy

### 5.3 Filter set rationale

**Conservative:** top quality (cap > $10M, vol > $1M, ≥2 CEX, has perpetual) — dla user który chce niskie ryzyko, akceptuje mniejszą liczbę alertów.

**Aggressive alts:** szerszy zakres (cap > $1M, vol > $100k, 1 CEX) — łapie więcej okazji ale więcej noise (rugpull-like dump scenarios).

**Meme hunt:** keyword-based (INU, DOGE, PEPE, ...) — meme cykle mają inne dynamics (social-driven, retail FOMO większy weight).

---

## 6. Risk metrics

### 6.1 Sharpe Ratio

```
Sharpe = (mean(returns) - risk_free_rate) / stdev(returns) * sqrt(periods_per_year)
```

**Periods per year (annualization factor):**
- Daily returns: 365 (crypto trades 24/7, nie 252 jak TradFi)
- 5-min returns: 365 × 288 = 105,120 (jeśli high freq)

**Risk-free rate:** dla crypto strategii zazwyczaj 0 (uproszczenie).

**Interpretacja:**
- < 0: traci pieniądze
- 0-1: marginal edge
- 1-2: dobry
- 2-3: świetny
- > 3: prawdopodobnie over-fitting (sanity check!)

### 6.2 Sortino Ratio

```
Sortino = (mean(returns) - target_return) / stdev(negative_returns_only) * sqrt(periods)
```

Penalizuje TYLKO downside variance — bardziej istotne dla asymmetric strategies (typowo crypto breakout).

### 6.3 Calmar Ratio

```
Calmar = annualized_return / abs(max_drawdown)
```

Risk-adjusted return przez worst-case drawdown. Lepsze dla long-term planning niż Sharpe.

### 6.4 Max Drawdown (max DD)

```python
def max_drawdown(equity):
    running_max = np.maximum.accumulate(equity)
    drawdown = (equity - running_max) / running_max
    return drawdown.min()  # most negative = max DD
```

**Plus:** Max DD duration (czas od peak do recovery) — pokazuje psychological risk (trader nie wytrzyma 6 miesięcy underwater).

### 6.5 Exposure time

```
exposure_pct = bars_in_position / total_bars
```

Optymalne 30-70%. Za niskie = nie wykorzystujemy capitalu. Za wysokie = brak risk diversification w czasie.

### 6.6 Trade count + statistical significance

Rule of thumb: **minimum 30 trades** for statistical relevance per strategy/window. Inaczej wyniki to noise.

---

## 7. Statistical significance

### 7.1 Sample size considerations

Per backtest window: minimum 30 trades dla rough significance. Walk-forward × 8 windows = ~240 trades total dla mocnych wniosków.

### 7.2 Bootstrap confidence intervals

Dla Sharpe i max DD, używamy bootstrap (10,000 iteracji) na trade returns dla 95% CI:

```python
sharpe_estimates = []
for _ in range(10_000):
    sample = np.random.choice(returns, size=len(returns), replace=True)
    sharpe_estimates.append(compute_sharpe(sample))
ci_low, ci_high = np.percentile(sharpe_estimates, [2.5, 97.5])
```

Strategy passes jeśli `ci_low > 0` (95% pewność że Sharpe pozytywny).

### 7.3 Multiple testing correction

Testując N strategii na tych samych danych zwiększamy ryzyko spurious significance. Bonferroni:

```
adjusted_alpha = 0.05 / N_strategies
```

Praktycznie: jeśli testujemy 4 strategie, real significance threshold to p < 0.0125, nie p < 0.05.

### 7.4 Benchmark comparison

Always compare vs **buy-and-hold** equivalent:
- Strategy Sharpe > BTC buy-hold Sharpe? (dla okresu testu)
- Strategy max DD < BTC max DD?
- Strategy total return > BTC return?

Jeśli strategia nie pokonuje buy-and-hold, **nie ma alpha**.

---

## 8. Literature & references

### 8.1 Foundational

- **Wyckoff, R.D.** (1931). *The Richard D. Wyckoff Method of Trading and Investing in Stocks*.
  → Foundation Sygnału #1 (volume on flat price = accumulation Phase B).

- **Granville, J.E.** (1963). *Granville's New Key to Stock Market Profits*.
  → On-Balance Volume (OBV) — confirmation pattern dla volume signals.

- **Schwager, J.D.** (1989). *Market Wizards*.
  → Open Interest interpretacja, multi-strategy diversification.

### 8.2 Modern quant finance

- **Cont, R., Kukanov, A., Stoikov, S.** (2014). "The Price Impact of Order Book Events". *Journal of Financial Econometrics*.
  → Sygnał #7 theoretical foundation.

- **Da, Z., Engelberg, J., Gao, P.** (2011). "In Search of Attention". *Journal of Finance*.
  → Sygnał #6 (social velocity) foundation.

- **Avellaneda, M., Lee, J.H.** (2010). "Statistical Arbitrage in the U.S. Equities Market". *Quantitative Finance*.
  → Walk-forward methodology, multi-strategy framework.

### 8.3 Crypto-specific

- **Ferko, A., Moin, A., Onur, E., Penick, M.** (2021). "Who Trades Bitcoin Futures and Why?" *CFTC Working Paper*.
  → Funding rate behavior, crowded shorts → squeeze patterns.

- **Makarov, I., Schoar, A.** (2020). "Trading and Arbitrage in Cryptocurrency Markets". *Journal of Financial Economics*.
  → Cross-exchange arbitrage, divergence patterns.

- **Bianchi, D., Babiak, M., Dickerson, A.** (2022). "Trading Volume and Liquidity Provision in Cryptocurrency Markets". *Journal of Banking & Finance*.
  → Liquidation cascade patterns, market microstructure.

### 8.4 Backtesting & methodology

- **Bailey, D.H., Borwein, J., Lopez de Prado, M., Zhu, Q.J.** (2014). "Pseudo-Mathematics and Financial Charlatanism". *Notices of the AMS*.
  → Multiple testing problem, walk-forward necessity.

- **Lopez de Prado, M.** (2018). *Advances in Financial Machine Learning*.
  → Combinatorial cross-validation, deflated Sharpe ratio, anti-overfitting protocols.

### 8.5 Online resources (sanity check)

- **TradingView indicators repository** — community-validated technical indicators
- **CryptoQuant** — on-chain analytics, exchange flow patterns
- **Glassnode Insights** — institutional crypto research (free + paid)
- **CoinShares Research** — weekly market reports

---

## 9. Anti-patterns metodologiczne

### 9.1 ❌ Over-fitting the past

**Problem:** Tunujesz parametry na całym historycznym dataset → idealny in-sample fit → zero generalization.

**Mitigation:**
- Walk-forward MANDATORY
- Out-of-sample ≥ 30% data
- Bayesian prior on parameters (regularization)

### 9.2 ❌ Look-ahead bias

**Problem:** Feature uses information from future (np. "future_high" w training data).

**Mitigation:**
- Engine input MUSI być explicit `t_max` parameter — żaden engine nie może czytać data > `t_max`
- Code review każdego engine pod kątem look-ahead

### 9.3 ❌ Survivorship bias

**Problem:** Backtest tylko na tokenach które dziś istnieją → ignorujesz delisted/rugpulled tokens.

**Mitigation:**
- Universe rebuild zachowuje delisted tokens (`is_active=FALSE`, NIE delete row)
- Backtest universe time-aware: użyj historical universe snapshot dla danego okresu

### 9.4 ❌ Multiple testing without correction

**Problem:** Testujesz 100 strategii, jedna ma p<0.05 → przypadek nie alpha.

**Mitigation:**
- Bonferroni adjustment
- Limited strategy set (4 templates max w Faza 4)
- Dokumentuj wszystkie tested strategies (nawet failed) w `docs/decisions/`

### 9.5 ❌ Cherry-picked time windows

**Problem:** Test na 2021 bull run → strategia "działa". Realnie pomija 2022 bear.

**Mitigation:**
- Walk-forward across multi-year periods
- Worst-window analysis (jak strategia performs w gorszych okresach)
- Stress test scenariusze (Mar 2020 covid crash, Nov 2022 FTX collapse, etc.)

### 9.6 ❌ Data snooping

**Problem:** Iteracyjne tunowanie parametrów na test set → test set staje się train set.

**Mitigation:**
- Hold-out finalna evaluation set (ostatnie 6 miesięcy) — NIE używamy do tuningu, TYLKO do final accept/reject
- Limit iteracji na walk-forward (max 3 rundy parametrów)

### 9.7 ❌ Cost ignorance

**Problem:** Backtest bez fees i slippage → strategy looks profitable, real trading loses.

**Mitigation:**
- Fees per CEX (patrz `engines/fees_engine.py`)
- Slippage linear model (patrz `engines/slippage_engine.py`)
- Conservative defaults (jeśli wątpliwości — zwiększ slippage estimate o 50%)

### 9.8 ❌ Confirmation bias w signal selection

**Problem:** Wybieramy sygnały które "intuicyjnie powinny działać" zamiast tych które MAJĄ evidence.

**Mitigation:**
- Każdy sygnał MUSI mieć:
  1. Theoretical basis (literature reference)
  2. Threshold uzasadniony empirycznie (nie arbitralnie)
  3. Cross-validation precision/recall na historical data
- Sygnał bez evidence = NIE wdrażamy

### 9.9 ❌ Ignoring regime change

**Problem:** Strategia działała 2021-2023, deployed w 2024. Rynek się zmienił, strategia stale.

**Mitigation:**
- Continuous monitoring: rolling 30d Sharpe vs historical Sharpe (alert if dropping >50%)
- Quarterly re-validation walk-forward
- Strategy retire process (graceful sunset jeśli evidence że stale)
