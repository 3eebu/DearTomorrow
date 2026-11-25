'use client';

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

type Props = {
  title: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  dismissOnBackdrop?: boolean;
  closeLabel?: string;
  className?: string;
  size?: 'small' | 'standard' | 'wide';
};

export function StationeryDialog({ title, eyebrow, children, onClose, busy = false,
  dismissOnBackdrop = false, closeLabel = 'Close dialog', className, size = 'standard' }: Props) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const closeTimer = useRef<number>(undefined);
  const backdropPressed = useRef(false);

  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element?.showModal();
    const viewport = window.visualViewport;
    function fitVisibleViewport() {
      if (viewport?.scale !== 1) {
        element?.style.removeProperty('--sheet-viewport-height');
        element?.style.removeProperty('--sheet-viewport-top');
        return;
      }
      element?.style.setProperty('--sheet-viewport-height', `${viewport.height}px`);
      element?.style.setProperty('--sheet-viewport-top', `${viewport.offsetTop}px`);
    }
    fitVisibleViewport();
    viewport?.addEventListener('resize', fitVisibleViewport);
    viewport?.addEventListener('scroll', fitVisibleViewport);
    return () => {
      viewport?.removeEventListener('resize', fitVisibleViewport);
      viewport?.removeEventListener('scroll', fitVisibleViewport);
      window.clearTimeout(closeTimer.current);
      if (!element?.open) return;
      const restore = document.activeElement === document.body || element.contains(document.activeElement);
      element.close();
      if (restore && opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  function dismiss() {
    const element = dialog.current;
    if (busy || !element || element.dataset.closing) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose();
      return;
    }
    element.dataset.closing = 'true';
    closeTimer.current = window.setTimeout(onClose, 200);
  }

  function trapTab(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.currentTarget.dataset.closing) {
      event.preventDefault();
      return;
    }
    if (event.key !== 'Tab') return;
    const stops = [...event.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, summary, [tabindex]',
    )].filter(el => el.tabIndex >= 0 && !el.matches(':disabled') && el.getClientRects().length);
    const first = stops[0];
    const last = stops.at(-1);
    if (event.shiftKey ? document.activeElement === first : document.activeElement === last) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  }

  return <dialog ref={dialog} className={className ? `dt-sheet ${className}` : 'dt-sheet'} data-size={size}
    aria-labelledby={id} onCancel={event => { event.preventDefault(); dismiss(); }} onKeyDown={trapTab}
    onPointerDown={event => { backdropPressed.current = event.target === event.currentTarget; }}
    onClick={event => {
      if (dismissOnBackdrop && backdropPressed.current && event.target === event.currentTarget) dismiss();
      backdropPressed.current = false;
    }}>
    <div className="dt-sheet-shell">
      <div className="dt-sheet-header">
        <div>{eyebrow}<h2 id={id} tabIndex={-1}>{title}</h2></div>
        <button type="button" className="dt-sheet-close" aria-label={closeLabel} disabled={busy} onClick={dismiss}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="m6.5 6.5 11 11m0-11-11 11" />
          </svg>
        </button>
      </div>
      <div className="dt-sheet-scroll">{children}</div>
    </div>
  </dialog>;
}

export function StationeryConfirm({ title, message, action, onClose, onConfirm }: {
  title: string; message: string; action: string; onClose: () => void; onConfirm: () => void;
}) {
  return <StationeryDialog title={title} size="small" onClose={onClose}>
    <p>{message}</p>
    <div className="dt-sheet-actions">
      <button type="button" className="dt-tactile-secondary" onClick={event => {
        const dialog = event.currentTarget.closest('dialog');
        if (dialog?.requestClose) dialog.requestClose();
        else onClose();
      }}>Cancel</button>
      <button type="button" className="dt-tactile-primary" onClick={onConfirm}>{action}</button>
    </div>
  </StationeryDialog>;
}
