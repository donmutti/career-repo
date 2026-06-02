"""Local embedding service using sentence-transformers."""

import asyncio
from functools import partial

from sentence_transformers import SentenceTransformer

from api.config import ROOT

_MODEL_NAME = "all-MiniLM-L6-v2"
_CACHE_DIR = ROOT / ".cache" / "huggingface"


class EmbeddingService:
    def __init__(self):
        self._model = SentenceTransformer(_MODEL_NAME, cache_folder=str(_CACHE_DIR))

    async def embed(self, text: str) -> list[float]:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, partial(self._model.encode, text, normalize_embeddings=True))
        return result.tolist()
