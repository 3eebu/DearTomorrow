import {NextResponse} from 'next/server';
import {account} from '@/lib/accounts/server';
export const dynamic='force-dynamic';

export async function GET() {
  const session=await account();
  const headers={'Cache-Control':'private, no-store'};
  if(!session)return NextResponse.json({id:null},{headers});
  const {data}=await session.client.from('dt_profiles').select('display_name,deleting_at').eq('id',session.user.id).maybeSingle();
  if(!data)return NextResponse.json({error:'Profile unavailable.'},{status:503,headers});
  const connection=data.deleting_at?null:(await session.client.rpc('dt_connection_view')).data;
  return NextResponse.json({id:session.user.id,name:data.display_name,paired:!!connection?.partner,deleting:!!data.deleting_at},{headers});
}
