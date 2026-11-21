import type { Metadata } from "next";
import { InformationShell } from "@/components/information-shell";
import { GuideFilm } from "./guide-film";
import styles from "./guide.module.css";
import "../story-pages.css";

export const metadata: Metadata = {
  title: "How Dear Tomorrow Works",
  description: "Watch how to write a letter, grow a Memory Tree, and make a Memory Book in Dear Tomorrow.",
};

const chapters = [
  {
    id: "letters",
    number: "01",
    name: "Letters",
    title: "Some words deserve to stay.",
    description: "Write on paper, choose the details that feel like you, and seal it in an envelope you can open again.",
    steps: ["Write your letter.", "Make it personal.", "Seal it and keep it safe."],
    note: "Your letters stay in this browser’s Letter Box. Sending to a partner is still in development.",
    filmDescription: "A fictional letter is written in Letter Studio. A wax seal is chosen, the envelope closes, and the paper unfolds again in the reader.",
  },
  {
    id: "memory-tree",
    number: "02",
    name: "Memory Tree",
    title: "Watch your memories grow.",
    description: "Each memory becomes a leaf. Choose one on the illustrated tree, or revisit the date in your timeline or calendar.",
    steps: ["Plant your tree.", "Add the moments that matter.", "Return to every memory as your tree grows."],
    filmDescription: "A seed settles into the soil. A dated memory grows the first leaf, more memories fill the young tree, and a leaf is selected to read its story.",
  },
  {
    id: "memory-books",
    number: "03",
    name: "Memory Books",
    title: "Give your story pages.",
    description: "Choose a cover, then arrange photographs and words in Studio. Open the finished book to see your pages turn.",
    steps: ["Create your book.", "Fill it with memories.", "Turn through your story."],
    filmDescription: "A book is named and given a cover. A title and photograph are arranged in Studio, and the book opens and turns a page in the reader.",
  },
] as const;

const facts = [
  ["Do I need an account?", "You can write letters, grow a tree, and make a book without signing in."],
  ["Where is my work saved?", "Saved work stays in this browser on this device, including after refresh. Export backups to keep a copy if you clear the browser’s data or change devices."],
  ["Can I share with someone?", "Accounts, partner sharing, letter delivery, and cloud sync are still in development. Letter opening times currently work locally."],
  ["Can I use it on my phone?", "The preview adapts to smaller screens. You can swipe through a book or use the Memory Tree’s journal, timeline, and calendar."],
];

export default function HowItWorksPage() {
  return (
    <InformationShell showPreviewLink={false}>
      <div className={styles.guide}>
        <section className={styles.hero} aria-labelledby="guide-title">
          <p className={styles.eyebrow}>How Dear Tomorrow works</p>
          <h1 id="guide-title">Every memory begins <em>somewhere.</em></h1>
          <p className={styles.intro}>
            Write the words you want to keep. Grow a tree from the moments you’ve shared.
            Turn your story into a book you can hold onto, page by page.
          </p>
          <a className={styles.down} href="#letters" aria-label="Scroll to the first chapter"><span aria-hidden="true">↓</span></a>
        </section>

        {chapters.map(chapter => (
          <section
            key={chapter.id}
            id={chapter.id}
            aria-labelledby={chapter.id + "-title"}
            className={styles.chapter}
            data-chapter={chapter.id}
          >
            <div className={styles.chapterInner}>
              <div className={styles.chapterTitle}>
                <p className={styles.eyebrow}><span>{chapter.number}</span> {chapter.name}</p>
                <h2 id={chapter.id + "-title"}>{chapter.title}</h2>
              </div>
              <GuideFilm id={chapter.id} name={chapter.name} description={chapter.filmDescription} />
              <div className={styles.chapterCopy}>
                <p>{chapter.description}</p>
                <ol className={styles.steps}>
                  {chapter.steps.map(step => <li key={step}>{step}</li>)}
                </ol>
                {"note" in chapter && <p className={styles.note}>{chapter.note}</p>}
              </div>
            </div>
          </section>
        ))}

        <section className={styles.facts} aria-labelledby="guide-facts">
          <h2 id="guide-facts">Good to know.</h2>
          <dl>
            {facts.map(([question, answer]) => (
              <div key={question}><dt>{question}</dt><dd>{answer}</dd></div>
            ))}
          </dl>
        </section>

        <section className={styles.ending} aria-labelledby="guide-ending">
          <h2 id="guide-ending">However your story begins,<br/><em>give it somewhere to stay.</em></h2>
        </section>
      </div>
    </InformationShell>
  );
}
