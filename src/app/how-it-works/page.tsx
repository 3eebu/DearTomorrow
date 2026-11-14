import type { Metadata } from "next";
import Link from "next/link";
import { InformationShell } from "@/components/information-shell";
import "../story-pages.css";

export const metadata:Metadata={
  title:"How Dear Tomorrow Works — Start with a moment",
  description:"Discover letters, personalized memory books, the Memory Tree and Journey Letters. See what you can try in the current Dear Tomorrow preview."
};
const steps=[
  {number:"01",title:"Start with something small.",body:"A note you want to write. A date you never want to forget. A story you want to give a title. You don't need to plan an entire book before beginning."},
  {number:"02",title:"Make it yours.",body:"Choose a cover, write in your own words or add a meaningful date. We want the experience to feel personal without making you learn a complicated editor."},
  {number:"03",title:"Give it a place to live.",body:"In the full version, letters, book pages, journeys and memories will live together in a private shared space. For now, the preview is local and temporary."}
];
const experiences=[
  {name:"Letters",status:"Preview available",body:"Open a sample envelope and try writing a guest draft. Nothing is sent or saved to an account.",href:"/#letters",cta:"Try the letter"},
  {name:"Memory Books",status:"Preview available",body:"Rename a sample book, change its cover and use the page controls to turn through the demo.",href:"/#books",cta:"Try the book"},
  {name:"Memory Tree",status:"Early timeline preview",body:"Explore sample milestones, add a moment and switch to the matching calendar. The living tree animation is still in development.",href:"/#memory-tree",cta:"Explore memories"},
  {name:"Journey Letters",status:"Showcase only",body:"Explore six example checkpoints along a journey. The release schedule is illustrative, not a working delivery system.",href:"/#journeys",cta:"See the journey"}
];
export default function HowItWorksPage(){
  return <InformationShell>
    <section className="info-how-hero">
      <p className="info-kicker">A SIMPLE WAY TO BEGIN</p>
      <h1>It starts with <em>one little moment.</em></h1>
      <p>You don&apos;t need to know where the story is going. Just start with something worth keeping.</p>
      <Link href="/#dt-discover" className="info-btn">Explore the preview <span aria-hidden="true">↗</span></Link>
      <div className="info-paper-sweep" aria-hidden="true"><span className="info-sweep-line"/><span className="info-sweep-seal">✧</span></div>
    </section>

    <section className="info-steps-section">
      <div className="info-section-index">01 <span/> THREE SIMPLE STEPS</div>
      <div className="info-steps">
        {steps.map(s=><article key={s.number} className="info-step">
          <span>{s.number}</span>
          <h2>{s.title}</h2>
          <p>{s.body}</p>
        </article>)}
      </div>
    </section>

    <section className="info-experiences-section">
      <div className="info-section-index">02 <span/> EXPLORE THE FEATURES</div>
      <div className="info-feature-intro">
        <h2>Find what feels <em>like yours.</em></h2>
        <p>Everything is designed to be simple on the outside, thoughtful on the inside. Here is what you can explore right now.</p>
      </div>
      <div className="info-experience-list">
        {experiences.map((x,i)=><article className="info-experience" key={x.name}>
          <span className="info-feature-number">0{i+1}</span>
          <div className="info-experience-copy">
            <div className="info-experience-title"><h3>{x.name}</h3><span className="info-status">{x.status}</span></div>
            <p>{x.body}</p>
          </div>
          <Link href={x.href} aria-label={x.cta+" — "+x.name}>{x.cta} <span aria-hidden="true">↗</span></Link>
        </article>)}
      </div>
    </section>

    <section className="info-questions">
      <div className="info-section-index">03 <span/> GOOD TO KNOW</div>
      <div className="info-question-grid">
        <article><h3>Do I need an account to explore?</h3><p>No. The Phase 1 preview is open to explore without signing in.</p></article>
        <article><h3>Will my memories be saved?</h3><p>Not yet. Current demo changes exist only in your browser session and may disappear on refresh.</p></article>
        <article><h3>Can my partner receive a letter today?</h3><p>Not through this preview. Secure accounts, sending and scheduled unlocking are still being developed.</p></article>
        <article><h3>Can I use Dear Tomorrow on my phone?</h3><p>The preview has responsive layouts, but full mobile usability and touch interactions are still being tested and refined.</p></article>
      </div>
    </section>

    <section className="info-honesty-section">
      <p className="info-kicker">COME AS YOU ARE</p>
      <h2>There&apos;s no perfect way <em>to remember.</em></h2>
      <p>A sentence, a first date, or a whole chapter — it&apos;s all worth keeping.</p>
      <Link href="/about" className="info-btn">Read the story behind it <span aria-hidden="true">↗</span></Link>
    </section>
  </InformationShell>;
}
