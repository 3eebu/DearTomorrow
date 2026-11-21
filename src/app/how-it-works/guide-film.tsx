"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./guide.module.css";

type Props = { id: string; name: string; description: string };
type InlineVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };
const playEvent = "dear-tomorrow-guide-play";

function clock(seconds: number) {
  const rounded = Math.floor(seconds);
  return Math.floor(rounded / 60) + ":" + String(rounded % 60).padStart(2, "0");
}

export function GuideFilm({ id, name, description }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<InlineVideo>(null);
  const manuallyPaused = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);
  const base = "/guide/" + id;
  const videoId = id + "-film";

  const play = useCallback((player: HTMLVideoElement) => {
    if (!player.getAttribute("src")) {
      player.src = base + (window.matchMedia("(max-width: 600px)").matches ? "-phone.mp4" : ".mp4");
    }
    void player.play().catch(() => setPlaying(false));
  }, [base]);

  useEffect(() => {
    const surface = frame.current;
    const player = video.current;
    if (!surface || !player) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;

    function sync() {
      if (!player) return;
      if (!visible || document.hidden || motion.matches) {
        player.pause();
      } else if (!manuallyPaused.current && !player.error) {
        play(player);
      }
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.56;
      if (entry.isIntersecting) surface.dataset.entered = "true";
      sync();
    }, { threshold: [0, 0.56] });
    observer.observe(surface);

    const yieldPlayback = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) player.pause();
    };
    document.addEventListener(playEvent, yieldPlayback);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener(playEvent, yieldPlayback);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
      player.pause();
    };
  }, [id, play]);

  function toggle() {
    const player = video.current;
    if (!player) return;
    manuallyPaused.current = !player.paused;
    if (manuallyPaused.current) player.pause();
    else play(player);
  }

  function replay() {
    const player = video.current;
    if (!player) return;
    manuallyPaused.current = false;
    player.currentTime = 0;
    play(player);
  }

  function expand() {
    const player = video.current;
    if (frame.current?.requestFullscreen) {
      void frame.current.requestFullscreen().catch(() => player?.webkitEnterFullscreen?.());
    } else {
      player?.webkitEnterFullscreen?.();
    }
  }

  return (
    <figure className={styles.film}>
      <div className={styles.filmFrame} ref={frame}>
        <video
          id={videoId}
          ref={video}
          poster={base + ".webp"}
          preload="none"
          muted
          playsInline
          loop
          aria-label={name + " walkthrough"}
          aria-describedby={videoId + "-description"}
          onPlay={() => {
            setPlaying(true);
            document.dispatchEvent(new CustomEvent(playEvent, { detail: id }));
          }}
          onPause={() => setPlaying(false)}
          onLoadedMetadata={event => setDuration(event.currentTarget.duration)}
          onTimeUpdate={event => setPosition(event.currentTarget.currentTime)}
          onError={() => { setPlaying(false); setFailed(true); }}
        />
        <div className={styles.controls} aria-label={name + " playback controls"} role="group">
          <button type="button" onClick={toggle} aria-controls={videoId} disabled={failed}
            aria-label={(playing ? "Pause " : "Play ") + name + " walkthrough"}>
            <span aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span>
          </button>
          <input
            type="range"
            min="0"
            max={duration || 1}
            step="0.1"
            value={position}
            disabled={!duration || failed}
            aria-label={name + " playback progress"}
            aria-valuetext={clock(position) + " of " + clock(duration)}
            onChange={event => {
              if (!video.current) return;
              video.current.currentTime = event.currentTarget.valueAsNumber;
              setPosition(event.currentTarget.valueAsNumber);
            }}
          />
          <span className={styles.time} aria-hidden="true">{clock(position)}</span>
          <button type="button" onClick={replay} aria-controls={videoId} disabled={failed}
            aria-label={"Replay " + name + " walkthrough"}><span aria-hidden="true">↺</span></button>
          <button type="button" onClick={expand} aria-controls={videoId}
            aria-label={"Expand " + name + " walkthrough"}><span aria-hidden="true">⛶</span></button>
        </div>
      </div>
      <figcaption id={videoId + "-description"} className={styles.filmCaption}>
        {description}
      </figcaption>
      {failed && <p role="status" className={styles.filmError}>The recording is unavailable. The steps below describe the walkthrough.</p>}
    </figure>
  );
}
