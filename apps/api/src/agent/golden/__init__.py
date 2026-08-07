"""Hand-authored golden canvas2d tools for codegen few-shot injection (AM1)."""

from agent.golden.index import GOLDEN_MANIFEST, list_goldens
from agent.golden.retrieve import retrieve_goldens

__all__ = ["GOLDEN_MANIFEST", "list_goldens", "retrieve_goldens"]
