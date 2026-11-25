import type { Metadata } from 'next';
import './globals.css';
import './accounts.css';
import './stationery.css';
import {AccountNav} from '@/components/accounts/account-nav';
import {supabaseConfig} from '@/lib/accounts/config';
export const metadata:Metadata={title:'Dear Tomorrow — Some words are worth waiting for',description:'An intimate private world for shared letters, memory books and dates. Phase 1 preview.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><AccountNav enabled={!!supabaseConfig()}/>{children}</body></html>}
