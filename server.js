import http       from 'http';
import express    from 'express';
import cors       from 'cors';
import { createClient } from '@supabase/supabase-js';

const app      = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

app.use(cors());
app.use(express.json());

const STORAGE_BASE = `${process.env.SUPABASE_URL}/storage/v1/object/public`;

function imageUrl(storagePath) {
  if (!storagePath) return null;
  return storagePath.startsWith('http')
    ? storagePath
    : `${STORAGE_BASE}/${storagePath}`;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }
  const token = header.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
  req.user = user;
  next();
}

app.get('/api/game/sentences', async (req, res) => {
  try {
    const level = req.query.level ?? null;

    // Join dictionary so we can derive full_text and translation from
    // dictionary.example instead of storing them on the sentences row.
    let query = supabase
      .from('sentences')
      .select('id, level, words, dict_id, example_index, dictionary!dict_id(example)')
      .eq('is_active', true);

    if (level) query = query.eq('level', level);

    const { data, error } = await query;

    if (error) {
      console.error('❌ sentences fetch error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    if (!data?.length) {
      return res.status(404).json({
        error: 'No sentences found. Run: node --env-file=.env seed-sentences.js',
      });
    }

    const sentences = data.map(row => {
      const ex  = row.dictionary?.example ?? {};
      const idx = row.example_index ?? 0;
      return {
        id:          row.id,
        level:       row.level,
        full_text:   ex.en?.[idx] ?? '',
        translation: { es: ex.es?.[idx] ?? null, ru: ex.ru?.[idx] ?? null },
        words:       row.words,
      };
    });

    res.json({ sentences });
  } catch (err) {
    console.error('Game sentences error:', err);
    res.status(500).json({ error: 'Could not load sentences.' });
  }
});

app.get('/api/game/wordmatch', async (req, res) => {
  try {
    const language = req.query.language ?? 'en-es';
    const limit    = Math.min(parseInt(req.query.limit ?? '5', 10), 20);

    const langMap = {
      'en-es':     { q: 'lemma', a: 'es',    imageMode: null       },
      'en-ru':     { q: 'lemma', a: 'ru',    imageMode: null       },
      'es-ru':     { q: 'es',    a: 'ru',    imageMode: null       },
      'es-emojis': { q: 'es',    a: 'emoji', imageMode: null       },
      'en-image':  { q: 'lemma', a: 'image', imageMode: 'answer'   },
      'es-image':  { q: 'es',    a: 'image', imageMode: 'answer'   },
      'image-en':  { q: 'image', a: 'lemma', imageMode: 'question' },
      'image-es':  { q: 'image', a: 'es',    imageMode: 'question' },
    };

    const config = langMap[language];
    if (!config) return res.status(400).json({ error: `Unknown language: ${language}` });

    const isImageMode = config.imageMode !== null;

    let query = supabase.from('dictionary').select('lemma, translation, image');
    if (isImageMode) query = query.not('image', 'is', null);
    query = query.limit(50);

    const { data, error } = await query;

    if (error) return res.status(500).json({ error: error.message });
    if (!data?.length) return res.status(404).json({ error: 'No words found.' });

    function resolve(row, field) {
      if (field === 'lemma')  return row.lemma;
      if (field === 'image')  return imageUrl(`imagesTurtle/${row.image}`);
      return row.translation?.[field];   // es, ru, emoji …
    }

    const pool = data
      .map(row => ({
        question: resolve(row, config.q),
        answer:   resolve(row, config.a),
      }))
      .filter(p => p.question && p.answer);

    if (!pool.length) return res.status(404).json({ error: `No words found for "${language}". The dictionary may not have those translations yet.` });

    const pairs = shuffle(pool).slice(0, limit);
    res.json({ pairs, imageMode: config.imageMode });
  } catch (err) {
    console.error('Word match error:', err);
    res.status(500).json({ error: 'Could not load word pairs.' });
  }
});

app.post('/api/progress/sentence', authMiddleware, async (req, res) => {
  try {
    const { exercise_id, correct } = req.body;
    const user_id = req.user.id;

    if (!exercise_id) {
      return res.status(400).json({ error: 'exercise_id is required.' });
    }

    const { data: existing } = await supabase
      .from('user_progress')
      .select('id, attempts, correct_count, mastery_level')
      .eq('user_id', user_id)
      .eq('exercise_id', exercise_id)
      .maybeSingle();

    if (!existing) {
      await supabase.from('user_progress').insert({
        user_id,
        exercise_id,
        attempts:          1,
        correct_count:     correct ? 1 : 0,
        mastery_level:     correct ? 1 : 0,
        next_review_at:    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        last_attempted_at: new Date().toISOString(),
      });
    } else {
      const newMastery      = Math.max(0, Math.min(5, existing.mastery_level + (correct ? 1 : -1)));
      const daysUntilReview = Math.pow(2, newMastery);
      const nextReview      = new Date(Date.now() + daysUntilReview * 24 * 60 * 60 * 1000).toISOString();

      await supabase.from('user_progress').update({
        attempts:          existing.attempts + 1,
        correct_count:     existing.correct_count + (correct ? 1 : 0),
        mastery_level:     newMastery,
        next_review_at:    nextReview,
        last_attempted_at: new Date().toISOString(),
      }).eq('id', existing.id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Progress save error:', err);
    res.status(500).json({ error: 'Could not save progress.' });
  }
});

app.get('/api/progress/sentences', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('exercise_id, attempts, correct_count, mastery_level, last_attempted_at')
      .eq('user_id', req.user.id);

    if (error) return res.status(500).json({ error: error.message });

    const progress = {};
    for (const row of data ?? []) {
      progress[row.exercise_id] = {
        attempts:       row.attempts,
        correct:        row.correct_count,
        mastery:        row.mastery_level,
        last_attempted: row.last_attempted_at,
      };
    }

    res.json({ progress });
  } catch (err) {
    console.error('Progress fetch error:', err);
    res.status(500).json({ error: 'Could not fetch progress.' });
  }
});
app.post('/api/progress/word', authMiddleware, async (req, res) => {
  try {
    const { lemma, language = 'en-es', correct } = req.body;
    const user_id = req.user.id;

    if (!lemma) return res.status(400).json({ error: 'lemma is required.' });

    const { data: existing } = await supabase
      .from('word_progress')
      .select('id, attempts, correct_count')
      .eq('user_id', user_id)
      .eq('lemma', lemma)
      .eq('language', language)
      .maybeSingle();

    if (!existing) {
      await supabase.from('word_progress').insert({
        user_id,
        lemma,
        language,
        attempts:      1,
        correct_count: correct ? 1 : 0,
      });
    } else {
      await supabase.from('word_progress').update({
        attempts:      existing.attempts + 1,
        correct_count: existing.correct_count + (correct ? 1 : 0),
      }).eq('id', existing.id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Word progress save error:', err);
    res.status(500).json({ error: 'Could not save word progress.' });
  }
});

// ── Start server ──────────────────────────────────────────────────
const server = http.createServer(app);

server.listen(3001, () => console.log('Server running on http://localhost:3001'));
server.on('error', err => console.error('Server error:', err));

process.stdin.resume();
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});
