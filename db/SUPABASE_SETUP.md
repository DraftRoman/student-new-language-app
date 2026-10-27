# Setting up a new Supabase project for TurtleTalk

You need about 15 minutes. The files are in this `db/` folder:

- `01_setup.sql`: all 7 tables, indexes, security rules (RLS) and the `imagesTurtle` image bucket
- `02_seed_dictionary.sql`: 362 starter words (Spanish for all, Russian for 64, emoji for 241, pictures linked for 39)

Both were tested on Postgres 16. They are safe to run twice.

## 1. Create the project

supabase.com → **New project**. Pick a region near you and **save the database
password** somewhere safe (you need it for backups later).

## 2. Create the tables and rules

1. Left menu → **SQL Editor** → **New query**.
2. Paste the whole of `01_setup.sql` → **Run**. It should say "Success".
3. New query again → paste `02_seed_dictionary.sql` → **Run**.
4. Check: **Table Editor** shows `dictionary` with 362 rows.

What the security rules do: the word lists can be read by anyone, and each user can
only read their own progress. All writes go through the backend, which uses the secret
key, so no extra rules are needed.

## 3. Turn on login

**Authentication → Sign In / Providers → Email**: keep it enabled. While you develop,
switch off **Confirm email** so new accounts work without a confirmation email.

**Authentication → URL Configuration → Site URL**: `http://localhost:5173`
(change it to the real domain when you deploy).

## 4. Copy the keys into the app

**Project Settings → API Keys**. Use the **Legacy API keys** tab (the `anon` and
`service_role` keys that start with `eyJ...`).

> ⚠️ Don't use the new `sb_publishable_...` / `sb_secret_...` keys yet. The backend
> checks that the key looks like a JWT (`eyJ...`), and if it doesn't, it quietly
> switches to an empty stub database without showing an error.

`backend/.env`:
```
SUPABASE_URL=https://<your-new-ref>.supabase.co
SUPABASE_SERVICE_KEY=<service_role key>
CORS_ORIGINS=["http://localhost:5173"]
STORAGE_BUCKET=imagesTurtle
```

`frontend/.env`:
```
VITE_SUPABASE_URL=https://<your-new-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Also update the root `.env` if you use `seed-images.js` or docker compose. Never share
the `service_role` key or put it in the frontend.

## 5. Upload the pictures

The bucket `imagesTurtle` is created by step 2, but it is empty. Upload the 41 images
into a folder named `family/` inside it (**Storage → imagesTurtle → Create folder**),
with the file names listed in `seed-images.js` (e.g. `family/man.webp`). If you don't
have the image files locally, check the `project-languages` repo (commit "iamges added").
Until they are uploaded, the picture modes of the word game will show broken images.

## 6. Start the app and test

Start the backend and frontend (see the main `README.md`), sign up, and play the word
match game.

## What will still be missing

- **Sentences:** the `sentences` table is empty, so the Sentence Builder will say
  "No sentences found". The sentences were never stored in this repo. Look for
  `seed-sentences.js` in `project-languages`, or write new ones.
- **Example sentences** in `dictionary.example` are empty for the same reason.
- **Word types:** every word is marked `noun` (the lists are all nouns).
- Old user accounts and progress can't be recovered; people need to sign up again.
