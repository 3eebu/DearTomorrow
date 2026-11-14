import type { Metadata } from "next";
import Link from "next/link";
import { InformationShell } from "@/components/information-shell";
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
      <div className="info-tree-scene" aria-label="An illustrated memory tree with a gently growing trunk and branches" role="img">
        <span className="info-scene-circle"/>
        <svg viewBox="0 0 360 420" className="info-tree-graphic" aria-hidden="true">
          <path className="info-tree-trunk" d="M180 388 C178 333 182 296 179 254 C175 196 184 150 186 91"/>
          <path className="info-tree-branch one" d="M181 282 C156 255 140 230 105 219 C81 210 61 194 51 173"/>
          <path className="info-tree-branch two" d="M181 242 C205 221 226 191 253 173 C270 161 287 151 307 151"/>
          <path className="info-tree-branch three" d="M180 197 C158 176 143 150 138 114 C135 95 119 80 106 75"/>
          <path className="info-tree-branch four" d="M185 150 C204 129 223 112 228 82"/>
          <g className="info-leaf-cluster">
            <ellipse cx="50" cy="165" rx="15" ry="29" transform="rotate(-38 50 165)"/>
            <ellipse cx="80" cy="204" rx="14" ry="27" transform="rotate(-57 80 204)"/>
            <ellipse cx="107" cy="217" rx="13" ry="26" transform="rotate(-31 107 217)"/>
            <ellipse cx="106" cy="75" rx="16" ry="31" transform="rotate(-31 106 75)"/>
            <ellipse cx="140" cy="116" rx="14" ry="27" transform="rotate(22 140 116)"/>
            <ellipse cx="228" cy="81" rx="15" ry="29" transform="rotate(28 228 81)"/>
            <ellipse cx="253" cy="172" rx="14" ry="27" transform="rotate(48 253 172)"/>
            <ellipse cx="305" cy="151" rx="15" ry="28" transform="rotate(48 305 151)"/>
          </g>
          <g className="info-buds"><circle cx="106" cy="75" r="5"/><circle cx="51" cy="173" r="5"/><circle cx="228" cy="82" r="5"/><circle cx="307" cy="151" r="5"/></g>
        </svg>
        <span className="info-scene-note">Every little moment helps a story grow.</span>
      </div>
    </section>

    <section className="info-letter-section">
      <div className="info-section-index">01 <span/> A NOTE FROM THE MAKER</div>
      <div className="info-founder-note">
        <p className="info-dropcap">I don't want Dear Tomorrow to feel like another app you open, use, and forget.</p>
        <p>I want it to feel like coming home. A place where you can leave a note for someone you love, come back to the day everything started, or open a book of moments you'd otherwise lose in a camera roll or an old conversation.</p>
        <p>Not everything meaningful needs to be shared with the world. Some things are better kept somewhere that feels like yours.</p>
        <p className="info-signoff">That's the kind of place I'm building.</p>
        <span className="info-signature">— The person behind Dear Tomorrow</span>
      </div>
    </section>

    <section className="info-feature-section">
      <div className="info-section-index">02 <span/> WHAT I'M BUILDING</div>
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
