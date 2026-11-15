import type { Metadata } from 'next';
import { BookLibrary } from '@/components/memory-books/book-library';
export const metadata: Metadata = { title: 'Memory Books — Dear Tomorrow', description: 'A local library of books, made by you. Read a keepsake or create in the Book Studio.' };
export default function MemoryBooksPage() { return <BookLibrary/>; }
