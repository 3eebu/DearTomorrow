import type { Metadata } from "next";
import Link from "next/link";
import { InformationShell } from "@/components/information-shell";
import { AboutKeepsake } from "@/components/about-keepsake";
import "../story-pages.css";

export const metadata:Metadata={
  title:"Made for a Very Special Woman — About Dear Tomorrow",
  description:"The personal story behind Dear Tomorrow, a quiet place to keep the memories and moments that matter."
};

const features=[
  {number:"01",label:"Letters",title:"For words worth keeping",body:"Write something for today, a birthday, a difficult day, or a moment still to come. Letters can also accompany someone along a journey. Timed delivery and shared letters are part of the longer-term vision.",href:"/letters",link:"Meet the letters"},
  {number:"02",label:"Memory Books",title:"A story you can turn through",body:"Give your story a title, choose a cover and bring your favorite moments into chapters. Our current preview lets you personalize pages and keep books on this device.",href:"/memory-books",link:"See the sample book"},
  {number:"03",label:"Memory Tree",title:"Let your story grow",body:"Plant a tree and watch each saved memory grow into a leaf. Choose a leaf on the illustration, or revisit the moments that shaped it in the timeline and calendar.",href:"/memory-tree",link:"Explore the Memory Tree"},
];
export default function AboutPage(){
  return <InformationShell>
    <section className="info-about-hero">
      <div className="info-about-title">
        <p className="info-kicker"><span className="info-kicker-rule"/> THE REASON DEAR TOMORROW BEGAN</p>
        <h1>Made For A <em>Very Special Woman.</em></h1>
      </div>
      <AboutKeepsake />
      <div className="info-about-letter">
        <div className="info-personal-story">
          <p>I created Dear Tomorrow because I&apos;m deeply in love with an incredible woman. I wanted to make something just for her. Somewhere we could keep our memories, remember all our little firsts, and create something beautiful that would always belong to us.</p>
          <p>But I know our story isn&apos;t the only one. I know there are people out there who love someone just as deeply, and I wanted them to have something like this too.</p>
          <p>So, whoever brought you here, I hope Dear Tomorrow helps you make them feel as special as they are to you.</p>
        </div>
        <div className="info-hero-actions">
          <Link href="/how-it-works" className="info-btn">See how it works <span aria-hidden="true">↗</span></Link>
          <Link href="/#dt-discover" className="info-text-link">Explore Dear Tomorrow <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </section>

    <section className="info-letter-section">
      <div className="info-section-index">02 <span/> WHAT DEAR TOMORROW IS MEANT TO BE</div>
      <div className="info-meaning-copy">
        <p className="info-kicker">A place for the things that stay</p>
        <h2>A little place for <em>the things that stay.</em></h2>
        <p>The internet gives us endless ways to talk. I wanted to make somewhere quieter — somewhere the words, dates and ordinary moments that mean everything could have a home.</p>
      </div>
    </section>

    <section className="info-feature-section">
      <div className="info-section-index">03 <span/> WHAT I&apos;M BUILDING</div>
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
      <p>Dear Tomorrow is currently an interactive prototype. You can write letters, customize books, and grow a Memory Tree. Your work is saved in this browser. Accounts, shared storage, scheduled delivery and subscriptions are part of the longer-term vision.</p>
      <Link href="/how-it-works" className="info-btn">What can I try? <span aria-hidden="true">↗</span></Link>
    </section>
  </InformationShell>;
}
