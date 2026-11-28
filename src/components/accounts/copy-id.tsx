'use client';
import {useState} from 'react';

export function CopyId({code}:{code:string}) {
  const [notice,setNotice]=useState('');
  async function copy() {
    try {await navigator.clipboard.writeText(code);setNotice('ID copied.');}
    catch {setNotice('Select the ID and copy it manually.');}
  }
  return <div className="dt-account-id-card" aria-label="Permanent Dear Tomorrow ID">
    <p className="dt-account-id-label">Your permanent code</p>
    <div className="dt-account-code"><code aria-label={`Dear Tomorrow ID ${code}`}>{code}</code>
      <button className="dt-account-secondary" type="button" onClick={()=>void copy()}>
        {notice==='ID copied.'?'Copied ✓':'Copy ID'}</button></div>
    <p className="dt-account-id-help" role={notice?'status':undefined} aria-live="polite">{notice||'This code is yours to keep. Share it only with the person you want to connect with.'}</p>
  </div>;
}
