import { supabase } from "./supabase";

// CEFR level union — kept in sync with backend value_objects.CefrLevel.
export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface VocabItem {
  id:       string;
  question: string;
  answer:   string;
}

export interface SentenceItem {
  id:            string;
  construction:  "affirmative" | "interrogative" | "negative";
  elements:      string[];
  correct_order: string[];
}

export interface LevelBlock {
  level:           CefrLevel;
  vocab:           VocabItem[];
  sentence:        SentenceItem[];
  vocab_page_size: number;
  total_items:     number;
}

// Server returns either the beginner fast-path OR the start-of-test payload.
export type PriorExperienceResponse =
  | { test_required: false; level: CefrLevel }
  | {
      test_required: true;
      session_id:    string;
      current_level: CefrLevel | null;
      block:         LevelBlock | null;
    };

export interface SubmitLevelResponse {
  level:             CefrLevel;
  errors:            number;
  passed:            boolean;
  next_level:        CefrLevel | null;
  recommended_level: CefrLevel | null;
}

export interface PlacementResult {
  recommended_level: CefrLevel;
  allowed_max_level: CefrLevel;
  confirmed_level:   CefrLevel | null;
}

export interface SubmitLevelAnswers {
  vocab:    Record<string, string>;
  sentence: Record<string, string[]>;
}

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { ...(await authHeaders()), ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof body?.detail === "string" ? body.detail : `Request failed (${res.status})`;
    throw new Error(detail);
  }
  return body as T;
}

export function answerPriorExperience(studiedBefore: boolean): Promise<PriorExperienceResponse> {
  return request("/api/onboarding/prior-experience", {
    method: "POST",
    body:   JSON.stringify({ studied_before: studiedBefore }),
  });
}

export function getLevelBlock(sessionId: string, level: CefrLevel): Promise<LevelBlock> {
  return request(`/api/placement/${sessionId}/level/${level}/block`);
}

export function submitLevelAnswers(
  sessionId: string, level: CefrLevel, answers: SubmitLevelAnswers,
): Promise<SubmitLevelResponse> {
  return request(`/api/placement/${sessionId}/level/${level}/answers`, {
    method: "POST",
    body:   JSON.stringify(answers),
  });
}

export function getResult(sessionId: string): Promise<PlacementResult> {
  return request(`/api/placement/${sessionId}/result`);
}

export function confirmLevel(sessionId: string, chosenLevel: CefrLevel): Promise<{ confirmed_level: CefrLevel }> {
  return request(`/api/placement/${sessionId}/confirm`, {
    method: "POST",
    body:   JSON.stringify({ chosen_level: chosenLevel }),
  });
}
