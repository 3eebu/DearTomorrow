import Link from 'next/link';
import type {ReactNode} from 'react';
import {InformationShell} from '@/components/information-shell';
import '@/app/story-pages.css';

export function ServiceInformation({title,children}:{title:string;children:ReactNode}) {
  return <InformationShell showPreviewLink={false}>
    <article className="dt-service-information" aria-labelledby="service-title">
      <h1 id="service-title">{title}</h1>
      <p><strong>Draft for review.</strong> These notes describe the preview and are awaiting founder and legal approval.</p>
      {children}
      <p><Link href="/signup">Go to registration</Link></p>
    </article>
  </InformationShell>;
}
