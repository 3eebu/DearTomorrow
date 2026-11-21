'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { journeyRoute } from '@/lib/journey-route';
import type { JourneyPlace } from '@/lib/journey-letters';

function Plane() {
  return <path d="M-16-1.1-11-1.6-14-7-11-7-6-2 1-2-3-13 1-13 8-2 15-1.7Q19-1 19 0t-4 1.7L8 2 1 13H-3L1 2-6 2-11 7h-3l3-5.4-5-1.5Z"/>;
}

export function JourneyMap({ from, to, progress, start = false }: {
  from: JourneyPlace; to: JourneyPlace; progress: number; start?: boolean;
}) {
  const id = useId();
  const route = useMemo(() => journeyRoute(from.point,to.point), [from.point,to.point]);
  const stage = useRef<SVGSVGElement>(null), airplane = useRef<SVGGElement>(null), line = useRef<SVGPathElement>(null);
  const playing = useRef(false);
  const planned = useRef(progress);
  const [replay,setReplay] = useState(0);
  planned.current = progress;
  const pose = route.at(progress);

  const initialPose = useRef(`translate(${pose.x} ${pose.y}) rotate(${pose.heading})`);

  useEffect(() => {
    const surface = stage.current, plane = airplane.current, draw = line.current;
    if (!surface || !plane || !draw || (!start && !replay) || typeof IntersectionObserver === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, elapsed = 0, last = 0, seen = false, done = false;
    const duration = 3450;
    function settle() {
      if (!surface || !plane || !draw) return;
      done = true;
      playing.current = false;
      surface.removeAttribute('data-intro');
      surface.removeAttribute('data-stamps');
      surface.removeAttribute('data-intro-paused');
      draw.removeAttribute('stroke-dashoffset');
      plane.removeAttribute('opacity');
      const {x,y,heading} = route.at(planned.current);
      plane.setAttribute('transform', `translate(${x} ${y}) rotate(${heading})`);
    }
    function tick(now: number) {
      if (!surface || !plane || !draw) return;
      if (last) elapsed += now-last;
      last = now;
      if (elapsed >= duration) { settle(); return; }
      const drawn = Math.max(0,Math.min(1,(elapsed-180)/2100));
      const journey = Math.max(0,Math.min(1,(elapsed-360)/2500));
      const eased = (1-Math.cos(Math.PI*journey))/2;
      draw.setAttribute('stroke-dashoffset', String(1-drawn));
      surface.setAttribute('data-stamps', String(Math.floor(Math.max(0,(elapsed-500))/360)));
      const fraction = elapsed >= 3060 ? planned.current : eased;
      const {x,y,heading} = route.at(fraction);
      const opacity = elapsed < 2840 ? 1 : elapsed < 3060 ? (3060-elapsed)/220 : (elapsed-3060)/390;
      plane.setAttribute('transform', `translate(${x} ${y}) rotate(${heading})`);
      plane.setAttribute('opacity',String(opacity));
      frame = requestAnimationFrame(tick);
    }
    function sync() {
      cancelAnimationFrame(frame);
      if (done) return;
      if (media.matches) { settle(); return; }
      if (!seen || document.hidden) { surface?.setAttribute('data-intro-paused','true'); last = 0; return; }
      playing.current = true;
      surface?.removeAttribute('data-intro-paused');
      surface?.setAttribute('data-intro','true');
      frame = requestAnimationFrame(tick);
    }
    const observer = new IntersectionObserver(([entry]) => { seen = entry.isIntersecting; sync(); }, {threshold:.15});
    observer.observe(surface);
    document.addEventListener('visibilitychange',sync);
    media.addEventListener('change',sync);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange',sync);
      media.removeEventListener('change',sync);
      settle();
    };
  },[route,start,replay]);

  useEffect(() => {
    if (!playing.current) airplane.current?.setAttribute('transform', `translate(${pose.x} ${pose.y}) rotate(${pose.heading})`);
  },[pose.x,pose.y,pose.heading]);

  return <figure className="jl-map">
    <div className="jl-map-paper">
      <svg ref={stage} width={route.width} height={route.height} viewBox={`0 0 ${route.width} ${route.height}`}
        role="img" aria-label={`Illustrated route from ${from.name} to ${to.name} with six envelope markers`}>
        <defs>
          <pattern id={id+'-grid'} width="35" height="35" patternUnits="userSpaceOnUse">
            <path d="M35 0H0v35" fill="none" stroke="#917f64" strokeOpacity=".29" strokeWidth=".7"/>
          </pattern>
          <radialGradient id={id+'-wash'} cx=".55" cy=".36" r=".66">
            <stop stopColor="#fbf4e3" stopOpacity=".18"/><stop offset="1" stopColor="#f3e8d3" stopOpacity=".78"/>
          </radialGradient>
          <image id={id+'-land'} href="/journey-land.svg" width="720" height="360"/>
          <linearGradient id={id+'-route'}><stop stopColor="#a36e54"/><stop offset=".56" stopColor="#966d40"/><stop offset="1" stopColor="#703b46"/></linearGradient>
        </defs>
        <rect width="720" height="332" fill="#f3ead7"/>
        <g className="jl-coast" transform={`translate(${route.mapX} ${route.mapY}) scale(${route.scale})`}>
          {[-1440,-720,0,720,1440].map(x => <use key={x} x={x} href={`#${id}-land`}/>)}
        </g>
        <rect width="720" height="332" fill={`url(#${id}-wash)`}/>
        <rect width="720" height="332" fill={`url(#${id}-grid)`}/>
        <g className="jl-compass" transform="translate(54 56)" aria-hidden="true">
          <circle r="20"/><circle r="16" strokeDasharray="1 3"/>
          <path d="M0-16 3-3 16 0 3 3 0 16-3 3-16 0-3-3Z"/><text y="-27">N</text>
        </g>
        <path className="jl-map-thread" d={route.path}/>
        <path ref={line} className="jl-map-line" d={route.path} pathLength="1" stroke={`url(#${id}-route)`}/>
        {[route.a,route.b].map(({x,y},index) => <g className={index?'jl-arrival-mark':'jl-departure-mark'} key={index} transform={`translate(${x} ${y})`}>
          <circle r="12" fill="none"/><circle r="6" fill="#7e4450"/>
          {index===1&&<path d="M0-21v8m-4-4h8" fill="none"/>}
          <text className="jl-map-city" y="26" textAnchor="middle">
            {(index===0?from.name:to.name).split(',')[0].slice(0,25)}
          </text>
        </g>)}
        {[.10,.25,.40,.56,.72,.88].map((fraction,index) => {
          const {x,y} = route.at(fraction);
          return <g className="jl-map-stamp" data-stamp={index} key={index} transform={`translate(${x} ${y})`}>
            <circle r={route.span<235?9:12}/><path d="M-5-3.5h10v7H-5zM-5-3.5 0 .2l5-3.7"/>
          </g>;
        })}
        <g ref={airplane} className="jl-plane" transform={initialPose.current}><Plane/></g>
        <path className="jl-map-rule" d="M26 282h668"/>
        <text x="360" y="309" textAnchor="middle" className="jl-map-hand">A little closer with every mile.</text>
      </svg>
    </div>
    <figcaption><span>{route.geographic ? 'Illustrated route' : 'Schematic route · locations shown as text'}</span>
      <button className="jl-link" type="button" onClick={() => setReplay(n => n+1)}>Replay route <span aria-hidden="true">↻</span></button>
    </figcaption>
  </figure>;
}
