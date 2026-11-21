import Link from 'next/link';
import './story-pages.css';

export default function NotFound() {
  return <main className="dt-system-page" aria-labelledby="dt-not-found-title">
    <span className="dt-system-mark" aria-hidden="true">✉</span>
    <p className="dt-overline">A LITTLE DETOUR</p>
    <h1 id="dt-not-found-title">This page hasn’t found its way here.</h1>
    <p>The address may have changed, or the page may have been tucked away.</p>
    <Link className="dt-button" href="/">Return home</Link>
  </main>;
}
