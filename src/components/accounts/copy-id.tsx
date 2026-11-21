'use client';
import {useState} from 'react';

export function CopyId({code}:{code:string}) {
  const [notice,setNotice]=useState('');
  async function copy() {
    try {await navigator.clipboard.writeText(code);setNotice('ID copied.');}
    catch {setNotice('Select the ID and copy it manually.');}
  }
  return <><div className="dt-account-code"><code>{code}</code>
    <button className="dt-account-secondary" onClick={()=>void copy()}>Copy ID</button></div>
    {notice&&<p role="status">{notice}</p>}</>;
}
