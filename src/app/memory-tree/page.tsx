import type { Metadata } from 'next';
import HomeStudio from '@/components/home-studio';
import MemoryTreeWorkspace from '@/components/memory-tree/memory-tree-workspace';
import '../home-studio.css';

export const metadata: Metadata = {
  title: 'Memory Tree — Dear Tomorrow',
  description: 'A dedicated space for the memories and moments that help your story grow.'
};

export default function MemoryTreePage() {
  return <HomeStudio page="memory-tree" tree={<MemoryTreeWorkspace />} />;
}
