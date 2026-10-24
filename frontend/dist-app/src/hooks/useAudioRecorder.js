import { useCallback, useEffect, useRef, useState } from 'react';
function isSupported() {
    return (typeof navigator !== 'undefined' &&
        !!navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function' &&
        typeof window !== 'undefined' &&
        typeof window.MediaRecorder !== 'undefined');
}
export function useAudioRecorder(maxDurationMs = 15_000) {
    const [status, setStatus] = useState(() => (isSupported() ? 'idle' : 'unsupported'));
    const [blob, setBlob] = useState(null);
    const [url, setUrl] = useState(null);
    const [mimeType, setMimeType] = useState(null);
    const [durationMs, setDurationMs] = useState(0);
    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);
    const startedAtRef = useRef(0);
    const timerRef = useRef(null);
    const urlRef = useRef(null);
    const setObjectUrl = useCallback((next) => {
        if (urlRef.current)
            URL.revokeObjectURL(urlRef.current);
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
        if (rec && rec.state !== 'inactive')
            rec.stop();
    }, []);
    const start = useCallback(async () => {
        if (!isSupported()) {
            setStatus('unsupported');
            return;
        }
        setStatus('requesting');
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        catch {
            setStatus('denied');
            return;
        }
        streamRef.current = stream;
        chunksRef.current = [];
        const rec = new MediaRecorder(stream);
        recorderRef.current = rec;
        rec.ondataavailable = (e) => {
            if (e.data && e.data.size > 0)
                chunksRef.current.push(e.data);
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
        if (urlRef.current)
            URL.revokeObjectURL(urlRef.current);
    }, [releaseStream]);
    return { status, blob, url, mimeType, durationMs, start, stop, reset };
}
