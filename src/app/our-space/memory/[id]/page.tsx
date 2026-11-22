import {MemoryPage} from '@/components/accounts/memory-page';
export default async function Page({params}:{params:Promise<{id:string}>}) {
  return <MemoryPage id={(await params).id} ours/>;
}
