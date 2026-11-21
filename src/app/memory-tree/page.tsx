import type { Metadata } from 'next';
import HomeStudio from '@/components/home-studio';
import MemoryTreeWorkspace from '@/components/memory-tree/memory-tree-workspace';
import '../home-studio.css';
import {workspaceScope} from '@/lib/accounts/server';
import {CloudBoundary} from '@/components/accounts/cloud-boundary';

export const metadata: Metadata = {
  title: 'Memory Tree — Dear Tomorrow',
  description: 'A dedicated space for the memories and moments that help your story grow.'
};

export default async function MemoryTreePage({searchParams}:{searchParams:{space?:string}}) {
  const scope=await workspaceScope('trees',searchParams.space);
  return <HomeStudio page="memory-tree" tree={<CloudBoundary key={scope?.owner??'guest'} scope={scope}><MemoryTreeWorkspace scope={scope}/></CloudBoundary>} />;
}
