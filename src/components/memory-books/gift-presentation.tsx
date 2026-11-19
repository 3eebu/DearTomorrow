'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GiftDesign } from '@/lib/book-gift';
import s from './gift-presentation.module.css';

export function GiftPaper({ gift, releasing = false, unwrap }: {
  gift: GiftDesign; releasing?: boolean; unwrap?: () => void;
}) {
  return <div className={s.paper} data-releasing={releasing} data-pattern={gift.pattern}
    data-ribbon={gift.material} data-bow={gift.bow}
    style={{ '--wrap': gift.color, '--ribbon-ink': gift.ribbon } as CSSProperties}>
    <div className={s.edges} aria-hidden="true"/>
    <div className={s.side} aria-hidden="true"/><div className={s.top} aria-hidden="true"/>
    <div className={s.bottom} aria-hidden="true"/><div className={s.left} aria-hidden="true"/>
    <div className={s.ribbon}>
      <i aria-hidden="true"/><i aria-hidden="true"/><i aria-hidden="true"/>
      <div className={s.tag}>
        <strong>{gift.tag}</strong>
        {gift.to && <span>To {gift.to}</span>}{gift.from && <span>From {gift.from}</span>}
      </div>
      <div className={s.bow} aria-hidden="true"><i/><i/><i/></div>
      {unwrap && !releasing && <button className={s.untieKnot} type="button" aria-label="Untie gift ribbon" onClick={unwrap}/>}
    </div>
  </div>;
}

export function WrappedCover({ gift, releasing, unwrap }: { gift: GiftDesign; releasing: boolean; unwrap: () => void }) {
  return <div className={s.wrappedCover}><GiftPaper gift={gift} releasing={releasing} unwrap={unwrap}/></div>;
}

export function GiftActions({ releasing, unwrap, skip }: { releasing: boolean; unwrap: () => void; skip: () => void }) {
  return <div className={s.giftActions}>
    <button type="button" disabled={releasing} onClick={unwrap}>{releasing ? 'Opening your gift…' : 'Untie the ribbon'}</button>
    <button type="button" onClick={skip}>Skip wrapping</button>
  </div>;
}

export function useGiftPresentation(startWrapped: boolean, bookId: string) {
  const [step, setStep] = useState<'wrapped' | 'releasing' | 'revealed'>(startWrapped ? 'wrapped' : 'revealed');
  const [presented, setPresented] = useState(startWrapped);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), [bookId]);
  function skip() {
    clearTimeout(timer.current);
    setStep('revealed');
  }
  function unwrap() {
    if (step !== 'wrapped') return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      skip();
      return;
    }
    setStep('releasing');
    timer.current = setTimeout(skip, 1260);
  }
  return { wrapped: step !== 'revealed', releasing: step === 'releasing', unwrap, skip, presented,
    replay: () => { clearTimeout(timer.current); setPresented(true); setStep('wrapped'); } };
}
