'use client';

import { useEffect, useState, type RefObject } from 'react';
import styles from './environment-studio.module.css';

type Props = {
  layers: readonly { id: string; label: string; available: boolean }[];
  growthStage: string;
  showAnchors: boolean;
  onShowAnchors: (visible: boolean) => void;
  hiddenLayers: ReadonlySet<string>;
  onToggleLayer: (id: string) => void;
  sceneRef: RefObject<HTMLDivElement | null>;
};

const stages = ['Seed', 'Sprout', 'Sapling', 'Young tree', 'Growing tree', 'Mature tree', 'Flourishing tree'];
const channels = [
  { key: 'wind', label: 'Wind strength', max: 100, unit: '%' },
  { key: 'direction', label: 'Wind direction', max: 359, unit: '°' },
  { key: 'clouds', label: 'Cloud speed', max: 200, unit: '%' },
  { key: 'tree', label: 'Tree movement', max: 100, unit: '%' },
  { key: 'grass', label: 'Grass movement', max: 100, unit: '%' },
] as const;

function localMinute() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}
function clockLabel(minute: number) {
  return [Math.floor(minute / 60), minute % 60].map(n => String(n).padStart(2, '0')).join(':');
}

export default function EnvironmentStudio({
  layers, growthStage, showAnchors, onShowAnchors, hiddenLayers, onToggleLayer, sceneRef,
}: Props) {
  const [open, setOpen] = useState(false);
  const [auto, setAuto] = useState(true);
  const [minute, setMinute] = useState(localMinute);
  const [paused, setPaused] = useState(false);
  const [targets, setTargets] = useState({ wind: 15, direction: 270, clouds: 100, tree: 15, grass: 25 });
  const [growth, setGrowth] = useState('');
  const [finches, setFinches] = useState('Away');
  const [sampling, setSampling] = useState(false);
  const [sample, setSample] = useState('');

  useEffect(() => {
    if (!open || !auto || paused) return;
    let timeout: ReturnType<typeof setTimeout>;
    function sync() {
      clearTimeout(timeout);
      if (document.hidden) return;
      setMinute(localMinute());
      timeout = setTimeout(sync, 60_000 - Date.now() % 60_000);
    }
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => { clearTimeout(timeout); document.removeEventListener('visibilitychange', sync); };
  }, [auto, open, paused]);

  useEffect(() => {
    if (!sampling || !open || paused) return;
    let request = 0;
    const times: number[] = [];
    function cancelOnHide() {
      if (document.hidden) {
        cancelAnimationFrame(request);
        setSampling(false);
        setSample('Measurement interrupted when the tab was hidden.');
      }
    }
    function frame(time: number) {
      times.push(time);
      const elapsed = time - times[0];
      if (elapsed < 1200) { request = requestAnimationFrame(frame); return; }
      const rect = sceneRef.current?.getBoundingClientRect();
      const intervals = times.slice(1).map((t, i) => t - times[i]).sort((a, b) => a - b);
      const p95 = intervals[Math.ceil(intervals.length * .95) - 1];
      setSample(`${Math.round(rect?.width ?? 0)} × ${Math.round(rect?.height ?? 0)} CSS px · ${intervals.length} intervals in ${(elapsed/1000).toFixed(2)} s · p95 ${p95.toFixed(1)} ms.`);
      setSampling(false);
    }
    request = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', cancelOnHide);
    return () => { cancelAnimationFrame(request); document.removeEventListener('visibilitychange', cancelOnHide); };
  }, [sampling, open, paused, sceneRef]);

  return <details className={styles.studio} onToggle={e => {
    const expanded = e.currentTarget.open;
    setOpen(expanded);
    if (!expanded) setSampling(false);
  }}>
    <summary>Environment studio</summary>
    {open && <div className={styles.body}>
      <p>Inspect the approved painting and set targets for the separated artwork. Motion and lighting previews become available with their art layers.</p>
      <fieldset><legend>Time and playback</legend>
        <label className={styles.check}><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)}/>Use local time</label>
        <label>Time of day · {clockLabel(minute)}
          <input type="range" disabled={auto} min="0" max="1439" value={minute} onChange={e => setMinute(Number(e.target.value))}/>
        </label>
        <button type="button" aria-pressed={paused} onClick={() => { setPaused(!paused); setSampling(false); }}>
          {paused ? 'Resume preview' : 'Pause preview'}
        </button>
      </fieldset>
      <fieldset><legend>Wind and motion targets</legend>
        {channels.map(({ key, label, max, unit }) => <label key={key}>{label} · {targets[key]}{unit}
          <input type="range" min="0" max={max} value={targets[key]}
            onChange={e => setTargets({ ...targets, [key]: Number(e.target.value) })}/>
        </label>)}
      </fieldset>
      <fieldset><legend>Growth and inhabitants</legend>
        <label>Growth stage<select value={growth} onChange={e => setGrowth(e.target.value)}>
          <option value="">Follow memories ({growthStage})</option>
          {stages.map(name => <option key={name}>{name}</option>)}
        </select></label>
        <label>Finch behavior<select value={finches} onChange={e => setFinches(e.target.value)}>
          {['Away', 'Arriving', 'Landing', 'Perched', 'Changing branches', 'Departing'].map(name => <option key={name}>{name}</option>)}
        </select></label>
        <p>Art targets: {growth || growthStage} · {finches}. Stage portraits and finch poses await delivery.</p>
      </fieldset>
      <fieldset><legend>Layers and registration</legend>
        <label className={styles.check}><input type="checkbox" checked={showAnchors} onChange={e => onShowAnchors(e.target.checked)}/>Show anchor points</label>
        {layers.map(layer => <label key={layer.id} className={styles.check}>
          <input type="checkbox" disabled={!layer.available} checked={layer.available && !hiddenLayers.has(layer.id)}
            onChange={() => onToggleLayer(layer.id)}/>{layer.label}{!layer.available && <small>Pending</small>}
        </label>)}
      </fieldset>
      <fieldset><legend>Performance</legend><p>Sample the browser’s frame intervals while this view is open.</p>
        <button type="button" disabled={paused || sampling} onClick={() => { setSample(''); setSampling(true); }}>Measure frame intervals</button>
        <p role="status">{sampling ? 'Measuring…' : sample}</p>
      </fieldset>
    </div>}
  </details>;
}
