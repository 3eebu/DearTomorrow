import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Dear Tomorrow — Some words are worth waiting for',description:'An intimate private world for shared letters, memory books and dates. Phase 1 preview.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
