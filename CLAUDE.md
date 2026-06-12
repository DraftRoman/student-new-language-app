# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

"TurtleTalk" — a language-learning web app with two word/sentence games. Two independent processes:

- **Backend** (`/backend`) — Python 3.12 / FastAPI / Uvicorn on port 8000. Routes split across `app/routers/`.
- **Frontend** (`/frontend`) — Vite + React 19 + TypeScript + Tailwind v4 on port 5173. Vite proxies `/api` → `http://localhost:8000` (override with `VITE_API_PROXY_TARGET`), so both processes must run for the app to work end-to-end.

Both talk to **Supabase** (Postgres + Auth + Storage). The backend uses the service-role key; the frontend uses the anon key and the JS SDK for auth.

## Commands

### Backend (run from `backend/`)

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000
.venv/bin/pytest -q                # tests
.venv/bin/ruff check .             # lint
.venv/bin/mypy app                 # types
```

Requires `backend/.env` (or root `.env` when running via docker compose) with `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`. See `backend/.env.example`. OpenAPI UI: `http://localhost:8000/docs`.

### Frontend (run from `frontend/`)

```bash
npm run dev            # Vite dev server on :5173 (proxies /api → :8000)
npm run build          # tsc -b && vite build
npm run lint           # eslint .
npm run test           # vitest (jsdom + @testing-library/react)
npm run test -- <file> # run a single test file
npm run preview        # serve the production build
```

Requires `frontend/.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### Docker

`docker-compose.yml` builds **both** services: `frontend` (5173, hot reload via volume mount) and `backend` (8000, uvicorn `--reload`). The backend reads the root-level `.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`); inside the compose network the frontend reaches it at `http://backend:8000`.

```bash
docker compose up --build
docker compose down
docker exec -it language-app-frontend npm run test
docker exec -it language-app-backend pytest -q
```

### Data seeding

`seed-images.js` is a one-shot Node script that populates Supabase storage/db. Run with `node --env-file=.env seed-images.js` (flags: `--dry-run`, `--reset`). It is **not** part of the runtime — kept around for occasional reseeds; if you maintain it long-term, consider porting to Python alongside the rest of the backend.

## Architecture

### Backend (`backend/app/`) — Domain-Driven Design

Organized by **bounded context**, each split into four layers (domain → application → infrastructure → presentation):

```
app/
├── main.py             # FastAPI bootstrap, CORS, router wiring, /api/health
├── config.py           # pydantic-settings (env-loaded)
├── shared/
│   ├── exceptions.py             # DomainError, NotFoundError, UnauthorizedError, ValidationError
│   └── infrastructure/supabase_client.py  # Supabase client (or stub when env is placeholder)
└── modules/
    ├── identity/                 # bounded context: who is calling
    │   ├── domain/{entities,repositories}.py     # AuthenticatedUser, IdentityProvider protocol
    │   ├── infrastructure/supabase_identity.py   # SupabaseIdentityProvider
    │   └── presentation/dependencies.py          # current_user FastAPI dep
    ├── catalog/                  # bounded context: read-only content (dictionary, sentences)
    │   ├── domain/{entities,value_objects,repositories}.py  # Sentence, DictionaryEntry, LANG_MAP, repo protocols
    │   ├── application/{dtos,use_cases}.py       # ListSentencesUseCase, GetWordMatchUseCase
    │   ├── infrastructure/supabase_repositories.py
    │   └── presentation/{dependencies,router}.py # /api/game/*
    └── progress/                 # bounded context: spaced-repetition state (core domain)
        ├── domain/
        │   ├── value_objects.py  # Mastery (clamped 0–5, days_until_next_review = 2^level)
        │   ├── entities.py       # SentenceProgress, WordProgress aggregates
        │   ├── services.py       # SpacedRepetition: initial_/apply_{sentence,word}_attempt
        │   └── repositories.py   # SentenceProgressRepository, WordProgressRepository protocols
        ├── application/{dtos,use_cases}.py
        ├── infrastructure/supabase_repositories.py
        └── presentation/{dependencies,router}.py # /api/progress/*
```

**Layer rules** (enforce on review):

