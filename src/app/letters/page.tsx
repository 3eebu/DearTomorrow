import type { Metadata } from 'next';
import HomeStudio from '@/components/home-studio';
import LettersWorkspace from '@/components/letters/letters-workspace';
import '../home-studio.css';

export const metadata: Metadata = {
  title: 'Letters — Dear Tomorrow',
  description: 'Write on personalized stationery, seal your letters, and keep them in a browser-local Letter Box.'
};

export default function LettersPage() {
  return <HomeStudio page="letters" letters={<LettersWorkspace />} />;
}
