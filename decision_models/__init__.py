"""
BharatBazaro Decision Models package.
Free structured decisions for deal promotion.
"""

from .engine import DealDecisionEngine, decide_deal, promote_or_not, FREE_MODELS, DecisionResult

__all__ = [
    "DealDecisionEngine",
    "decide_deal",
    "promote_or_not",
    "FREE_MODELS",
    "DecisionResult",
]
