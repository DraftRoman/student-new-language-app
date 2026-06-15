import { supabase } from './supabase';
export class PronunciationError extends Error {
    kind;
    constructor(kind, message) {
        super(message);
        this.name = 'PronunciationError';
        this.kind = kind;
    }
}
function fileExtFor(mime) {
    if (mime.includes('webm'))
        return 'webm';
    if (mime.includes('ogg'))
        return 'ogg';
    if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac'))
        return 'm4a';
    if (mime.includes('wav'))
        return 'wav';
    return 'bin';
}
export async function checkPronunciation(params) {
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
    let res;
    try {
        res = await fetch('/api/v1/pronunciation/check', {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: form,
        });
    }
    catch {
        throw new PronunciationError('network', 'Network request failed');
    }
    if (res.ok) {
        return (await res.json());
    }
    switch (res.status) {
        case 503: throw new PronunciationError('timeout', 'Recognition timed out');
        case 413: throw new PronunciationError('too_large', 'Audio too large');
        case 401: throw new PronunciationError('unauthorized', 'Not authenticated');
        case 400: throw new PronunciationError('bad_request', 'Could not process audio');
        default: throw new PronunciationError('server', `Server error (${res.status})`);
    }
}
