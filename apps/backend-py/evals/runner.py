"""Evaluation runner — execute targets over cases and collect run records."""

import time
from collections.abc import Iterable
from typing import Any

from evals.case import Case
from evals.record import RunRecord
from evals.targets import Target


def exact_match(answer: dict[str, Any] | str, truth: dict[str, Any]) -> bool:
    """Structured field equality against ground truth."""
    return answer == truth


def judge(answer: dict[str, Any] | str, rubric: str) -> float:
    """LLM-as-judge quality score in [0, 1]. Placeholder until wired."""
    _ = (answer, rubric)
    return 0.0


def evaluate(
    target: Target,
    cases: Iterable[Case],
    repeats: int = 3,
) -> list[RunRecord]:
    out: list[RunRecord] = []
    for case in cases:
        for i in range(repeats):
            t0 = time.monotonic()
            res = target.run(case)
            out.append(
                RunRecord(
                    target=target.name,
                    case_id=case.id,
                    run=i,
                    latency=time.monotonic() - t0,
                    tokens=res.tokens,
                    tool_calls=res.tool_calls,
                    events=res.guardrail_events,
                    correct=exact_match(res.answer, case.truth),
                    quality=judge(res.answer, case.rubric),
                    expected_rails=set(case.expected_rails),
                )
            )
    return out
