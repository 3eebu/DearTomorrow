import { notFound } from 'next/navigation';
import { LandscapeStudy } from './study';

export default function ExperimentPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <LandscapeStudy/>;
}