- **domain/** — pure Python, no FastAPI / Supabase / HTTP imports. Holds value objects (`Mastery`), entities (`SentenceProgress`), domain services (`SpacedRepetition`), and repository **protocols** (interfaces).
- **application/** — orchestrates domain via repositories. Use-case classes named `<Verb><Noun>UseCase`. No framework imports.
- **infrastructure/** — concrete adapters: Supabase repository implementations, external API clients. These satisfy the domain protocols.
- **presentation/** — FastAPI routers + DI factories (`Depends`). Maps `DomainError` subclasses to HTTP codes; never reaches into Supabase directly.

**Why the value objects matter:** spaced-repetition math is encapsulated in [Mastery](backend/app/modules/progress/domain/value_objects.py) (`adjusted()` clamps 0–5, `days_until_next_review` is `2^level`) and [SpacedRepetition](backend/app/modules/progress/domain/services.py). These are tested with **pure unit tests** ([tests/test_domain_progress.py](backend/tests/test_domain_progress.py)) — no FastAPI, no Supabase, no HTTP.

**Testing pattern:** integration tests override repositories and the identity provider via [FastAPI `app.dependency_overrides`](backend/tests/conftest.py) — no monkey-patching of Supabase modules. Fixtures `sentence_repo`, `dictionary_repo`, `sentence_progress_repo`, `word_progress_repo`, `identity_provider` are pre-wired in `conftest.py`.

Endpoints (contract preserved from the previous Node backend):

- `GET /api/game/sentences?level=` — joins `sentences` with `dictionary` via `dict_id` and derives `full_text` / `translation` from `dictionary.example` at `example_index`. The sentence row itself does NOT store the text — it's always resolved through the dictionary join. Keep this invariant when adding fields.
- `GET /api/game/wordmatch?language=&limit=` — `LANG_MAP` in [backend/app/modules/catalog/domain/value_objects.py](backend/app/modules/catalog/domain/value_objects.py) is the source of truth for supported language pairs (`en-es`, `en-ru`, `es-ru`, `es-emojis`, plus 4 image modes). `imageMode` tells the frontend whether question/answer is an image URL. Image paths are resolved to Supabase Storage URLs under the `imagesTurtle` bucket via `resolve_image_url()`.
- `POST /api/progress/sentence` (auth) — **spaced-repetition logic** lives in the `progress` domain layer ([Mastery](backend/app/modules/progress/domain/value_objects.py), [SpacedRepetition](backend/app/modules/progress/domain/services.py)). Don't duplicate this on the client.
- `GET /api/progress/sentences` (auth) — returns a map keyed by `exercise_id`.
- `POST /api/progress/word` (auth) — increments `attempts` / `correct_count` on `word_progress`, keyed by `(user_id, lemma, language)`.

The `current_user` dependency validates a `Bearer` token via the `IdentityProvider` protocol (default impl: `SupabaseIdentityProvider`). The frontend obtains the token via `supabase.auth.getSession()` in `lib/progressService.ts`.

Supabase tables referenced: `sentences`, `dictionary`, `user_progress`, `word_progress`. Storage bucket: `imagesTurtle`.

### Frontend (`frontend/src`)

- **Routing** (`App.tsx`) — `BrowserRouter` with a `RootLayout` (navbar + footer) wrapping a `ProtectedRoute` → `ProtectedLayout` for `/dashboard`, `/game`, `/sentence-builder`. Unauthenticated users get redirected to `/`. Auth state is gated by `loading` from `AuthContext` — show a spinner, don't redirect, while loading.
- **Auth** (`context/AuthContext.tsx`, `lib/authApi.ts`, `lib/supabase.ts`) — auth runs entirely against Supabase JS SDK on the client. The backend only verifies tokens; it never issues them. `AuthContext` subscribes to `onAuthStateChange` and exposes `user`, `login`, `register`, `logout`, `changePassword`.
- **Theming** (`context/ThemeContext.tsx`) — light/dark via CSS variables. Components reference colors as `var(--bg-base)`, `var(--text-primary)`, `var(--c-orange)` etc. Don't hardcode hex values for theme-aware UI.
- **Component layout** — `components/atoms/` (Button, Avatar, Badge, Logo), `components/organisms/` (AppNavbar, AuthModal, ProtectedLayout), `components/ui/` (GlassCard, Alert, Input, ModalBackdrop, GradientText). Style modules in `css/*.styles.ts` are TS files exporting className strings, separate from the global `globals.css` / `game.css` / `turtle.css`.
- **Games**:
  - `pages/Game.tsx` — Word-match. The `langMap` here mirrors the backend's; if you add a language pair, update **both**.
  - `pages/SentenceGame.tsx` — Drag-and-drop sentence assembly. Words carry a `word_type` (matches `word_type.py` enum) used for colored chips.
- **Progress writes** (`lib/progressService.ts`) — fire-and-forget; failures are swallowed in callers (`.catch(() => {})`). Don't block UI on these.

### Repo-root files worth knowing

- `dictionary-*.json` at repo root and `dictionary.js` are **legacy** offline dictionaries from a pre-Supabase version. New dictionary data lives in the Supabase `dictionary` table. The active runtime dictionaries served to the frontend are under `frontend/public/dictionaries/`.
- `word_type.py`, `mover.py` — standalone Python utilities, not part of the runtime.
- `seed-images.js` — Node seeder for the Supabase `images` table + storage bucket (not part of the runtime).
- `.github/workflows/ci.yml` — three jobs: backend (ruff + mypy + pytest), frontend (eslint + vitest + vite build), docker (buildx sanity check of both images).

## Conventions

- **Backend**: Python 3.12, FastAPI, DDD layout (see above); type-checked with mypy, linted with ruff (config in `backend/pyproject.toml`). Env loaded via `pydantic-settings` from `.env`. Use `Depends(current_user)` for any auth-protected route.
- **Adding a feature**: pick the right bounded context. New domain rules go in `domain/`; new Supabase tables in `infrastructure/`; new endpoints in `presentation/router.py` wired via `presentation/dependencies.py`. Don't reach across context boundaries — if `progress` needs a sentence, go through a repository or duplicate the small read.
- **Frontend**: ESM, `"type": "module"` in `frontend/package.json`. Use `import`, not `require`.
- **Adding a language pair to word-match**: edit `LANG_MAP` in [backend/app/modules/catalog/domain/value_objects.py](backend/app/modules/catalog/domain/value_objects.py) *and* the `LANGUAGES`/`Language` type union in `frontend/src/pages/Game.tsx`.
- **Adding a sentence**: insert into `sentences` with `dict_id` + `example_index` pointing at an existing `dictionary.example` entry — don't denormalize `full_text` onto the sentence row.
- **Tests**: backend tests in `backend/tests/` (pytest). Frontend tests colocated as `*.test.tsx` next to components, setup in `frontend/src/setupTests.ts`.
</content>
</invoke>