import Link from 'next/link';
import {spaces} from '@/lib/accounts/identity';
import type {LibraryItem} from '@/lib/accounts/documents';

export function SpaceItems({items,ours=false}:{items:LibraryItem[];ours?:boolean}) {
  return <ul className="dt-account-list">{items.map(item=><li key={item.id}>
    <div><strong>{item.title}</strong>
      <small>{spaces[item.kind].name}{ours?` · From ${item.ownerName}`:item.draft?' · Draft':''}{!ours&&item.shared?' · Shared':''}</small>
    </div>
    <Link href={`/${ours?'our-space':'my-space'}/memory/${item.id}`}>Open <span className="dt-account-sr">{item.title}</span> ↗</Link>
  </li>)}</ul>;
}
