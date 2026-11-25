'use client';

import dynamic from 'next/dynamic';
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  environmentAnchors, environmentLayers, frameEnvironment, hasCompletePainting,
  isPaintedLayer, masterPlate, originalWorldBounds, suppliedPlates, type EnvironmentPlate,
  type LiveLayerId, type PaintedLayerId, type WorldBounds,
} from '@/lib/memory-tree-environment';
import styles from './landscape.module.css';

const Studio = process.env.NODE_ENV === 'development'
  ? dynamic(() => import('./environment-studio'), { ssr: false })
  : null;
const assembled = hasCompletePainting(suppliedPlates);
const painted = environmentLayers.filter(({ id }) => isPaintedLayer(id));
const studioLayers = [
  { id: 'master', label: 'Approved master painting', available: !assembled },
  ...environmentLayers.map(({ id, label }) => ({
    id, label, available: assembled && isPaintedLayer(id) && Boolean(suppliedPlates[id]),
  })),
];

function position({ x, y, width, height }: WorldBounds): CSSProperties {
  return { left: `${x * 100}%`, top: `${y * 100}%`, width: `${width * 100}%`, height: `${height * 100}%` };
}

function placement(plate: EnvironmentPlate): CSSProperties {
  const { x, y, width, height } = plate.bounds ?? originalWorldBounds;
  return {
    ...position({ x, y, width, height }),
    transformOrigin: plate.pivot
      ? `${(plate.pivot.x - x) / width * 100}% ${(plate.pivot.y - y) / height * 100}%` : undefined,
    maskImage: plate.mask ? `url("${plate.mask}")` : undefined,
  };
}

const framing = frameEnvironment(masterPlate.bounds);

function Plate({ plate, alt = '', onLoad, onError }: {
  plate: EnvironmentPlate; alt?: string; onLoad?: () => void; onError?: () => void;
}) {
  return <picture className={styles.plate} style={placement(plate)}>
    {plate.smallSrc && <source media="(max-width: 600px)" srcSet={plate.smallSrc}/>}
    {/* Pre-encoded art is sized and cropped with its world, including future alpha plates. */}
    <img src={plate.src} alt={alt} decoding="async" onLoad={onLoad} onError={onError}/>
  </picture>;
}

export function Landscape({ studio, growthStage, liveLayers }: {
  studio: boolean; growthStage: string; liveLayers?: Partial<Record<LiveLayerId, ReactNode>>;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [showAnchors, setShowAnchors] = useState(false);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  const [loaded, setLoaded] = useState<ReadonlySet<PaintedLayerId>>(() => new Set());
  const [failedPlate, setFailedPlate] = useState(false);
  const [failedMaster, setFailedMaster] = useState(false);
  const showAssembly = assembled && !failedPlate && loaded.size === painted.length;
  function toggleLayer(id: string) {
    setHidden(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const description = 'A golden-green tree opens its branches above a wildflower meadow, with snowy mountains beyond.';
  return <div className={styles.landscape}>
    <figure>
      <div className={styles.frame} ref={frame} role="group" aria-label="Memory Tree landscape"
        style={{ '--scene-ratio': framing.aspect } as CSSProperties}>
        <div className={styles.scene}>
          <div className={styles.artwork}>
            <div className={styles.world} style={position(framing.registration)}>
              {!showAssembly && !hidden.has('master') && !failedMaster &&
                <Plate plate={masterPlate} alt={description} onError={() => setFailedMaster(true)}/>}
              {assembled && !failedPlate && <div className={styles.stack} style={{visibility: showAssembly ? 'visible' : 'hidden'}}
                role="group" aria-label={description}>
                {environmentLayers.map(({ id }) => {
                  if (!isPaintedLayer(id)) return <div key={id} className={styles.live} data-layer={id}
                    hidden={hidden.has(id)}>{liveLayers?.[id]}</div>;
                  const plate = suppliedPlates[id];
                  return plate && <div key={id} data-layer={id} hidden={hidden.has(id)}>
                    <Plate plate={plate} onError={() => setFailedPlate(true)}
                      onLoad={() => setLoaded(previous => new Set(previous).add(id))}/>
                  </div>;
                })}
              </div>}
              {studio && showAnchors && <div className={styles.anchors} aria-hidden="true">
                {Object.entries(environmentAnchors).map(([key, anchor]) =>
                  <span key={key} data-anchor={key} style={{ left: `${anchor.x * 100}%`, top: `${anchor.y * 100}%` }}>
                    <span>{anchor.label}</span>
                  </span>)}
              </div>}
            </div>
          </div>
        </div>
        {failedMaster && !showAssembly && <p className={styles.failure} role="status">
          The landscape couldn’t load. You can still open your memories in Tree View.
        </p>}
      </div>
      <figcaption className={styles.caption}>The Memory Tree in full growth.</figcaption>
    </figure>
    {studio && Studio && <div className={styles.inspector}>
      <Studio layers={studioLayers} showAnchors={showAnchors} onShowAnchors={setShowAnchors}
        hiddenLayers={hidden} onToggleLayer={toggleLayer} growthStage={growthStage} sceneRef={frame}/>
    </div>}
  </div>;
}
