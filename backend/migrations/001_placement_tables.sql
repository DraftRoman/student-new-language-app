-- Placement-test tables — story §6 data model.
--
-- HOW TO APPLY: open Supabase Studio → SQL Editor → paste & run.
-- Idempotent: every statement is `IF NOT EXISTS`, so re-running is safe
-- and never drops or deletes anything.
--
-- ROLLBACK: intentionally NOT provided. Drop is a destructive operation
-- that must be done by hand with explicit data inspection.

-- ─── placement_session ──────────────────────────────────────────────────
-- One row per user run of the placement test. `confirmed_level` is null
-- until the user clicks "Start learning" on the confirmation screen
-- (story §4.5 / §4.6).
CREATE TABLE IF NOT EXISTS public.placement_session (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status            TEXT NOT NULL CHECK (status IN ('in_progress', 'completed')),
    current_level     TEXT CHECK (current_level IN ('A1','A2','B1','B2','C1','C2')),
    recommended_level TEXT CHECK (recommended_level IN ('A1','A2','B1','B2','C1','C2')),
    confirmed_level   TEXT CHECK (confirmed_level IN ('A1','A2','B1','B2','C1','C2')),
    started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at      TIMESTAMPTZ
);

-- One *active* session per user — the "resume on yes" invariant in §5.1
-- and §4.1 depends on `get_active_for_user(user_id)` being unique. This
-- partial unique index enforces it at the DB level; the application layer
-- is just the first line of defense.
CREATE UNIQUE INDEX IF NOT EXISTS placement_session_one_active_per_user
    ON public.placement_session (user_id)
    WHERE status = 'in_progress';

CREATE INDEX IF NOT EXISTS placement_session_user_idx
    ON public.placement_session (user_id);


-- ─── placement_level_attempt ────────────────────────────────────────────
-- One row per CEFR level the user attempted inside a session, in attempt
-- order. After a fail, no more rows are added — the ladder stops on the
-- first failed level (story §4.2).
CREATE TABLE IF NOT EXISTS public.placement_level_attempt (
    id              BIGSERIAL PRIMARY KEY,
    session_id      UUID NOT NULL REFERENCES public.placement_session(id) ON DELETE CASCADE,
    cefr_level      TEXT NOT NULL CHECK (cefr_level IN ('A1','A2','B1','B2','C1','C2')),
    vocab_errors    INTEGER NOT NULL CHECK (vocab_errors >= 0),
    sentence_errors INTEGER NOT NULL CHECK (sentence_errors >= 0),
    total_items     INTEGER NOT NULL CHECK (total_items >= 0),
    passed          BOOLEAN NOT NULL,
    attempted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Idempotency at the DB level: one attempt per (session, level). The
    -- application layer already short-circuits double submissions, but
    -- this is the durable guard if two requests race past the in-memory
    -- check.
    UNIQUE (session_id, cefr_level)
);

CREATE INDEX IF NOT EXISTS placement_level_attempt_session_idx
    ON public.placement_level_attempt (session_id);


-- ─── Row-level security ─────────────────────────────────────────────────
-- Service-role key bypasses RLS (the backend uses it), but enabling RLS
-- means a leaked anon key can't see other users' sessions if the table
-- ever gets exposed to client-side calls.
ALTER TABLE public.placement_session       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_level_attempt ENABLE ROW LEVEL SECURITY;

-- Policies are intentionally restrictive: only the row's owner reads
-- their own sessions / attempts. Writes go through the backend (service
-- role), so no INSERT/UPDATE policy is needed.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'placement_session'
          AND policyname = 'placement_session_owner_select'
    ) THEN
        CREATE POLICY placement_session_owner_select
            ON public.placement_session
            FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'placement_level_attempt'
          AND policyname = 'placement_level_attempt_owner_select'
    ) THEN
        CREATE POLICY placement_level_attempt_owner_select
            ON public.placement_level_attempt
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.placement_session s
                    WHERE s.id = session_id AND s.user_id = auth.uid()
                )
            );
    END IF;
END$$;
