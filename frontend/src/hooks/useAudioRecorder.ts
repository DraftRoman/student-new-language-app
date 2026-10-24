import { useCallback, useEffect, useRef, useState } from 'react';

// Audio capture for the speaking exercise (story S1). Wraps MediaRecorder +
// getUserMedia with explicit states so the UI can drive permissions (E1),
// record/stop/delete/re-record, and an auto-stop at the max duration.
export type RecorderStatus =
  | 'idle'        // ready to record
  | 'unsupported' // no MediaRecorder / getUserMedia (E1)
  | 'requesting'  // awaiting the mic-permission prompt
  | 'denied'      // permission refused / no mic (E1)
  | 'recording'
  | 'recorded';   // have a clip ready to review / submit

export interface AudioRecorder {
  status:     RecorderStatus;
  blob:       Blob | null;
  url:        string | null;
  mimeType:   string | null;
  durationMs: number;
  start:      () => Promise<void>;
  stop:       () => void;
  reset:      () => void;
}

function isSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined'
  );
}

export function useAudioRecorder(maxDurationMs = 15_000): AudioRecorder {
  const [status, setStatus]         = useState<RecorderStatus>(() => (isSupported() ? 'idle' : 'unsupported'));
  const [blob, setBlob]             = useState<Blob | null>(null);
  const [url, setUrl]               = useState<string | null>(null);
  const [mimeType, setMimeType]     = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);

  const recorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const streamRef    = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlRef       = useRef<string | null>(null);

  const setObjectUrl = useCallback((next: string | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next;
    setUrl(next);
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  }, []);

  const start = useCallback(async () => {
    if (!isSupported()) {
      setStatus('unsupported');
      return;
    }
    setStatus('requesting');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatus('denied');
      return;
    }
    streamRef.current = stream;
    chunksRef.current = [];

    const rec = new MediaRecorder(stream);
    recorderRef.current = rec;
    rec.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const type = rec.mimeType || 'audio/webm';
      const recorded = new Blob(chunksRef.current, { type });
      setBlob(recorded);
      setMimeType(type);
      setObjectUrl(URL.createObjectURL(recorded));
      setDurationMs(Date.now() - startedAtRef.current);
      setStatus('recorded');
      releaseStream();
    };

    startedAtRef.current = Date.now();
    rec.start();
    setStatus('recording');
    timerRef.current = setTimeout(stop, maxDurationMs);
  }, [maxDurationMs, stop, releaseStream, setObjectUrl]);

  const reset = useCallback(() => {
    releaseStream();
    setObjectUrl(null);
    setBlob(null);
    setMimeType(null);
    setDurationMs(0);
    chunksRef.current = [];
    setStatus(isSupported() ? 'idle' : 'unsupported');
  }, [releaseStream, setObjectUrl]);

  // Unmount cleanup: stop any live tracks and revoke the object URL.
  useEffect(() => () => {
    releaseStream();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, [releaseStream]);

  return { status, blob, url, mimeType, durationMs, start, stop, reset };
}
