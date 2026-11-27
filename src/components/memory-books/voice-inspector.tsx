'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { VOICE_UPLOAD_LIMIT, voiceStyles, voiceTime, type VoiceAsset, type VoiceDesign } from '@/lib/book-voice';
import { prepareVoice } from '@/lib/voice-capture';
import type { BookElement, MemoryBookDocument } from '@/lib/memory-books';
import { VoiceCard, VoicePlayer } from './voice-memory';
import s from './voice-memory.module.css';

type Recording = { recorder: MediaRecorder; stream: MediaStream; clock?: number; limit?: number };
type Phase = 'idle' | 'requesting' | 'recording' | 'preparing';

function stopTracks(recording?: Recording) {
  if (!recording) return;
  window.clearTimeout(recording.limit);
  window.clearInterval(recording.clock);
  recording.stream.getTracks().forEach(track => track.stop());
}

export function VoiceInspector({ element, book, onChange, onRecording, cloud }: {
  cloud: boolean;
  element: BookElement; book: MemoryBookDocument;
  onChange: (patch: Partial<BookElement>, group?: string) => void;
  onRecording: (asset?: VoiceAsset) => void;
}) {
  const voice = element.voice!;
  const asset = voice.assetId ? book.voiceAssets?.[voice.assetId] : undefined;
  const input = useRef<HTMLInputElement>(null);
  const capture = useRef<Recording>(undefined);
  const job = useRef(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');

  const cancel = useCallback(() => {
    job.current++;
    const current = capture.current;
    capture.current = undefined;
    if (current?.recorder.state === 'recording') current.recorder.stop();
    stopTracks(current);
  }, []);
  useEffect(() => cancel, [cancel]);

  async function prepare(blob: Blob, name: string, token: number) {
    setPhase('preparing');
    try {
      const recording = await prepareVoice(blob, name);
      if (job.current === token) onRecording(recording);
    } catch (reason) {
      if (job.current === token) setError(reason instanceof Error ? reason.message : 'Unable to prepare this recording.');
    } finally {
      if (job.current === token) setPhase('idle');
    }
  }
  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Microphone recording is unavailable here. You can upload an audio file.');
      return;
    }
    const token = ++job.current;
    setError(''); setElapsed(0); setPhase('requesting');
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
      if (job.current !== token) { stream.getTracks().forEach(track => track.stop()); return; }
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type =>
        MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const recording: Recording = { recorder, stream };
      const chunks: Blob[] = [];
      let size = 0;
      function finish() {
        if (recorder.state === 'recording') recorder.stop();
        stopTracks(recording);
      }
      capture.current = recording;
      recorder.ondataavailable = event => {
        if (!event.data.size || job.current !== token) return;
        size += event.data.size;
        if (size > VOICE_UPLOAD_LIMIT) {
          cancel(); setPhase('idle'); setError('The microphone recording exceeded the size limit.');
        } else chunks.push(event.data);
      };
      recorder.onstop = () => {
        stopTracks(recording);
        if (capture.current === recording) capture.current = undefined;
        if (job.current === token) void prepare(new Blob(chunks, { type: recorder.mimeType }), 'Microphone recording', token);
      };
      recorder.onerror = () => {
        if (job.current !== token) return;
        cancel(); setPhase('idle'); setError('The microphone stopped unexpectedly. Try again or upload a recording.');
      };
      recorder.start(200);
      const began = performance.now();
      recording.clock = window.setInterval(() => setElapsed((performance.now() - began) / 1000), 200);
      recording.limit = window.setTimeout(finish, 59000);
      setPhase('recording');
    } catch (reason) {
      stream?.getTracks().forEach(track => track.stop());
      if (job.current !== token) return;
      const denied = reason instanceof DOMException && reason.name === 'NotAllowedError';
      setPhase('idle'); setError(denied
        ? 'Microphone access was declined. You can upload a recording instead.'
        : 'The microphone could not start. Check your input device or upload a recording.');
    }
  }

  const patch = (values: Partial<VoiceDesign>, group?: string) =>
    onChange({ voice: { ...voice, ...values } }, group && `${element.id}:voice:${group}`);
  return <div className={s.voiceEditor}>
    <label>Voice title<input value={voice.title} maxLength={120} disabled={element.locked}
      onChange={event => patch({ title: event.target.value }, 'title')}/></label>
    <label>Card style<select value={voice.style} disabled={element.locked} onChange={event => patch({ style: event.target.value as VoiceDesign['style'] })}>
      {voiceStyles.map(style => <option key={style} value={style}>
        {{ handwritten: 'Handwritten note', cassette: 'Mini cassette', waveform: 'Waveform', button: 'Simple play button' }[style]}
      </option>)}
    </select></label>
    <div>
      {phase !== 'recording' && <button type="button" disabled={phase !== 'idle' || element.locked} onClick={() => void start()}>Record voice</button>}
      {phase === 'recording' && <button type="button" onClick={() => {
        const current = capture.current;
        if (!current || current.recorder.state !== 'recording') return;
        current.recorder.stop();
        stopTracks(current);
        setPhase('preparing');
      }}>Stop and keep recording</button>}
      {phase !== 'idle' && <button type="button" onClick={() => { cancel(); setPhase('idle'); }}>Cancel</button>}
      <button type="button" disabled={phase !== 'idle' || element.locked} onClick={() => input.current?.click()}>
        {asset ? 'Replace with audio file' : 'Upload audio file'}
      </button>
    </div>
    <input ref={input} type="file" hidden accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm" onChange={event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file) { setError(''); void prepare(file, file.name, ++job.current); }
    }}/>
    <p>{cloud ? "Recordings save with this book in My Space." : "Recordings save with this book in this browser."}</p>
    <p role="status">{{
      idle: asset ? `${asset.name} · ${voiceTime(asset.durationMs / 1000)}` : 'Up to one minute.',
      requesting: 'Waiting for microphone access…', recording: `Recording · ${voiceTime(elapsed)}`, preparing: 'Preparing local audio…',
    }[phase]}</p>
    {error && <p role="alert">{error}</p>}
    {asset && <details onToggle={event => setPreviewOpen(event.currentTarget.open)}>
      <summary>Listen to the recording</summary>
      {phase === 'idle' && previewOpen && <div className={s.voicePreview}>
        <VoicePlayer scope={voice.assetId!}><VoiceCard element={element} book={book} pageId="preview" interactive linear/></VoicePlayer>
      </div>}
      <button type="button" disabled={phase !== 'idle' || element.locked} onClick={() => {
        try { onRecording(); } catch (reason) { setError((reason as Error).message); }
      }}>Remove recording</button>
    </details>}
    <label>Transcript (optional)<textarea rows={4} value={voice.transcript} maxLength={12000} disabled={element.locked}
      onChange={event => patch({ transcript: event.target.value }, 'transcript')}/></label>
  </div>;
}
