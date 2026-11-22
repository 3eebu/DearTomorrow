import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { InformationShell } from "@/components/information-shell";
import { AboutKeepsake } from "@/components/about-keepsake";
import "../story-pages.css";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "Made for a Very Special Woman — About Dear Tomorrow",
  description: "The personal story behind Dear Tomorrow and the woman who inspired it.",
};

export default function AboutPage() {
  const recording = "about/javeda-zindagi.mp3";
  const audioSource = existsSync(join(process.cwd(), "public", recording)) ? `/${recording}` : undefined;

  return (
    <InformationShell>
      <article className={styles.dedication} aria-labelledby="dedication-title">
        <div className={styles.opening}>
          <p className={styles.kicker}>The reason Dear Tomorrow began</p>
          <h1 id="dedication-title">Made For A <em>Very Special Woman.</em></h1>
        </div>
        <AboutKeepsake audioSource={audioSource} />
        <div className={styles.letter}>
          <div className={styles.story}>
            <p>I created Dear Tomorrow because I&apos;m deeply in love with an incredible woman. I wanted to make something just for her. Somewhere we could keep our memories, remember all our little firsts, and create something beautiful that would always belong to us.</p>
            <p>But I know our story isn&apos;t the only one. I know there are people out there who love someone just as deeply, and I wanted them to have something like this too.</p>
            <p>So, whoever brought you here, I hope Dear Tomorrow helps you make them feel as special as they are to you.</p>
          </div>
          <p className={styles.closing}>Some stories change your life. Mine inspired me to build something that could hold ours.</p>
        </div>
      </article>
    </InformationShell>
  );
}
