"""Stream multiplexer — multiplex N WebSocket streams → single asyncio.Queue.

Każdy stream w osobnym asyncio task. Used przez WS connectors w Faza 3a.

Stub Fazy 0. Implementacja Faza 3a.
"""

from __future__ import annotations

import asyncio


class StreamMultiplexer:
    """Multiplex N WS streams into single asyncio.Queue.

    TODO Faza 3a:
    - asyncio.Queue z maxsize backpressure (default 100_000)
    - add_stream(name, async_iterator) — spawn consumer task
    - consume() — yield (name, frame) tuples
    - shutdown — cancel all consumer tasks gracefully
    """

    def __init__(self, max_queue_size: int = 100_000) -> None:
        self.queue: asyncio.Queue[tuple[str, object]] = asyncio.Queue(maxsize=max_queue_size)
        self.tasks: list[asyncio.Task] = []
        raise NotImplementedError("StreamMultiplexer — implementacja w Fazie 3a")
