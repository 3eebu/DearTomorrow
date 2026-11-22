import Link from 'next/link';
import Image from 'next/image';
import {requestRecovery,resetPassword,signIn,signInWithProvider,signUp} from '@/lib/accounts/actions';
import {supabaseConfig} from '@/lib/accounts/config';
import {availableSocialProviders} from '@/lib/accounts/social-providers';
import {AccountNotice,AccountShell} from './account-shell';

const forms={
  signup:{label:'Create your account',title:'Some memories deserve a place of their own.',action:signUp,button:'Create account'},
  login:{label:'Sign in',title:'Welcome back.',action:signIn,button:'Sign in'},
  forgot:{label:'Password recovery',title:'Find your way back.',action:requestRecovery,button:'Send recovery link'},
  reset:{label:'Set a new password',title:'A fresh start.',action:resetPassword,button:'Save new password'},
};

export async function AuthPage({mode,message}:{mode:keyof typeof forms;message?:string}) {
  const form=forms[mode];
  const enabled=!!supabaseConfig();
  const providers=mode==='signup'||mode==='login' ? await availableSocialProviders() : [];
  return <AccountShell><div className="dt-auth-layout">
    <div className="dt-auth-intro">
      <svg viewBox="0 0 164 102" width="122" height="76" aria-hidden="true">
        <path d="M12 21 147 15 152 84 17 90Z" fill="#ead9c7" stroke="#a98472"/>
        <path d="m12 21 70 43 65-49m-130 75 47-41m88 35-50-39" fill="none" stroke="#ad8976"/>
        <circle cx="82" cy="64" r="9" fill="#80525a" stroke="#70404a"/>
        <path d="M78 64h8m-4-4v8" stroke="#e5c1a5"/>
      </svg>
      <h1>{form.title}</h1>
      {mode==='signup'&&<p>A private home for letters, photographs, and the moments you keep coming back to.</p>}
    </div>
    <section className="dt-auth-letter" aria-label={form.label}>
      <h2>{form.label}</h2>
      <AccountNotice message={message??(!enabled?'unavailable':undefined)}/>
      {providers.length>0&&<>
        <form action={signInWithProvider} className="dt-social-form" aria-label="Other ways to sign in">
          {providers.includes('google')&&<button type="submit" name="provider" value="google" className="dt-social-google">
            <Image src="/auth/google-g.png" width={18} height={18} alt="" unoptimized/>
            <span>Continue with Google</span>
          </button>}
          {providers.includes('apple')&&<button type="submit" name="provider" value="apple" className="dt-social-apple" aria-label="Continue with Apple">
            <Image src="/auth/apple-continue.png" width={260} height={48} alt="" unoptimized/>
          </button>}
        </form>
        <p className="dt-auth-divider">or continue with email</p>
      </>}
      <form action={form.action} className="dt-account-form">
        {mode==='signup'&&<label>Display name<input name="name" required maxLength={60} autoComplete="nickname"/></label>}
        {mode!=='reset'&&<label>Email address<input name="email" required type="email" maxLength={254} autoComplete="email"/></label>}
        {mode!=='forgot'&&<label>{mode==='reset'?'New password':'Password'}<input name="password" required type="password"
          minLength={mode==='login'?undefined:10} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'}/></label>}
        {(mode==='signup'||mode==='reset')&&<small>Use at least 10 characters.</small>}
        <button className="dt-account-primary" disabled={!enabled}>{form.button} <span aria-hidden="true">↗</span></button>
      </form>
      <div className="dt-account-actions">
        {mode==='login'&&<><Link href="/forgot-password">Forgot password?</Link><Link href="/signup">Create an account</Link></>}
        {mode!=='login'&&<Link href="/login">Back to sign in</Link>}
      </div>
    </section>
  </div></AccountShell>;
}
