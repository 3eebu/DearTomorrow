import type {ReactNode} from 'react';
import {InformationShell} from '@/components/information-shell';
import '../../app/story-pages.css';

const notices: Record<string,string> = {
  unavailable:'Accounts are unavailable on this preview. The site needs its Supabase configuration.',
  details:'Please check the details and try again.',
  try:'This change could not be completed. Try again in a moment.',
  credentials:'Check your email and password. Confirm your email before signing in.',
  rate:'Please wait before trying again.',
  verification:'Check your email for a confirmation link. Once confirmed, you can sign in.',
  recovery:'If an account uses that email, a recovery link will arrive shortly.',
  confirmation:'This link could not be verified. Request a new link if it has expired.',
  changed:'Your password was updated. Sign in with the new password.',
  saved:'Saved.',
  request:'This connection request could not be changed. Review its current status and try again.',
  photo:'Choose a JPEG, PNG, or WebP photo up to 750 KB. Private photo storage must be configured.',
  delete:'Enter your current password and type DELETE to confirm.',
  deletion_pending:'Your account is closed for access. Confirm deletion again to finish private file cleanup.',
};

export function AccountNotice({message}:{message?:string}) {
  const text=message && Object.hasOwn(notices,message)?notices[message]:null;
  return text?<p className="dt-account-notice" role="status">{text}</p>:null;
}

export function AccountShell({children}:{children:ReactNode}) {
  return <InformationShell showPreviewLink={false}><div className="dt-account">{children}</div></InformationShell>;
}
