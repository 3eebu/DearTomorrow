'use client';
import Link from 'next/link';
import './story-pages.css';

export default function ErrorPage({reset}:{error:Error & {digest?:string};reset:()=>void}) {
  return <main className="dt-system-page" aria-labelledby="dt-error-title">
    <span className="dt-system-mark" aria-hidden="true">✧</span>
    <p className="dt-overline">A MOMENT TO RESET</p>
    <h1 id="dt-error-title">This page needs another moment.</h1>
    <p>Please try again. Your private account details stay private.</p>
    <div className="dt-system-actions"><button className="dt-button" onClick={reset}>Try again</button><Link href="/">Return home</Link></div>
  </main>;
}
