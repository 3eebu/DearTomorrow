import type { Metadata } from "next";
import Link from "next/link";
import { InformationShell } from "@/components/information-shell";
import { AboutNewspaperMontage } from "@/components/about-newspaper-montage";
import "../story-pages.css";

export const metadata:Metadata={
  title:"About Dear Tomorrow — A little place for what matters",
  description:"Meet Dear Tomorrow: a quiet, personal home for the words, moments, letters and memories that mean the most."
};

const features=[
  {number:"01",label:"Letters",title:"For words worth keeping",body:"Write something that matters, whether it's for today, a birthday, a difficult day, or a moment still to come. Timed delivery and shared letters are part of the longer-term vision.",href:"/#letters",link:"Meet the letters"},
  {number:"02",label:"Memory Books",title:"A story you can turn through",body:"Give your story a title, choose a cover and bring your favorite moments into chapters. Our current preview lets you personalize and turn a sample book; the full scrapbook studio is being built.",href:"/#books",link:"See the sample book"},
  {number:"03",label:"Memory Tree",title:"Let your story grow",body:"Imagine a living tree where every first, every little adventure and every important date becomes a leaf or branch. The present demo uses a simple timeline and calendar while the true tree takes shape.",href:"/#memory-tree",link:"Explore the timeline preview"},
  {number:"04",label:"Journey Letters",title:"A little company along the way",body:"A letter for departure, another for halfway there, one for arrival. The six-checkpoint journey is a visual demo today; real scheduling and online unlocking come in a later phase.",href:"/#journeys",link:"See the journey"}
];
export default function AboutPage(){
  return <InformationShell>
    <section className="info-hero info-about-hero">
      <div className="info-hero-copy">
        <p className="info-kicker"><span className="info-kicker-rule"/> THE STORY BEHIND DEAR TOMORROW</p>
        <h1>A little place for <em>the things that stay.</em></h1>
        <p className="info-lead">The internet gives us endless ways to talk. I wanted to make somewhere quieter — somewhere the words, dates and ordinary moments that mean everything could have a home.</p>
        <div className="info-hero-actions">
          <Link href="/how-it-works" className="info-btn">See how it works <span aria-hidden="true">↗</span></Link>
          <Link href="/#dt-discover" className="info-text-link">Explore Dear Tomorrow <span aria-hidden="true">→</span></Link>
        </div>
      </div>
      <AboutNewspaperMontage />
    </section>

    <section className="info-letter-section">
      <div className="info-section-index">01 <span/> A NOTE FROM THE MAKER</div>
      <div className="info-founder-note">
        <p className="info-dropcap">I don&apos;t want Dear Tomorrow to feel like another app you open, use, and forget.</p>
        <p>I want it to feel like coming home. A place where you can leave a note for someone you love, come back to the day everything started, or open a book of moments you&apos;d otherwise lose in a camera roll or an old conversation.</p>
        <p>Not everything meaningful needs to be shared with the world. Some things are better kept somewhere that feels like yours.</p>
        <p className="info-signoff">That&apos;s the kind of place I&apos;m building.</p>
        <span className="info-signature">— The person behind Dear Tomorrow</span>
      </div>
    </section>

    <section className="info-feature-section">
      <div className="info-section-index">02 <span/> WHAT I&apos;M BUILDING</div>
      <div className="info-feature-intro">
        <h2>One home.<br/><em>So many ways to remember.</em></h2>
        <p>The different parts of Dear Tomorrow are meant to feel connected, like different chapters of the same story — not separate tools.</p>
      </div>
      <div className="info-feature-list">
        {features.map(f=><article className="info-feature-row" key={f.number}>
          <div className="info-feature-number">{f.number} / {f.label}</div>
          <div><h3>{f.title}</h3><p>{f.body}</p><Link href={f.href} className="info-text-link">{f.link} <span aria-hidden="true">→</span></Link></div>
        </article>)}
      </div>
    </section>
    <section className="info-honesty-section">
      <p className="info-kicker">WHERE WE ARE TODAY</p>
      <h2>A beginning, <em>not a finished story.</em></h2>
      <p>Dear Tomorrow is currently an interactive prototype. You can explore sample letters, customize a demo book, and add example memories in your browser. Real accounts, private storage, scheduled delivery and subscriptions have not launched yet.</p>
      <Link href="/how-it-works" className="info-btn">What can I try? <span aria-hidden="true">↗</span></Link>
    </section>
  </InformationShell>;
}
