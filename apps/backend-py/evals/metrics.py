"""Evaluation metrics — guardrail scorecards and aggregate stats."""

from collections import defaultdict

from backend_py.observability.guardrails import Rail

from evals.record import RunRecord


def guardrail_scorecard(
    records: list[RunRecord],
) -> dict[tuple[str, Rail], dict[str, int]]:
    cells: dict[tuple[str, Rail], dict[str, int]] = defaultdict(
        lambda: {"fired": 0, "warranted": 0, "fp": 0, "n": 0}
    )
    for r in records:
        fired = {e.rail for e in r.events}
        for rail in Rail:
            c = cells[(r.target, rail)]
            c["n"] += 1
            if rail in fired:
                c["fired"] += 1
                if r.should_trip(rail):
                    c["warranted"] += 1
                else:
                    c["fp"] += 1
    return cells  # -> fire_rate, recall, false_positive_rate per (target, rail)
