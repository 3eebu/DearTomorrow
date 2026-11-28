import type {MemoryBookDocument} from './memory-books';

export type BookShelfEntry = Pick<MemoryBookDocument,
  'id'|'title'|'subtitle'|'createdAt'|'updatedAt'|'archived'|'widthMm'|'heightMm'|'cover'|'bookmaking'> & {
  pageCount:number;
  chapterCount:number;
  document?:MemoryBookDocument;
};

export function bookShelfEntry(document:MemoryBookDocument):BookShelfEntry {
  const {id,title,subtitle,createdAt,updatedAt,archived,widthMm,heightMm,cover,bookmaking,pages,chapters}=document;
  return {id,title,subtitle,createdAt,updatedAt,archived,widthMm,heightMm,cover,bookmaking,
    pageCount:pages.length,chapterCount:chapters.length,document};
}
