import Link from "next/link";
import type { ReactNode } from "react";

export function InformationShell({children}:{children:ReactNode}) {
  return (
    <div className="info-root">
      <a className="info-skip" href="#main-content">Skip to content</a>
      <div className="info-topline">DEAR TOMORROW · AN INTERACTIVE PREVIEW</div>
      <header className="info-header">
        <Link href="/" className="info-brand">Dear <em>Tomorrow.</em></Link>
        <nav aria-label="Information pages">
          <Link href="/about">About</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/memory-books">Memory Books</Link>
          <Link href="/memory-tree">Memory Tree</Link>
          <Link href="/letters">Letters</Link>
        </nav>
        <Link className="info-header-cta" href="/">Explore the preview <span aria-hidden="true">↗</span></Link>
      </header>
      <main id="main-content">{children}</main>
      <footer className="info-footer">
        <div>
          <Link href="/" className="info-brand">Dear <em>Tomorrow.</em></Link>
          <p>Some words are worth waiting for.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/memory-tree">Memory Tree</Link>
          <Link href="/letters">Letters</Link>
        </nav>
        <small>© Dear Tomorrow · Currently in preview</small>
      </footer>
    </div>
  );
}
