'use client';

import { useEffect, useRef, useState } from 'react';

type Challenge = { id: string; phrase: string; instruction: string; expiresAt: string };
type Outcome = { status: 'completed' | 'inconclusive' | 'unavailable'; reason: string };

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not prepare camera clip'));
    reader.onload = () => resolve(String(reader.result).split(',', 2)[1] ?? '');
    reader.readAsDataURL(blob);
  });
}

export function LivenessCheck({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [consented, setConsented] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [phase, setPhase] = useState<'idle' | 'preview' | 'recording' | 'reviewing' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => () => stopCamera(), []);

  const close = () => {
    stopCamera();
    setOpen(false);
    setPhase('idle');
    setChallenge(null);
    setMessage('');
  };

  const start = async () => {
    if (!consented) return;
    setPhase('preview');
    setMessage('Preparing your optional camera check…');
    try {
      const challengeResponse = await fetch(`/api/sessions/${sessionId}/liveness/challenge`, { method: 'POST' });
      const challengeData = await challengeResponse.json();
      if (!challengeResponse.ok) throw new Error(challengeData.error ?? 'Could not prepare challenge');
      setChallenge(challengeData.challenge);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setMessage('When you are ready, start the short recording.');
    } catch (error) {
      stopCamera();
      setPhase('error');
      setMessage(error instanceof Error ? error.message : 'Camera is unavailable. You can continue the interview.');
    }
  };

  const record = async () => {
    const stream = streamRef.current;
    if (!stream || !challenge) return;
    if (!window.MediaRecorder) {
      setPhase('error');
      setMessage('This browser cannot record a short camera clip. You can continue the interview.');
      return;
    }
    const preferred = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType: preferred, videoBitsPerSecond: 350_000, audioBitsPerSecond: 64_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = async () => {
      stopCamera();
      setPhase('reviewing');
      setMessage('Reviewing the temporary clip…');
      try {
        const blob = new Blob(chunks, { type: 'video/webm' });
        if (blob.size === 0 || blob.size > 2_500_000) throw new Error('The clip was unavailable or too large. You can continue the interview.');
        const response = await fetch(`/api/sessions/${sessionId}/liveness/verify`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ challengeId: challenge.id, mimeType: 'video/webm', videoBase64: await blobToBase64(blob) }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? 'Could not review clip');
        setOutcome(result);
        setPhase('done');
      } catch (error) {
        setPhase('error');
        setMessage(error instanceof Error ? error.message : 'Could not review the clip. You can continue the interview.');
      }
    };
    setPhase('recording');
    setMessage('Recording for four seconds…');
    recorder.start();
    window.setTimeout(() => recorder.state !== 'inactive' && recorder.stop(), 4_000);
  };

  return <>
    <button type="button" onClick={() => { setOpen(true); setOutcome(null); }} className="rounded border border-border bg-card px-3 py-1 text-xs font-medium text-foreground hover:bg-muted">Optional camera check</button>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Optional camera liveness check">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
        <h2 className="text-lg font-semibold">Optional camera liveness check</h2>
        <p className="mt-2 text-sm text-muted-foreground">This asks you to complete one short random action. The raw clip is sent to Gemini for this one review and is not saved. It does not affect your score or make any hiring decision.</p>
        {!challenge && phase !== 'error' && <label className="mt-4 flex gap-2 text-sm"><input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} />I consent to this optional temporary camera check.</label>}
        {challenge && <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4"><p className="font-medium">{challenge.instruction}</p><p className="mt-1 text-xs text-muted-foreground">Keep your face and shoulders in view. This check is optional.</p></div>}
        {phase === 'preview' || phase === 'recording' ? <video ref={videoRef} muted playsInline className="mt-4 aspect-video w-full rounded-xl bg-black object-cover" /> : null}
        {message && <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">{message}</p>}
        {outcome && <div className="mt-4 rounded-xl border border-border bg-muted/50 p-3 text-sm"><p className="font-medium capitalize">Result: {outcome.status}</p><p className="mt-1 text-muted-foreground">{outcome.reason}</p><p className="mt-2 text-xs text-muted-foreground">For human review only; this does not affect the interview assessment.</p></div>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={close} className="rounded border border-border px-3 py-2 text-sm">{phase === 'done' || phase === 'error' ? 'Close' : 'Skip'}</button>
          {!challenge && phase !== 'error' && <button type="button" disabled={!consented || phase !== 'idle'} onClick={() => void start()} className="rounded bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Continue</button>}
          {challenge && phase === 'preview' && <button type="button" onClick={() => void record()} className="rounded bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Start recording</button>}
        </div>
      </div>
    </div>}
  </>;
}
