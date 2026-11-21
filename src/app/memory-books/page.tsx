import type { Metadata } from 'next';
import { BookLibrary } from '@/components/memory-books/book-library';
import {workspaceScope} from '@/lib/accounts/server';
import {CloudBoundary} from '@/components/accounts/cloud-boundary';
export const metadata: Metadata = { title: 'Memory Books — Dear Tomorrow', description: 'A local library of books, made by you. Read a keepsake or create in the Book Studio.' };
export default async function MemoryBooksPage({searchParams}:{searchParams:{space?:string}}) {
  const scope=await workspaceScope('books',searchParams.space);
  return <CloudBoundary key={scope?.owner??'guest'} scope={scope}><BookLibrary scope={scope}/></CloudBoundary>;
}
