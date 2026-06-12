import type { CefrLevel } from "../../lib/placementService";

/**
 * Tiny localStorage facade for the placement-test resume invariant.
 *
 * Story §5.1: "Network drop mid-test: session is resumable; never silently
 * restart and lose progress. Server holds session state." The server side
 * already supports resume (the prior-experience handler returns the active
 * session). This module is the *client*-side memory of which session_id +
 * current_level belong to this browser, so we can re-fetch the right block
 * on refresh instead of falling back to the gate.
 *
 * Mid-block answers (the per-page vocab matches, partially-built sentence)
 * are *not* persisted — story §4.4 measures one CEFR block as a single
 * 25-item submission, and a refresh in the middle of building it is fine:
 * the user resumes at the start of the same level, and the server's
 * authoritative scoring is unaffected.
 *
 * Safety: every read tolerates absent / malformed JSON. localStorage may
 * also be unavailable (private mode, SSR) — all functions are no-ops if it
 * is, never throwing into render.
 */
const KEY = "placement.session.v1";

interface Persisted {
  sessionId: string;
  level:     CefrLevel;
}

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function save(data: Persisted): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(KEY, JSON.stringify(data));
  } catch {
    // Quota / disabled — nothing we can do; resume just won't work.
  }
}

export function load(): Persisted | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    if (!parsed.sessionId || !parsed.level) return null;
    return { sessionId: parsed.sessionId, level: parsed.level };
  } catch {
    return null;
  }
}

export function clear(): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(KEY);
  } catch {
    // Ignore.
  }
}
