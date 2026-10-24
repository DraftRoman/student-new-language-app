-- Pronunciation-attempt table — speaking feature (UC-PRON-01) data model.
--
-- HOW TO APPLY: open Supabase Studio → SQL Editor → paste & run.
-- Idempotent: every statement is `IF NOT EXISTS`, so re-running is safe
-- and never drops or deletes anything.
--
-- ROLLBACK: intentionally NOT provided. Drop is a destructive operation
-- that must be done by hand with explicit data inspection.
--
-- RETENTION: this table stores SCORE + METADATA only. The raw audio is
-- never persisted (v1 policy [OPEN #6]) — there is no audio column here.

-- ─── pronunciation_attempts ─────────────────────────────────────────────
-- One row per scored attempt. Append-only history (the learner retries an
-- unlimited number of times — acceptance criterion #7), so every attempt is
-- an immutable INSERT; rows are never updated or deleted by the app.
CREATE TABLE IF NOT EXISTS public.pronunciation_attempts (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id     TEXT NOT NULL,
    course_lang     TEXT NOT NULL,
    task_type       TEXT NOT NULL CHECK (task_type IN ('word', 'phrase', 'sentence')),
    expected_text   TEXT NOT NULL,
    recognized_text TEXT NOT NULL,
    match_pct       INTEGER NOT NULL CHECK (match_pct BETWEEN 0 AND 100),
    status          TEXT NOT NULL CHECK (status IN ('excellent', 'passed', 'retry')),
    words_matched   INTEGER NOT NULL CHECK (words_matched >= 0),
    order_score     REAL NOT NULL CHECK (order_score BETWEEN 0 AND 1),
    missing         TEXT[] NOT NULL DEFAULT '{}',
    extra           TEXT[] NOT NULL DEFAULT '{}',
    attempt_no      INTEGER NOT NULL CHECK (attempt_no >= 1),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pronunciation_attempts_user_exercise_idx
    ON public.pronunciation_attempts (user_id, exercise_id);


-- ─── Row-level security ─────────────────────────────────────────────────
-- Service-role key bypasses RLS (the backend uses it), but enabling RLS
-- means a leaked anon key can't read other users' attempts if the table
-- is ever exposed to client-side calls.
ALTER TABLE public.pronunciation_attempts ENABLE ROW LEVEL SECURITY;

-- Only the row's owner reads their own attempts. Writes go through the
-- backend (service role), so no INSERT/UPDATE policy is needed.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'pronunciation_attempts'
          AND policyname = 'pronunciation_attempts_owner_select'
    ) THEN
        CREATE POLICY pronunciation_attempts_owner_select
            ON public.pronunciation_attempts
            FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END$$;
