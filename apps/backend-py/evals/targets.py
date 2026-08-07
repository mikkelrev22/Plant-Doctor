"""Protocols for orchestration targets under evaluation."""

from typing import Protocol

from evals.case import Case
from evals.result import RunResult


class Target(Protocol):
    """Runnable orchestration (linear pipeline, ReAct agent, etc.)."""

    name: str

    def run(self, case: Case) -> RunResult:
        """Run image + metadata through the target; return answer and telemetry."""
