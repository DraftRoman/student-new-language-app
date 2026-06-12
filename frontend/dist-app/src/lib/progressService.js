import { supabase } from './supabase';
async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}
export async function saveSentenceResult(exerciseId, correct) {
    await fetch('/api/progress/sentence', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ exercise_id: exerciseId, correct }),
    });
}
export async function saveWordResult(lemma, language, correct) {
    await fetch('/api/progress/word', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ lemma, language, correct }),
    });
}
export async function getAllSentenceProgress() {
    const res = await fetch('/api/progress/sentences', { headers: await authHeaders() });
    const data = await res.json();
    return data.progress ?? {};
}
