"""Local embedding service using sentence-transformers."""

import asyncio
import logging
import time
from functools import partial
from typing import Literal

from api.config import ROOT

_MODEL_NAME = "all-MiniLM-L6-v2"
_CACHE_DIR = ROOT / ".cache" / "huggingface"

logger = logging.getLogger("uvicorn.error")

EmbeddingStatus = Literal["loading", "ready", "error"]


class EmbeddingService:
    def __init__(self):
        self._model = None
        self._status: EmbeddingStatus = "loading"
        self._error: str | None = None
        self._warmup_lock = asyncio.Lock()

    @property
    def status(self) -> EmbeddingStatus:
        return self._status

    @property
    def error(self) -> str | None:
        return self._error

    async def warmup(self) -> None:
        """Download and load the embedding model. Idempotent and safe to call concurrently."""
        async with self._warmup_lock:
            if self._model is not None:
                return
            loop = asyncio.get_event_loop()
            logger.info("Embedding warmup starting: model=%s cache_dir=%s", _MODEL_NAME, _CACHE_DIR)
            t0 = time.monotonic()
            try:
                from sentence_transformers import SentenceTransformer
                self._model = await loop.run_in_executor(
                    None,
                    partial(SentenceTransformer, _MODEL_NAME, cache_folder=str(_CACHE_DIR)),
                )
                self._status = "ready"
                self._error = None
                logger.info("Embedding warmup ready in %.1fs", time.monotonic() - t0)
            except Exception as e:
                self._status = "error"
                self._error = str(e)
                logger.error("Embedding warmup failed after %.1fs: %s", time.monotonic() - t0, e)

    async def embed(self, text: str) -> list[float]:
        if self._model is None:
            raise RuntimeError(f"Embedding model not ready (status={self._status})")
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, partial(self._model.encode, text, normalize_embeddings=True))
        return result.tolist()
