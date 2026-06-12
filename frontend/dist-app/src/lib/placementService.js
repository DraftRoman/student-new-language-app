import { supabase } from "./supabase";
async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}
async function request(input, init) {
    const res = await fetch(input, {
        ...init,
        headers: { ...(await authHeaders()), ...(init?.headers ?? {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = typeof body?.detail === "string" ? body.detail : `Request failed (${res.status})`;
        throw new Error(detail);
    }
    return body;
}
export function answerPriorExperience(studiedBefore) {
    return request("/api/onboarding/prior-experience", {
        method: "POST",
        body: JSON.stringify({ studied_before: studiedBefore }),
    });
}
export function getLevelBlock(sessionId, level) {
    return request(`/api/placement/${sessionId}/level/${level}/block`);
}
export function submitLevelAnswers(sessionId, level, answers) {
    return request(`/api/placement/${sessionId}/level/${level}/answers`, {
        method: "POST",
        body: JSON.stringify(answers),
    });
}
export function getResult(sessionId) {
    return request(`/api/placement/${sessionId}/result`);
}
export function confirmLevel(sessionId, chosenLevel) {
    return request(`/api/placement/${sessionId}/confirm`, {
        method: "POST",
        body: JSON.stringify({ chosen_level: chosenLevel }),
    });
}
