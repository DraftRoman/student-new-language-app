import { supabase } from './supabase';

// Mirrors the backend contract (POST /api/v1/pronunciation/check, story §5).
export type PronunciationStatus = 'excellent' | 'passed' | 'retry';
export type TaskType = 'word' | 'phrase' | 'sentence';

export interface PronunciationDetails {
  words_matched: number;
  missing:       string[];
  extra:         string[];
  order_score:   number;
}

export interface PronunciationResult {
  recognized_text: string;
  match_pct:       number;
  status:          PronunciationStatus;
  details:         PronunciationDetails;
  latency_ms:      number;
}

export interface CheckParams {
  audio:        Blob;
  exerciseId:   string;
  expectedText: string;
  courseLang:   string;
  taskType?:    TaskType;
  attemptNo?:   number;
}

// Discriminates error UX (E2–E4): retryable timeout vs bad input vs network.
export type PronunciationErrorKind =
  | 'timeout'      // E3: STT exceeded the budget — retryable
  | 'too_large'    // audio over the size cap
  | 'bad_request'  // undecodable audio / invalid input
  | 'unauthorized'
  | 'network'      // E4: offline / fetch failed
  | 'server';

export class PronunciationError extends Error {
  kind: PronunciationErrorKind;
  constructor(kind: PronunciationErrorKind, message: string) {
    super(message);
    this.name = 'PronunciationError';
    this.kind = kind;
  }
}

function fileExtFor(mime: string): string {
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return 'm4a';
  if (mime.includes('wav')) return 'wav';
  return 'bin';
}

export async function checkPronunciation(params: CheckParams): Promise<PronunciationResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const mime = params.audio.type || 'audio/webm';
  const form = new FormData();
  // Do NOT set Content-Type — the browser adds the multipart boundary itself.
  form.append('audio_file', params.audio, `clip.${fileExtFor(mime)}`);
  form.append('exercise_id', params.exerciseId);
  form.append('expected_text', params.expectedText);
  form.append('course_lang', params.courseLang);
  form.append('task_type', params.taskType ?? 'phrase');
  form.append('attempt_no', String(params.attemptNo ?? 1));

  let res: Response;
  try {
    res = await fetch('/api/v1/pronunciation/check', {
      method:  'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body:    form,
    });
  } catch {
    throw new PronunciationError('network', 'Network request failed');
  }

  if (res.ok) {
    return (await res.json()) as PronunciationResult;
  }

  switch (res.status) {
    case 503: throw new PronunciationError('timeout', 'Recognition timed out');
    case 413: throw new PronunciationError('too_large', 'Audio too large');
    case 401: throw new PronunciationError('unauthorized', 'Not authenticated');
    case 400: throw new PronunciationError('bad_request', 'Could not process audio');
    default:  throw new PronunciationError('server', `Server error (${res.status})`);
  }
}
