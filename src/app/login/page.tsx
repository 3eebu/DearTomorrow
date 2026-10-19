import Link from "next/link";

export default function LoginPreviewPage() {
  return (
    <main className="login-preview">
      <Link className="wordmark login-wordmark" href="/" aria-label="Dear Tomorrow home">
        <span className="wordmark-mark" aria-hidden="true">d.</span>
        <span>Dear Tomorrow<span className="wordmark-period">.</span></span>
      </Link>
      <div className="login-note paper-grain">
        <span className="eyebrow">A little more time</span>
        <h1>Your private world is <em>on its way.</em></h1>
        <p>Sign-in will arrive with the next phase. This preview has no accounts or cloud storage yet, so you can explore everything without leaving personal details.</p>
        <Link className="button button-primary" href="/#top">Return to the preview <IconArrow /></Link>
        <p className="login-fineprint">Nothing you write in the demo is sent or saved.</p>
      </div>
    </main>
  );
}

function IconArrow() {
  return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M3.5 10h12m-5-5 5 5-5 5" /></svg>;
}
