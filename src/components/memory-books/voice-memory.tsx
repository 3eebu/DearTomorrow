'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { voiceTime, type VoiceAsset } from '@/lib/book-voice';
import { interactionKey } from '@/lib/book-surprises';
import type { BookElement, MemoryBookDocument } from '@/lib/memory-books';
import s from './voice-memory.module.css';

type Playback = {
  id?: string; playing: boolean; time: number; error: string;
  toggle: (id: string, asset: VoiceAsset) => void; seek: (seconds: number) => void;
};
const VoicePlayback = createContext<Playback | null>(null);

export function VoicePlayer({ scope, children }: { scope: string; children: ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null);
  const active = useRef<{ key: string; data: string }>(undefined);
  const request = useRef(0);
  const [id, setId] = useState<string>();
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const element = audio.current;
    const serial = request;
    return () => {
      serial.current++;
      active.current = undefined;
      element?.pause();
      element?.removeAttribute('src');
      element?.load();
    };
  }, [scope]);
  useEffect(() => { setId(undefined); setPlaying(false); setTime(0); setError(''); }, [scope]);

  function toggle(key: string, asset: VoiceAsset) {
    const element = audio.current;
    if (!element) return;
    if (active.current?.key === key && active.current.data === asset.data && !element.paused) {
      request.current++;
      element.pause();
      return;
    }
    if (active.current?.key !== key || active.current.data !== asset.data) {
      element.pause();
      active.current = { key, data: asset.data };
      setId(key);
      setTime(0);
      element.src = asset.data;
    }
    setError('');
    const attempt = ++request.current;
    void element.play().catch(() => {
      if (attempt === request.current) setError('This recording could not play. Try again or replace the recording.');
    });
  }

  return <VoicePlayback.Provider value={{ id, playing, time, error, toggle, seek: seconds => {
    if (audio.current && Number.isFinite(audio.current.duration)) audio.current.currentTime = seconds;
  } }}>
    <audio ref={audio} preload="none" hidden
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
      onTimeUpdate={event => setTime(event.currentTarget.currentTime)}/>
    {children}
  </VoicePlayback.Provider>;
}

const markings = [20, 35, 28, 57, 81, 43, 68, 90, 72, 37, 65, 49, 24, 41, 14];

export function VoiceCard({ element, book, pageId, interactive = false, linear = false }: {
  element: BookElement; book: MemoryBookDocument; pageId: string; interactive?: boolean; linear?: boolean;
}) {
  const design = element.voice!;
  const asset = design.assetId ? book.voiceAssets?.[design.assetId] : undefined;
  const player = useContext(VoicePlayback);
  const key = interactionKey(pageId, element.id);
  const active = player?.id === key;
  const playing = !!active && !!player?.playing;
  const title = design.title || 'Voice memory';
  const duration = (asset?.durationMs ?? 0) / 1000;

  return <div className={s.voiceCard} data-style={design.style} data-linear={linear || undefined}
    style={{ backgroundColor: element.background, color: element.color }}>
    <div className={s.label}><strong>{title}</strong><small>{asset ? voiceTime(duration) : 'No recording yet'}</small></div>
    {design.style === 'cassette' && <div className={s.tape} aria-hidden="true"><i/><i/></div>}
    {design.style === 'waveform' && <div className={s.wave} aria-hidden="true">
      {markings.map((height, index) => <i key={index} style={{ height: height + '%' }}/>)}
    </div>}
    {interactive && asset && player ? <div className={s.playback}>
      <button type="button" aria-label={`${playing ? 'Pause' : 'Play'} ${title}`} onClick={() => player.toggle(key, asset)}>
        <span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span><span>{playing ? 'Pause' : 'Play'}</span>
      </button>
      {active && <input type="range" min={0} max={duration} step=".01" value={Math.min(duration, player.time)}
        aria-label={`Seek ${title}`} aria-valuetext={voiceTime(player.time)}
        onChange={event => player.seek(event.target.valueAsNumber)}/>}
      {active && player.error && <span role="alert">{player.error}</span>}
    </div> : asset && <span className={s.printPlay} aria-hidden="true">▷</span>}
    {interactive && design.transcript && <details className={s.transcript}>
      <summary>Transcript</summary><p tabIndex={0}>{design.transcript}</p>
    </details>}
  </div>;
}
