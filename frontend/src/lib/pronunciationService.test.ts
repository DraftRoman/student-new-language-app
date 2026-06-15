import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
    },
  },
}));

import { checkPronunciation, PronunciationError } from './pronunciationService';

function audioBlob() {
  return new Blob(['x'], { type: 'audio/webm' });
}

const okResult = {
  recognized_text: 'hi',
  match_pct: 100,
  status: 'excellent',
  details: { words_matched: 1, missing: [], extra: [], order_score: 1 },
  latency_ms: 10,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('checkPronunciation', () => {
  it('posts multipart with auth token and returns the result', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => okResult });
    vi.stubGlobal('fetch', fetchMock);

    const res = await checkPronunciation({
      audio: audioBlob(),
      exerciseId: 'e1',
      expectedText: 'hi',
      courseLang: 'en',
    });

    expect(res.match_pct).toBe(100);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/pronunciation/check');
    expect(opts.method).toBe('POST');
    expect(opts.headers.Authorization).toBe('Bearer tok');
    expect(opts.body).toBeInstanceOf(FormData);
    const fd = opts.body as FormData;
    expect(fd.get('expected_text')).toBe('hi');
    expect(fd.get('course_lang')).toBe('en');
    expect(fd.get('task_type')).toBe('phrase');
    expect(fd.get('attempt_no')).toBe('1');
    // Browser must set the multipart boundary itself — no manual Content-Type.
    expect(opts.headers['Content-Type']).toBeUndefined();
  });

  it('maps 503 to a retryable timeout error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(
      checkPronunciation({ audio: audioBlob(), exerciseId: 'e', expectedText: 'h', courseLang: 'en' }),
    ).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('maps 413 to too_large', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 413 }));
    await expect(
      checkPronunciation({ audio: audioBlob(), exerciseId: 'e', expectedText: 'h', courseLang: 'en' }),
    ).rejects.toMatchObject({ kind: 'too_large' });
  });

  it('maps 400 to bad_request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    await expect(
      checkPronunciation({ audio: audioBlob(), exerciseId: 'e', expectedText: 'h', courseLang: 'en' }),
    ).rejects.toMatchObject({ kind: 'bad_request' });
  });

  it('maps a fetch rejection to a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const err = await checkPronunciation({
      audio: audioBlob(), exerciseId: 'e', expectedText: 'h', courseLang: 'en',
    }).catch((e) => e);
    expect(err).toBeInstanceOf(PronunciationError);
    expect(err.kind).toBe('network');
  });
});
