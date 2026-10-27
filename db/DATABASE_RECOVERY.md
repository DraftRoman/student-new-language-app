# Database recovery notes (TurtleTalk)

What the project files tell us about the lost Supabase database, checked on 2026-10-23
in `student-new-language-app` (branch `task/init`).

## 1. Which Supabase project it was

- Project ref: **`qmqxruztxfzeygftxlaw`**, found in `docs/placement/session-handoff.md`.
  The URL would be `https://qmqxruztxfzeygftxlaw.supabase.co`.
- The real URL and keys should be in `backend/.env`, `frontend/.env` and the root `.env`
  on your laptop. They are not in git, so I haven't seen them.
- Storage bucket: `imagesTurtle` (public). Image files are under `family/...` (41 images,
  listed in `seed-images.js`).

## 2. Tables (structure)

The full SQL is in [`01_setup.sql`](01_setup.sql) (tables + security rules), with starter words in [`02_seed_dictionary.sql`](02_seed_dictionary.sql). Setup steps: [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md).

| Table | Source | How sure |
|---|---|---|
| `dictionary` | inferred from code | columns sure, types are guesses |
| `sentences` | inferred from code | columns sure, types are guesses |
| `user_progress` | inferred from code | columns sure, types are guesses |
| `word_progress` | inferred from code | columns sure, types are guesses |
| `placement_session` | `backend/migrations/001` | exact |
| `placement_level_attempt` | `backend/migrations/001` | exact |
| `pronunciation_attempts` | `backend/migrations/002` | exact |

Shapes of the JSON columns (taken from the code):

- `dictionary.translation`: `{"es": "el hombre", "ru": "мужчина", "emoji": "👨"}`
- `dictionary.example`: `{"en": ["..."], "es": ["..."], "ru": ["..."]}` (parallel arrays)
- `dictionary.image_meta_data`: `{"bucket", "storage_path", "alt_text", "mime_type", "tags": []}`
- `sentences.words`: `[{"form": "The", "word_type": "noun", "position": 0}, ...]`

## 3. Data you can still recover from the repo

| Data | File | Amount |
|---|---|---|
| English → Spanish words | `dictionary-en-es.json` (root, newest) | 366 words, 7 categories |
| English → Russian | `dictionary-en-ru.json` | 67 words |
| Spanish → Russian | `dictionary-es-ru.json` | 50 words |
| Spanish → emoji | `dictionary-es-emojis.json` | 248 words |
| Word → image mapping + alt text/tags | `seed-images.js` | 41 images |
| Word type colours | `word_type.py` | 8 types |
| Placement test questions | `backend/tests/fixtures/placement/content.json` | fixture set |
| Lesson stub | `lessons.json` | 2 lessons |

**Not in this repo:** the `sentences` rows and the `dictionary.example` sentences. The
old server's error message points to a `seed-sentences.js` script, and the
`project-languages` git log has a commit "add:seed-sentences" (Zhenishai, 2026-05-19).
So that script, and possibly SQL models in `project-languages/backend/models`, are the
best place to look next.

## 4. Other places the real data may still be

1. **A local Postgres on your laptop.** `mover.py` imports the dictionary into a local
   database named `Languages` (`postgres@localhost:5432`). If that database still
   exists, it may hold a full copy of `dictionary`. Check with
   `psql -U postgres -d Languages -c "\dt"`.
2. **The keys in your `.env` files.** If the Supabase project still exists and the
   service-role key in `backend/.env` still works, the whole schema and data can be
   exported through the API without logging in to the dashboard:
   - schema: `GET https://<ref>.supabase.co/rest/v1/` with headers
     `apikey: <service key>` and `Authorization: Bearer <service key>` returns an
     OpenAPI document with every table, column and type;
   - data: `GET /rest/v1/dictionary?select=*` (and the same for each table).
3. **Supabase support / a paused project.** If you lost the account login (not the
   project), use password reset or GitHub login, or contact support@supabase.com with
   the project ref above. Free projects that were paused for inactivity can usually be
   restored from the dashboard for up to 90 days.
4. **Your teammates.** Commits come from Roman, Alexander (upstream
   `AliaksandrTech/student-new-language-app`) and Zhenishai. Someone may still be a
   member of the Supabase project or have a `.env`.
