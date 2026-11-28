'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useId, useRef, useState} from 'react';

const destinations = [
  ['Our story', '/about'],
  ['How it works', '/how-it-works'],
  ['Memory Books', '/memory-books'],
  ['Memory Tree', '/memory-tree'],
  ['Letters', '/letters'],
  ['Journey Letters', '/journey-letters'],
] as const;

export function SiteNavigation({compact = false}: {compact?: boolean}) {
  const pathname = usePathname();
  const panel = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !wrapper.current?.contains(event.target)) setOpenOn(null);
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  function closeFromLink() {
    if (open) trigger.current?.focus();
    setOpenOn(null);
  }

  return (
    <div
      ref={wrapper}
      className={`dt-site-navigation${compact ? ' dt-site-navigation-compact' : ''}`}
      onBlur={event => {
        if (open && !event.currentTarget.contains(event.relatedTarget)) setOpenOn(null);
      }}
      onKeyDown={event => {
        if (open && event.key === 'Escape') {
          event.preventDefault();
          setOpenOn(null);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        className="dt-site-menu"
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpenOn(open ? null : pathname)}
      >
        <span className="dt-site-menu-icon" aria-hidden="true" />
        Menu
      </button>
      <nav id={panel} className="dt-site-links" data-open={open} aria-label="Primary navigation">
        <Link className="dt-site-home" href="/" aria-current={pathname === '/' ? 'page' : undefined} onNavigate={closeFromLink}>Home</Link>
        {destinations.map(([label, href]) => (
          <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} onNavigate={closeFromLink}>{label}</Link>
        ))}
      </nav>
    </div>
  );
}
