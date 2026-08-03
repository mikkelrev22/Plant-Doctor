import type { AnalyzeParams } from '@/api/client';

/**
 * Transient hand-off for the captured image between the capture screens and the
 * analyzing splash. Route params can't carry a file URI cleanly, so the capture
 * screens stash the pending analysis here, navigate to `/analyzing`, which reads
 * it on mount.
 *
 * The holder is cleared on success only — kept on error so "Retry" can re-fire
 * the same analysis. Module-level (not Zustand) because this is too transient
 * to persist and shouldn't trigger re-renders.
 */
let current: AnalyzeParams | null = null;

export function setAnalyzingContext(ctx: AnalyzeParams): void {
  current = ctx;
}

export function getAnalyzingContext(): AnalyzeParams | null {
  return current;
}

export function clearAnalyzingContext(): void {
  current = null;
}