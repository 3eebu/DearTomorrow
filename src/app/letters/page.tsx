import type { Metadata } from 'next';
import HomeStudio from '@/components/home-studio';
import LettersWorkspace from '@/components/letters/letters-workspace';
import '../home-studio.css';
import {workspaceScope} from '@/lib/accounts/server';
import {CloudBoundary} from '@/components/accounts/cloud-boundary';

export const metadata: Metadata = {
  title: 'Letters — Dear Tomorrow',
  description: 'Write on personalized stationery, seal your letters, and keep them in a browser-local Letter Box.'
};

export default async function LettersPage({searchParams}:{searchParams:Promise<{space?:string}>}) {
  const scope=await workspaceScope('letters',(await searchParams).space);
  return <HomeStudio page="letters" letters={<CloudBoundary key={scope?.owner??'guest'} scope={scope}><LettersWorkspace scope={scope}/></CloudBoundary>} />;
}
