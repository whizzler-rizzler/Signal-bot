"""Orchestrator layer — pipeline executors, parallelism coordination.

Hexagonal layer: orchestration. Combines connectors + processors + engines.
Decyduje:
- Który engine kiedy uruchomić
- Jak je równolegle wykonać (uses parallelism layer)
- Jak agregować outputs (np. weighted sum dla Module 1)
- Co zrobić gdy engine zwróci None (redystrybucja wagi)
- Kiedy alert/persist do DB

Pliki:
- module1_orchestrator.py — combines 7 engines → Signal
- module2_orchestrator.py — backtest pipeline (walk-forward × strategies × universe)
- module3_orchestrator.py — new listings + filter sets matching
- universe_orchestrator.py — Faza 2 daily rebuild
- backfill_orchestrator.py — Faza 3b historical pull
- sanity_reconcile_orchestrator.py — Faza 3b WS/REST cross-check
- pipeline.py — general parallel executor
"""
