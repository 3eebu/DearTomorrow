import type { Metadata } from 'next';
import { InformationShell } from '@/components/information-shell';
import JourneyWorkspace from '@/components/journey-letters/journey-workspace';
import '../story-pages.css';
import {workspaceScope} from '@/lib/accounts/server';
import {CloudBoundary} from '@/components/accounts/cloud-boundary';

export const metadata: Metadata = {
  title: 'Until We Meet Again — Journey Letters',
  description: 'Six little letters for the distance between goodbye and hello. Write and seal a journey in Dear Tomorrow.',
};

export default async function JourneyLettersPage({searchParams}:{searchParams:{space?:string}}) {
  const scope=await workspaceScope('journeys',searchParams.space);
  return <InformationShell showPreviewLink={false}><CloudBoundary key={scope?.owner??'guest'} scope={scope}><JourneyWorkspace scope={scope}/></CloudBoundary></InformationShell>;
}
