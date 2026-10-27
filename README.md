# TurtleTalk: student-new-language-app

TurtleTalk is a language-learning web app for kids and adults. It grew out of
[`project-languages`](https://github.com/DraftRoman/project-languages): this
version replaces the old Node/Express server with a Python FastAPI backend
built in a Domain-Driven Design layout, and adds a placement test and a
pronunciation check.

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind v4 (`frontend/`, port 5173)
- **Backend:** Python 3.12, FastAPI, Uvicorn (`backend/`, port 8000)
- **Data / auth:** Supabase (Postgres, Auth, Storage bucket `imagesTurtle`)
- **Speech-to-text:** faster-whisper (free, runs locally, no paid API)

Repositories: `origin` = `DraftRoman/student-new-language-app`,
`upstream` = `AliaksandrTech/student-new-language-app`. Active branch: `task/init`
(2 commits ahead of `main`: the pronunciation feature and a dependency update).

---

## 1. Current stage

**Stage: late prototype / alpha.** The backend is solid and well tested. The
frontend has working games, but the production build is broken, some tests fail,
and two of the four features can't be reached from the UI. It runs locally
(confirmed 2026-10-24 against a fresh Supabase project), but it is not deployable yet.

Checked on 2026-10-23 against a clean copy of the `task/init` branch:

| Check | Result |
|---|---|
| Backend `pytest` | ✅ 172 passed |
| Backend `ruff check .` | ✅ clean |
| Backend `mypy app` | ✅ no issues (76 files) |
| Frontend `vitest run` | ❌ 1 test fails, 2 test files can't load, plus duplicate runs from `dist-app/` |
| Frontend `eslint .` | ❌ 9 errors |
| Frontend `tsc -b` | ❌ 8 type errors |
| Frontend `vite build` | ❌ fails (CSS minify error in `landing.css`) |

### Features

"Works" means the code and backend tests are in place. Sign up and the word match
game were also checked by hand in the browser on 2026-10-24.

| Feature | Route | Backend | Frontend | Status |
|---|---|---|---|---|
| Sign up / log in | modal on `/` | token check (`identity`) | Supabase JS SDK | ✅ Works |
| Word match game (en-es, en-ru, es-ru, emoji/image modes) | `/game` | `GET /api/game/wordmatch` | `Game.tsx` | ✅ Works (image modes need the pictures uploaded) |
| Sentence builder (drag and drop) | `/sentence-builder` | `GET /api/game/sentences` | `SentenceGame.tsx` | ⚠️ Code works, but the `sentences` table is empty in the new database |
| Spaced-repetition progress | (in the games) | `/api/progress/*` | `progressService.ts` | ✅ Works |
| Placement test (A1–C2) | `/onboarding/placement` | `/api/placement/*` | `pages/placement/` | ⚠️ Code done, no link in UI, uses fixture content |
| Pronunciation check | `/speaking` | `POST /api/v1/pronunciation/check` | `pages/speaking/` | ⚠️ Code done, no link in UI, demo exercise only |
| Lessons / courses | none | none | none | ❌ Not started (`lessons.json` is a stub) |
| Dashboard shows user's level | none | none | none | ❌ Not started |

---

## 2. How to start it

### Prerequisites

- Python **3.12** (the project's `.venv` uses it; don't run with a global 3.13/3.14)
- Node **20+** (22 recommended)
- A Supabase project (see 2.1)

### 2.1 Set up Supabase (one time)

The original Supabase project was lost, so the database is now created from
SQL files in `db/`. Follow **[db/SUPABASE_SETUP.md](db/SUPABASE_SETUP.md)**. In short:

1. Create a new project on supabase.com.
2. SQL Editor → run `db/01_setup.sql` (all 7 tables, security rules, `imagesTurtle` bucket).
3. SQL Editor → run `db/02_seed_dictionary.sql` (362 starter words).
4. Authentication → keep Email on; for development turn off "Confirm email".
5. Upload the pictures to the `imagesTurtle` bucket under `family/` (see `seed-images.js`).

`db/01_setup.sql` already includes `backend/migrations/001` and `002`, so you
don't need to run those separately. `db/DATABASE_RECOVERY.md` explains how the
schema was rebuilt and what data is still missing (sentences, example sentences).

### 2.2 Configure environment

Keys are in Supabase → **Project Settings → API Keys**. There are two kinds and
they go in different files:

| Key | Public or private | File and variable |
|---|---|---|
| `sb_publishable_...` or legacy `anon` | public | `frontend/.env` → `VITE_SUPABASE_ANON_KEY` |
| legacy `service_role` (`eyJ...`) | **private** | `backend/.env` → `SUPABASE_SERVICE_KEY` |

```bash
# backend/.env
cp backend/.env.example backend/.env
#   SUPABASE_URL=https://<project-id>.supabase.co
#   SUPABASE_SERVICE_KEY=<legacy service_role key, starts with eyJ>

# frontend/.env
cp frontend/.env.example frontend/.env
#   VITE_SUPABASE_URL=https://<project-id>.supabase.co
#   VITE_SUPABASE_ANON_KEY=<publishable or anon key>
```

- The project ID is in the dashboard address bar (`/dashboard/project/<id>`).
- No quotes or spaces around `=`.
- Use the **legacy** `service_role` key for the backend. The backend only accepts
  keys that look like a JWT (`eyJ...`). With an `sb_secret_...` key it silently
  falls back to an empty stub database.
- Never put the private key in the frontend, and never commit `.env` files
  (they are in `.gitignore`).
- Vite reads `.env` only at startup, so restart `npm run dev` after editing it.

### 2.3 Run the backend (terminal 1)

Always run it **from the `backend` folder** with the virtual environment active,
otherwise you get `ModuleNotFoundError: No module named 'app'`.

```bash
cd backend
python -m venv .venv                 # first time only
# activate it:
#   Windows PowerShell / CMD:  .venv\Scripts\activate
#   Git Bash on Windows:       source .venv/Scripts/activate
#   macOS / Linux:             source .venv/bin/activate
pip install -r requirements.txt      # first time only
uvicorn app.main:app --reload --port 8000
```

Leave this terminal open. Check it with:

- http://127.0.0.1:8000/api/health → `{"status":"ok"}`
- http://127.0.0.1:8000/docs → all endpoints
- http://127.0.0.1:8000/api/game/wordmatch?language=en-es → 5 word pairs from Supabase

Opening http://127.0.0.1:8000/ itself gives `404 Not Found`. That is normal.

The first pronunciation check downloads the Whisper `base` model (~150 MB) and
uses ~1 GB RAM. Set `STT_WARMUP_ON_STARTUP=true` to load it on startup.

### 2.4 Run the frontend (terminal 2)

In a second terminal, while the backend keeps running:

```bash
cd frontend
npm install          # first time only
npm run dev          # http://localhost:5173
```

The Vite dev server forwards every `/api/...` request to the backend at
`http://127.0.0.1:8000` (`server.proxy` in `frontend/vite.config.ts`). Use
`127.0.0.1`, not `localhost`: on Windows, Node may resolve `localhost` to IPv6
while uvicorn listens on IPv4.

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `502 (Bad Gateway)` on `/api/...` in the browser, and `ECONNREFUSED 127.0.0.1:8000` in the Vite terminal | Backend isn't running | Start it (2.3) and keep its terminal open |
| `502` and `ECONNREFUSED ...:3001` | Old proxy setting | Set the proxy target to `http://127.0.0.1:8000` and restart `npm run dev` |
| `Invalid API key` / `401` on `.../auth/v1/token` when logging in | Wrong key in `frontend/.env` (the private key, an old project's key, or Vite not restarted) | Use the publishable/anon key, then restart `npm run dev` |
| Vite starts on 5174 instead of 5173 | Something else (usually the Docker frontend) is on 5173 | `docker compose down`, then restart `npm run dev` |
| `container name "/language-app-frontend" is already in use` | Old container with the same name (also used by `project-languages`) | `docker rm -f language-app-frontend` |
| `ModuleNotFoundError: No module named 'app'` | uvicorn started outside `backend/` or without `.venv` | `cd backend`, activate `.venv`, run again |
| Sentence Builder says "No sentences found" | `sentences` table is empty in the new database | Add sentences (see `db/DATABASE_RECOVERY.md`) |

### 2.5 Tests and checks

```bash
# backend
cd backend
pytest -q
ruff check .
mypy app

# frontend
cd frontend
npx vitest run
npm run lint
npm run build
```

### 2.6 Docker

Not recommended yet. `docker-compose.yml` only defines the **frontend**
service, so the app doesn't work in Docker (see fix #2). Use the two terminals
above. If you started it, stop it with `docker compose down`.

---

## 3. Project layout

```
backend/
  app/
    main.py, config.py           FastAPI app, settings from .env
    shared/                      exceptions, Supabase client (stub if not configured)
    modules/                     one folder per bounded context, 4 layers each
      identity/                  who is calling (Bearer token → user)
      catalog/                   dictionary + sentences (read only)
      progress/                  spaced repetition (Mastery 0–5, review in 2^level days)
      placement/                 placement test (A1–C2 ladder, scoring)
      speaking/                  pronunciation check (faster-whisper + WER scoring)
  migrations/                    SQL to paste into Supabase (also included in db/01_setup.sql)
  tests/                         pytest, fakes injected via dependency_overrides
frontend/
  src/pages/                     Landing, Dashboard, Game, SentenceGame, placement/, speaking/
  src/components/                atoms/, organisms/, ui/
  src/lib/                       API clients (progress, placement, pronunciation, analytics)
db/                              full Supabase setup: 01_setup.sql, 02_seed_dictionary.sql, setup + recovery guides
docs/, stories/, roles/          product stories, placement decisions and handoff notes
report.md                        pronunciation feature documentation (Russian)
server.js, package.json,
dictionary*.json, dictionary.js  LEGACY Node backend and offline data (not used by the new backend)
seed-images.js, mover.py,
word_type.py                     one-off data scripts
```

Each backend module follows `domain → application → infrastructure →
presentation`. Domain code is pure Python (no FastAPI or Supabase imports).
See `CLAUDE.md` for the full conventions.

---

## 4. Recommendations

### 4.1 Fix first (blocking)

1. ~~**Point the Vite proxy at the FastAPI backend.**~~ ✅ Done (2026-10-24):
   `frontend/vite.config.ts` now proxies `/api` to `http://127.0.0.1:8000`
   instead of the old Node server on 3001. A possible follow-up is to read
   `VITE_API_PROXY_TARGET` so Docker can point it at `http://backend:8000`.
2. **Add the backend to `docker-compose.yml`.** Only `frontend` is defined. Add
   a `backend` service (build `./backend`, port 8000, `env_file: backend/.env`)
   and set `VITE_API_PROXY_TARGET=http://backend:8000` on the frontend.
3. **Fix the production build.** `src/css/landing.css` line 87 has an inline SVG
   data URI with `url("%23g")` that lightningcss can't parse. Move the SVG to
   `src/assets/` and reference it as a file, or encode the whole URI.
4. **Stop committing build output.** `frontend/dist-app/`, `frontend/dist-node/`
   and `frontend/tsconfig.tsbuildinfo` are tracked in git, and vitest runs the
   compiled `dist-app/*.test.js` files too. Remove `outDir` from
   `tsconfig.app.json` / `tsconfig.node.json` and add `"noEmit": true`,
   `git rm -r --cached` those folders, and add them to `.gitignore`.
5. **Make the frontend tests pass.**
   - Add `@testing-library/user-event` to `devDependencies` (the placement and
     speaking tests import it, but it isn't installed).
   - Mock `IntersectionObserver` in `src/setupTests.ts` (needed by `Landing.tsx`).
   - Add `exclude: ['dist-*/**', 'node_modules/**']` in `vitest.config.ts`.
6. **Fix the 8 TypeScript errors and 9 ESLint errors**: type-only imports in
   `AuthContext.tsx`, unused `idx` in `Game.tsx`, type the fetch result in
   `SentenceGame.tsx`, remove `any`s, add the missing `react-hooks` plugin rule.
7. ~~**Apply the SQL migrations.**~~ ✅ Done: the new Supabase project was created
   from `db/01_setup.sql`, which includes both migrations.
7a. **Restore the sentence data.** The `sentences` table and `dictionary.example`
   are empty after the database loss. Look for `seed-sentences.js` in the
   `project-languages` history or write new sentences.

### 4.2 Clean up

8. **Archive the legacy Node code.** Now that `vite.config.ts` points at 8000, nothing uses it. Move `server.js`, root `package.json` /
   `package-lock.json`, `dictionary*.json` and `dictionary.js` into a `legacy/`
   folder (or drop them; they live on in `project-languages`). They confuse
   which backend is real.
9. **Update `CLAUDE.md`.** It mentions `app/routers/`, a docker-compose with both
   services and a `.github/workflows/ci.yml` that don't exist, and doesn't list
   the `placement` and `speaking` modules.
10. **Remove `--reload` from the backend Dockerfile** `CMD` (dev only), and drop
    the `version:` key from `docker-compose.yml` (obsolete).
11. **Upgrade the Supabase Python SDK.** `supabase==2.10.0` pulls in the
    deprecated `gotrue` package (warning in every test run).
12. **Commit or discard** the uncommitted `frontend/package-lock.json` change
    and the untracked `diagram.json`.

### 4.3 Upgrade (next features)

13. **Add CI.** A GitHub Actions workflow with three jobs: backend (ruff, mypy,
    pytest), frontend (eslint, vitest, build), and a docker build check. The
    backend is already green, so this protects it right away.
14. **Make placement and speaking reachable.** Add cards on the Dashboard and
    links in `AppNavbar`; send new users to `/onboarding/placement` after sign-up.
15. **Use the placement result.** Add `GET /api/me/level` and show the level on
    the Dashboard, and use it to choose word/sentence difficulty.
16. **Build lessons.** There is no lesson/course system yet (`lessons.json` is a
    2-item stub). This is the biggest missing piece: a `lessons` bounded
    context (lesson → exercises: word match, sentence, speaking) with progress
    per lesson. It also unblocks putting the pronunciation exercise inside
    lessons (story S5.2).
17. **Move placement content into Supabase.** Placement questions come from
    `backend/tests/fixtures/placement/content.json`. Add CEFR level and
    construction-type columns to `dictionary` / `sentences` so real content
    can be used.
18. **Kid-friendly mode.** The audience includes kids: add a simpler UI mode
    with bigger buttons, more images/emoji modes (already supported by the
    word-match game), audio for every word (`useSpeechSynthesis` exists), and
    stars/streak rewards.
19. **Deploy.** Frontend to Vercel/Netlify/Cloudflare Pages; backend as a
    Docker container (Fly.io, Railway, Render) with at least 1–2 GB RAM for
    Whisper and `STT_WARMUP_ON_STARTUP=true`. Restrict `CORS_ORIGINS` to the
    real domain.
20. **Real analytics and i18n.** Plug a real sink into `setAnalyticsSink()` in
    `lib/analytics.ts`, and move the `copy.ts` files to `react-i18next` so the
    UI can be shown in Russian/Spanish as well as English.
