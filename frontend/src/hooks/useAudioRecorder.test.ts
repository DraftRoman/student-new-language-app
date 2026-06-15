import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAudioRecorder } from './useAudioRecorder';

type Handler<T> = ((e: T) => void) | null;

class FakeMediaRecorder {
  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: Handler<{ data: Blob }> = null;
  onstop: Handler<Event> = null;
  constructor(_stream: MediaStream) {}
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['a'], { type: 'audio/webm' }) });
    this.onstop?.(new Event('stop'));
  }
}

let getUserMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
  const track = { stop: vi.fn() };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  getUserMedia = vi.fn().mockResolvedValue(stream);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useAudioRecorder', () => {
  it('records and produces a blob + url', async () => {
    const { result } = renderHook(() => useAudioRecorder());
    expect(result.current.status).toBe('idle');

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.status).toBe('recording');

    act(() => {
      result.current.stop();
    });
    await waitFor(() => expect(result.current.status).toBe('recorded'));
    expect(result.current.blob).toBeInstanceOf(Blob);
    expect(result.current.url).toBe('blob:fake');
  });

  it('goes to denied when permission is refused (E1)', async () => {
    getUserMedia.mockRejectedValueOnce(new Error('denied'));
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.status).toBe('denied');
  });

  it('resets back to idle and revokes the url', async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.start();
    });
    act(() => result.current.stop());
    await waitFor(() => expect(result.current.status).toBe('recorded'));

    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.blob).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('reports unsupported when MediaRecorder is missing (E1)', () => {
    vi.stubGlobal('MediaRecorder', undefined);
    const { result } = renderHook(() => useAudioRecorder());
    expect(result.current.status).toBe('unsupported');
  });
});
