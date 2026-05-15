"""FastAPI dashboard — local-only (127.0.0.1:8001), 7 zakładek.

Zakładki:
- Universe — przegląd ~4000 tokenów
- Live Signals — Module 1 alerts auto-refresh
- Top Movers — top 50 wg score
- New Listings — Module 3 candidates per filter set
- Filter Sets — UI tworzenia/edycji filter sets
- Paper Trading — open positions + closed trades + PnL
- Backtests — historia + uruchamianie + HTML reports
- Settings — view-only config + WS health

Stack: Jinja2 + HTMX + Plotly (NIE React/Vue/Svelte).
Stub Fazy 0. Implementacja Faza 6.
"""
