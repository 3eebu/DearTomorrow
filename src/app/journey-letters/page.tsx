import type { Metadata } from 'next';
import { InformationShell } from '@/components/information-shell';
import JourneyWorkspace from '@/components/journey-letters/journey-workspace';
import '../story-pages.css';

export const metadata: Metadata = {
  title: 'Until We Meet Again — Journey Letters',
  description: 'Six little letters for the distance between goodbye and hello. Write and seal a journey in Dear Tomorrow.',
};

export default function JourneyLettersPage() {
  return <InformationShell showPreviewLink={false}><JourneyWorkspace/></InformationShell>;
}
