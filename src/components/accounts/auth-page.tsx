import Link from 'next/link';
import Image from 'next/image';
import {requestRecovery,resetPassword,signIn,signInWithProvider,signUp} from '@/lib/accounts/actions';
import {supabaseConfig} from '@/lib/accounts/config';
import {availableSocialProviders} from '@/lib/accounts/social-providers';
import {AccountNotice,AccountShell} from './account-shell';
import {SignupForm} from './signup-form';

const forms={
  signup:{title:'Create your account',description:'Some memories deserve a place of their own.'},
  login:{title:'Welcome back.',description:null,action:signIn,button:'Sign in'},
  forgot:{title:'Find your way back.',description:'We’ll send you a link to reset your password.',action:requestRecovery,button:'Send recovery link'},
  reset:{title:'Set a new password',description:null,action:resetPassword,button:'Save new password'},
};

export async function AuthPage({mode,message}:{mode:keyof typeof forms;message?:string}) {
  const form=forms[mode];
  const enabled=!!supabaseConfig();
  const providers=mode==='signup'||mode==='login' ? await availableSocialProviders() : [];
  const hasPasswordRequirements=mode==='signup'||mode==='reset';
  const fields=<>
    {mode==='signup'&&<label>Display name<input name="name" required maxLength={60} autoComplete="nickname"/></label>}
    {mode!=='reset'&&<label>Email address<input name="email" required type="email" maxLength={254} autoComplete="email"/></label>}
    {mode!=='forgot'&&<label>{mode==='reset'?'New password':'Password'}<input name="password" required type="password"
      minLength={mode==='login'?undefined:10} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'}
      aria-describedby={hasPasswordRequirements?'auth-password-help':undefined}/></label>}
    {hasPasswordRequirements&&<small id="auth-password-help">Use at least 10 characters.</small>}
    {mode==='login'&&<Link className="dt-auth-recovery" href="/forgot-password">Forgot password?</Link>}
  </>;
  return <AccountShell authentication>
    <section className="dt-auth-letter dt-stationery dt-stationery-surface" aria-labelledby="auth-title">
      <div className="dt-auth-heading">
        <h1 id="auth-title">{form.title}</h1>
        {form.description&&<p>{form.description}</p>}
      </div>
      <AccountNotice message={message??(!enabled?'unavailable':undefined)}/>
      {mode==='signup'&&<p className="dt-signup-information">Before you register, read our <Link href="/privacy">privacy information</Link> and <Link href="/terms">service information</Link>.</p>}
      {mode==='signup'?<SignupForm action={signUp} enabled={enabled}>{fields}</SignupForm>:<form action={forms[mode].action} className="dt-account-form">
        {fields}
        <button className="dt-tactile-primary" type="submit" disabled={!enabled}>{forms[mode].button} <span aria-hidden="true">↗</span></button>
      </form>}
      {providers.length>0&&<>
        <p className="dt-auth-divider">or continue with</p>
        <form action={signInWithProvider} className="dt-social-form" aria-label="Other ways to sign in">
          {providers.includes('google')&&<button type="submit" name="provider" value="google" className="dt-social-google">
            <Image src="/auth/google-g.png" width={18} height={18} alt="" unoptimized/>
            <span>Continue with Google</span>
          </button>}
          {providers.includes('apple')&&<button type="submit" name="provider" value="apple" className="dt-social-apple" aria-label="Continue with Apple">
            <Image src="/auth/apple-continue.png" width={260} height={48} alt="" unoptimized/>
          </button>}
        </form>
      </>}
      <p className="dt-auth-switch">
        {mode==='login'&&<Link href="/signup">Create an account</Link>}
        {mode==='signup'&&<>Already have an account? <Link href="/login">Sign in</Link></>}
        {(mode==='forgot'||mode==='reset')&&<Link href="/login">Back to sign in</Link>}
      </p>
    </section>
  </AccountShell>;
}
