-- TurtleTalk: full setup for a NEW Supabase project.
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
-- Safe to run more than once (IF NOT EXISTS everywhere). Then run 02_seed_dictionary.sql.
--
-- Based on the schema reconstructed from the code
-- Generated 2026-10-23 from the student-new-language-app repo (branch task/init).
--
-- The tables in PART B are copied exactly from backend/migrations/001 and 002.
-- The tables in PART A had NO migration in the repo. Their columns are inferred from
-- every place the code reads or writes them (server.js, backend/app/modules/*,
-- seed-images.js, mover.py). Column TYPES, defaults and constraints in PART A are
-- best guesses: lines marked "-- guess" were not stated anywhere in the code.
--
-- Supabase project ref seen in docs/placement/session-handoff.md: qmqxruztxfzeygftxlaw
-- Storage bucket: imagesTurtle (public; image paths like 'family/actor.webp')

-- ════════════════════════════════════════════════════════════════════════
-- PART A: base tables (reconstructed, no migration existed)
-- ════════════════════════════════════════════════════════════════════════

-- ─── dictionary ─────────────────────────────────────────────────────────
-- One row per word. Used by the word-match game, the sentence game (via
-- sentences.dict_id) and seed-images.js.
-- Sources: mover.py (INSERT), server.js + catalog/infrastructure (SELECT),
--          seed-images.js (UPDATE image, image_meta_data).
CREATE TABLE IF NOT EXISTS public.dictionary (
    id              BIGSERIAL PRIMARY KEY,            -- guess: type; referenced by sentences.dict_id and seed-images .select('id')
    unique_id       UUID DEFAULT gen_random_uuid(),   -- mover.py inserts str(uuid4())
    lemma           TEXT NOT NULL,                    -- English headword, e.g. 'a man', 'an aunt', 'a doctor (female)'
    translation     JSONB,                            -- {"es": "el hombre", "ru": "...", "emoji": "👨"}
    type            TEXT,                             -- word_type.py: noun|pronoun|verb|adjective|adverb|preposition|conjunction|interjection
    color           TEXT,                             -- hex from TYPE_COLOR_MAP, e.g. '#3b82f6'
    number          TEXT,                             -- 'singular' | 'plural'
    example         JSONB,                            -- {"en": [..], "es": [..], "ru": [..]} parallel arrays of example sentences
    image           TEXT,                             -- storage path inside bucket imagesTurtle, e.g. 'family/actor.webp'
    image_meta_data JSONB,                            -- {"bucket","storage_path","alt_text","mime_type","tags":[..]}
    category        TEXT                              -- NEW (optional): word-list category, e.g. 'people', 'foodAndDrinks'
);
CREATE INDEX IF NOT EXISTS dictionary_lemma_idx ON public.dictionary (lemma);
-- NOTE: mover.py once inserted example as a plain string ("This is an example
-- sentence."); the current code expects the JSONB object shape above.

-- ─── sentences ──────────────────────────────────────────────────────────
-- Sentence-builder exercises. The text is NOT stored here: it is taken from
-- dictionary.example.<lang>[example_index].
-- Sources: server.js + catalog/infrastructure/supabase_repositories.py
CREATE TABLE IF NOT EXISTS public.sentences (
    id            BIGSERIAL PRIMARY KEY,              -- guess: frontend types it as string, could be UUID
    level         TEXT,                               -- guess values: 'A1','A2',... (filtered with ?level=)
    words         JSONB NOT NULL,                     -- [{"form": "The", "word_type": "noun", "position": 0}, ...]
    dict_id       BIGINT REFERENCES public.dictionary(id),  -- FK used in the join dictionary!dict_id(example)
    example_index INTEGER NOT NULL DEFAULT 0,         -- index into dictionary.example.en / .es / .ru
    is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

-- ─── user_progress ──────────────────────────────────────────────────────
-- Spaced-repetition state per user per sentence exercise.
-- mastery_level 0..5, next review = now + 2^mastery days.
-- Sources: server.js, progress/infrastructure/supabase_repositories.py
CREATE TABLE IF NOT EXISTS public.user_progress (
    id                BIGSERIAL PRIMARY KEY,          -- guess: type
    user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- guess: FK
    exercise_id       TEXT NOT NULL,                  -- guess: sentence id (int or text)
    attempts          INTEGER NOT NULL DEFAULT 0,
    correct_count     INTEGER NOT NULL DEFAULT 0,
    mastery_level     INTEGER NOT NULL DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 5),
    next_review_at    TIMESTAMPTZ,
    last_attempted_at TIMESTAMPTZ,
    updated_at        TIMESTAMPTZ DEFAULT NOW(),      -- guess: frontend type mentions updated_at
    UNIQUE (user_id, exercise_id)                     -- guess: code looks up one row per pair
);

-- ─── word_progress ──────────────────────────────────────────────────────
-- Word-match attempts per user per word per language pair.
-- Sources: server.js, progress/infrastructure/supabase_repositories.py
CREATE TABLE IF NOT EXISTS public.word_progress (
    id            BIGSERIAL PRIMARY KEY,              -- guess: type
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- guess: FK
    lemma         TEXT NOT NULL,
    language      TEXT NOT NULL DEFAULT 'en-es',      -- 'en-es','en-ru','es-ru','es-emojis', image modes
    attempts      INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE (user_id, lemma, language)                 -- guess: code looks up one row per triple
);

-- Supabase-managed (not app tables): auth.users (sign-up / login),
-- storage bucket 'imagesTurtle' (public read).
INSERT INTO storage.buckets (id, name, public)
VALUES ('imagesTurtle', 'imagesTurtle', true)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════
-- PART B: tables from the repo migrations (exact)
-- Copied from backend/migrations/001 and 002; their indexes are below and RLS is in PART C.
-- ════════════════════════════════════════════════════════════════════════

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

CREATE TABLE IF NOT EXISTS public.placement_level_attempt (
    id              BIGSERIAL PRIMARY KEY,
    session_id      UUID NOT NULL REFERENCES public.placement_session(id) ON DELETE CASCADE,
    cefr_level      TEXT NOT NULL CHECK (cefr_level IN ('A1','A2','B1','B2','C1','C2')),
    vocab_errors    INTEGER NOT NULL CHECK (vocab_errors >= 0),
    sentence_errors INTEGER NOT NULL CHECK (sentence_errors >= 0),
    total_items     INTEGER NOT NULL CHECK (total_items >= 0),
    passed          BOOLEAN NOT NULL,
    attempted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, cefr_level)
);

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

CREATE UNIQUE INDEX IF NOT EXISTS placement_session_one_active_per_user
    ON public.placement_session (user_id) WHERE status = 'in_progress';
CREATE INDEX IF NOT EXISTS placement_session_user_idx ON public.placement_session (user_id);
CREATE INDEX IF NOT EXISTS placement_level_attempt_session_idx ON public.placement_level_attempt (session_id);
CREATE INDEX IF NOT EXISTS pronunciation_attempts_user_exercise_idx
    ON public.pronunciation_attempts (user_id, exercise_id);

-- ════════════════════════════════════════════════════════════════════════
-- PART C: security rules (Row Level Security)
-- The backend uses the service-role key, which bypasses RLS, so the app works
-- either way. RLS protects the data if someone uses the public anon key directly:
--   * word lists (dictionary, sentences): anyone can read, nobody can write
--   * progress / placement / pronunciation: each user can only read their own rows
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE public.dictionary              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentences               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_progress           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_session       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_level_attempt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pronunciation_attempts  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dictionary_public_read ON public.dictionary;
CREATE POLICY dictionary_public_read ON public.dictionary FOR SELECT USING (true);

DROP POLICY IF EXISTS sentences_public_read ON public.sentences;
CREATE POLICY sentences_public_read ON public.sentences FOR SELECT USING (is_active);

DROP POLICY IF EXISTS user_progress_owner_select ON public.user_progress;
CREATE POLICY user_progress_owner_select ON public.user_progress FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS word_progress_owner_select ON public.word_progress;
CREATE POLICY word_progress_owner_select ON public.word_progress FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS placement_session_owner_select ON public.placement_session;
CREATE POLICY placement_session_owner_select ON public.placement_session FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS placement_level_attempt_owner_select ON public.placement_level_attempt;
CREATE POLICY placement_level_attempt_owner_select ON public.placement_level_attempt FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.placement_session s
                   WHERE s.id = session_id AND s.user_id = auth.uid()));

DROP POLICY IF EXISTS pronunciation_attempts_owner_select ON public.pronunciation_attempts;
CREATE POLICY pronunciation_attempts_owner_select ON public.pronunciation_attempts FOR SELECT USING (auth.uid() = user_id);

-- Public read for the image bucket (the app builds public URLs to these files).
DROP POLICY IF EXISTS "imagesTurtle public read" ON storage.objects;
CREATE POLICY "imagesTurtle public read" ON storage.objects FOR SELECT USING (bucket_id = 'imagesTurtle');
