import {MemoryPage} from '@/components/accounts/memory-page';
export default function Page({params}:{params:{id:string}}) {
  return <MemoryPage id={params.id} ours/>;
}
