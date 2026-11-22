import {MemoryPage} from '@/components/accounts/memory-page';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{message?:string}>}) {
  return <MemoryPage id={(await params).id} message={(await searchParams).message} ours={false}/>;
}
