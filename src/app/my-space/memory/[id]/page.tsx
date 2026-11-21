import {MemoryPage} from '@/components/accounts/memory-page';
export default function Page({params,searchParams}:{params:{id:string};searchParams:{message?:string}}) {
  return <MemoryPage id={params.id} message={searchParams.message} ours={false}/>;
}
