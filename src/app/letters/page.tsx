import type { Metadata } from 'next';
import HomeStudio from '@/components/home-studio';
import '../home-studio.css';

export const metadata: Metadata = {
  title: 'Letters — Dear Tomorrow',
  description: 'Write a letter for later or explore letters for the journey.'
};

export default function LettersPage() {
  return <HomeStudio page="letters" />;
}
