'use client';
import {useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {findAccount,manageConnection,sendRequest} from '@/lib/accounts/actions';

export type ConnectionView = {
  partner:{name:string;since:string}|null;
  requestsOpen:boolean;
  requests:{id:string;name:string;incoming:boolean;status:'pending'|'accepted'|'declined'|'canceled'|'expired'}[];
};

export function Portrait({name,photo}:{name:string;photo?:string|null}) {
  return <span className="dt-account-portrait" aria-hidden="true">{photo?
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo} alt=""/>:Array.from(name)[0]?.toLocaleUpperCase()}</span>;
}

export function ConnectionFinder() {
  const [code,setCode]=useState(''),[match,setMatch]=useState<{name:string;match:string}|null>(null);
  const [alert,setAlert]=useState(''),[sent,setSent]=useState('');
  const [pending,setPending]=useState(false);
  const router=useRouter();
  async function find(event:FormEvent) {
    event.preventDefault();setAlert('');setSent('');
    if(pending)return;
    setPending(true);
    try {
      const result=await findAccount(code);
      if(result.error||!result.name||!result.match)setAlert(result.error||'No available account matched that ID.');
      else {setMatch({name:result.name,match:result.match});requestAnimationFrame(()=>document.getElementById('dt-match')?.focus());}
    } catch {setAlert('The connection could not be checked. Try again.');}
    finally {setPending(false);}
  }
  async function send() {
    if(!match||pending)return;
    setAlert('');setPending(true);
    try {
      const result=await sendRequest(match.match);
      if(result.error||!result.ok)setAlert(result.error||'The request could not be sent.');
      else {setSent(`Your request to ${match.name} is pending.`);setCode('');setMatch(null);router.refresh();}
    } catch {setAlert('The request could not be confirmed. Check your pending requests before trying again.');}
    finally {setPending(false);}
  }
  return <section aria-label="Find someone by ID">
    {alert&&<p className="dt-account-notice" role="alert">{alert}</p>}
    {sent&&<p className="dt-account-notice" role="status">{sent}</p>}
    {pending&&<p className="dt-account-notice" role="status" aria-live="polite">{match?'Sending your invitation…':'Looking for that account…'}</p>}
    {match?<div className="dt-account-card dt-account-match">
      <Portrait name={match.name}/><h2 id="dt-match" tabIndex={-1}>{match.name}</h2>
      <p>Is this the person you&apos;re looking for?</p>
      <div className="dt-account-actions">
        <button className="dt-account-primary" disabled={pending} onClick={send}>Send connection request</button>
        <button className="dt-account-secondary" disabled={pending} onClick={()=>{setMatch(null);setAlert('');requestAnimationFrame(()=>document.getElementById('dt-find-id')?.focus());}}>Go back</button>
      </div>
    </div>:<form className="dt-account-form dt-connect-form" onSubmit={find}>
      <label>Dear Tomorrow ID<input id="dt-find-id" value={code} onChange={event=>setCode(event.target.value)} maxLength={80}
        placeholder="7F8E6H3A-G9264BCH-53DE8F7A" autoComplete="off" autoCapitalize="characters" spellCheck={false} required/></label>
      <button className="dt-account-primary" disabled={pending}>{pending?'Looking…':'Find account'}</button>
    </form>}
  </section>;
}

export function ConnectionDetails({view,path}:{view:ConnectionView;path:'settings'|'connect'}) {
  const requests=view.requests;
  return <section className="dt-account-section">
    <h2>Your connection</h2>
    {view.partner?<><p>Connected with <strong>{view.partner.name}</strong>.</p>
      <div className="dt-account-actions"><Link href="/our-space">Open Our Space</Link></div>
      <details className="dt-account-danger">
        <summary>Disconnect from {view.partner.name}</summary>
        <p>Sharing ends for this connection. Each person keeps the memories they own. Copies they already exported or saved will still be available to them.</p>
        <form action={manageConnection} className="dt-account-actions">
          <input type="hidden" name="operation" value="disconnect"/><input type="hidden" name="path" value={path}/>
          <button className="dt-account-secondary">Confirm disconnect</button>
        </form>
      </details></>:<p>{requests.some(request=>request.status==='pending')?'A request is waiting for a decision.':'You can connect with one person when you’re ready.'}</p>}
    {requests.length>0&&<ul className="dt-account-list dt-connection-list">{requests.map(request=><li key={request.id} data-status={request.status}>
      <div><strong>{request.name}</strong><small>{request.status==='pending'?(request.incoming?'They reached out to you':'Your invitation is on its way'):request.status==='accepted'?'This invitation was accepted':request.status==='declined'?'This invitation was declined':request.status==='canceled'?'This invitation was canceled':'This invitation has expired'}</small></div>
      {request.status==='pending'&&<form action={manageConnection} className="dt-account-actions">
        <input type="hidden" name="reference" value={request.id}/><input type="hidden" name="path" value={path}/>
        {request.incoming?<><button className="dt-account-primary" name="operation" value="accept">Accept</button>
          <button className="dt-account-secondary" name="operation" value="decline">Decline</button></>:
          <button className="dt-account-secondary" name="operation" value="cancel">Cancel request</button>}
      </form>}
    </li>)}</ul>}
    <form className="dt-account-actions" action={manageConnection}>
      <input type="hidden" name="path" value={path}/>
      <button className="dt-account-link" name="operation" value={view.requestsOpen?'close_requests':'open_requests'}>
        {view.requestsOpen?'Pause new requests':'Allow new requests'}</button>
    </form>
  </section>;
}
