'use client';
import { useEffect, useState } from 'react';

/** Establish the browser's idle callback cadence before comparing animation samples. */
export function FrameProbe() {
  const [idle, setIdle] = useState('');
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('profile') !== '1') return;
    const times: number[] = [];
    let frame = 0, started = 0, last = 0;
    function sample(time: number) {
      started ||= time;
      if (last) times.push(time - last);
      last = time;
      if (time - started < 1450) frame = requestAnimationFrame(sample);
      else {
        const sorted = times.sort((a, b) => a - b);
        setIdle(JSON.stringify({ intervals: sorted.length, median: sorted[Math.floor(sorted.length / 2)] ?? 0,
          p95: sorted[Math.floor(sorted.length * .95)] ?? 0, visible: document.visibilityState }));
      }
    }
    frame = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(frame);
  }, []);
  return idle ? <span hidden data-idle-frames={idle}/> : null;
}
