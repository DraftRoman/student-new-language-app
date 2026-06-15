import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../lib/pronunciationService', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, checkPronunciation: vi.fn() };
});
import PronunciationExercise from './PronunciationExercise';
import { checkPronunciation, PronunciationError } from '../../lib/pronunciationService';
import { setAnalyticsSink } from '../../lib/analytics';
const check = checkPronunciation;
class FakeMediaRecorder {
    state = 'inactive';
    mimeType = 'audio/webm';
    ondataavailable = null;
    onstop = null;
    constructor(_stream) { }
    start() {
        this.state = 'recording';
    }
    stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['a'], { type: 'audio/webm' }) });
        this.onstop?.(new Event('stop'));
    }
}
let getUserMedia;
let events;
beforeEach(() => {
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    const stream = { getTracks: () => [{ stop: vi.fn() }] };
    getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    events = [];
    setAnalyticsSink((name) => events.push(name));
});
afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});
function renderExercise() {
    return render(_jsx(PronunciationExercise, { exerciseId: "ex-1", expectedText: "hello world", courseLang: "en", taskType: "phrase", onSkip: vi.fn() }));
}
async function recordAndStop(user) {
    await user.click(screen.getByRole('button', { name: /start recording/i }));
    await waitFor(() => screen.getByRole('button', { name: /stop recording/i }));
    await user.click(screen.getByRole('button', { name: /stop recording/i }));
    await waitFor(() => screen.getByRole('button', { name: /check pronunciation/i }));
}
describe('PronunciationExercise', () => {
    it('shows the target phrase and fires speaking_exercise_shown', () => {
        renderExercise();
        expect(screen.getByText('hello world')).toBeInTheDocument();
        expect(events).toContain('speaking_exercise_shown');
    });
    it('shows mic guidance + skip when permission is denied (E1)', async () => {
        getUserMedia.mockRejectedValueOnce(new Error('denied'));
        const user = userEvent.setup();
        renderExercise();
        await user.click(screen.getByRole('button', { name: /start recording/i }));
        await waitFor(() => expect(screen.getByText(/microphone access is blocked/i)).toBeInTheDocument());
        expect(screen.getByRole('button', { name: /skip for now/i })).toBeInTheDocument();
        expect(events).toContain('mic_permission_denied');
    });
    it('runs the full record → submit → excellent result flow', async () => {
        check.mockResolvedValue({
            recognized_text: 'hello world',
            match_pct: 100,
            status: 'excellent',
            details: { words_matched: 2, missing: [], extra: [], order_score: 1 },
            latency_ms: 12,
        });
        const user = userEvent.setup();
        renderExercise();
        await recordAndStop(user);
        await user.click(screen.getByRole('button', { name: /check pronunciation/i }));
        await waitFor(() => expect(screen.getByTestId('pronunciation-result')).toBeInTheDocument());
        expect(screen.getByText(/excellent!/i)).toBeInTheDocument();
        expect(screen.getByTestId('recognized-text')).toHaveTextContent('hello world');
        expect(check).toHaveBeenCalledOnce();
        expect(events).toContain('speaking_exercise_completed');
    });
    it('allows unlimited retry from the result screen (AC #7)', async () => {
        check.mockResolvedValue({
            recognized_text: 'hello',
            match_pct: 50,
            status: 'retry',
            details: { words_matched: 1, missing: ['world'], extra: [], order_score: 1 },
            latency_ms: 12,
        });
        const user = userEvent.setup();
        renderExercise();
        await recordAndStop(user);
        await user.click(screen.getByRole('button', { name: /check pronunciation/i }));
        await waitFor(() => screen.getByTestId('pronunciation-result'));
        await user.click(screen.getByRole('button', { name: /try again/i }));
        // Back to capture: record control is available again, result is gone.
        expect(screen.queryByTestId('pronunciation-result')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
    });
    it('shows a retryable error on timeout (E3) without losing the recording', async () => {
        check.mockRejectedValue(new PronunciationError('timeout', 'timed out'));
        const user = userEvent.setup();
        renderExercise();
        await recordAndStop(user);
        await user.click(screen.getByRole('button', { name: /check pronunciation/i }));
        await waitFor(() => expect(screen.getByText(/took too long/i)).toBeInTheDocument());
        // Still on the review screen — can resubmit.
        expect(screen.getByRole('button', { name: /check pronunciation/i })).toBeInTheDocument();
    });
    it('shows motivational copy when nothing was heard (E5)', async () => {
        check.mockResolvedValue({
            recognized_text: '',
            match_pct: 0,
            status: 'retry',
            details: { words_matched: 0, missing: ['hello', 'world'], extra: [], order_score: 0 },
            latency_ms: 12,
        });
        const user = userEvent.setup();
        renderExercise();
        await recordAndStop(user);
        await user.click(screen.getByRole('button', { name: /check pronunciation/i }));
        await waitFor(() => expect(screen.getByText(/couldn’t hear you clearly/i)).toBeInTheDocument());
    });
});
