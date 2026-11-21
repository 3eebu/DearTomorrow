create table public.dt_workspaces (
  owner_id uuid not null references public.dt_profiles(id) on delete cascade,
  kind text not null check(kind in ('letters','books','trees','journeys')),
  revision int not null default 0,
  metadata jsonb not null default '{}',
  primary key(owner_id,kind)
);
create table public.dt_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.dt_profiles(id) on delete cascade,
  kind text not null check(kind in ('letters','books','trees','journeys')),
  source_id text not null check(source_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  title text not null check(char_length(title) between 1 and 160),
  draft boolean not null default false,
  summary jsonb not null default '{}',
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  unique(owner_id,kind,source_id)
);
create table public.dt_shares (
  document_id uuid primary key references public.dt_documents(id) on delete cascade,
  connection_id uuid not null references public.dt_connections(id) on delete cascade,
  granted_at timestamptz not null default now()
);
create table public.dt_imports (
  owner_id uuid not null references public.dt_profiles(id) on delete cascade,
  kind text not null check(kind in ('letters','books','trees','journeys')),
  fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
  source_id text not null,
  imported_at timestamptz not null default now(),
  primary key(owner_id,kind,fingerprint)
);
alter table public.dt_workspaces enable row level security;
alter table public.dt_documents enable row level security;
alter table public.dt_shares enable row level security;
alter table public.dt_imports enable row level security;
revoke all on public.dt_workspaces,public.dt_documents,public.dt_shares,public.dt_imports from public,anon,authenticated;

create function dt_private.owns(person uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select person=auth.uid() and exists(select from public.dt_profiles p join auth.users u on u.id=p.id
    where p.id=person and p.deleting_at is null and u.email_confirmed_at is not null)
$$;
revoke all on function dt_private.owns(uuid) from public;
grant execute on function dt_private.owns(uuid) to authenticated;
grant select on public.dt_workspaces,public.dt_documents,public.dt_imports to authenticated;
create policy own_workspace on public.dt_workspaces for select to authenticated using(dt_private.owns(owner_id));
create policy own_document on public.dt_documents for select to authenticated using(dt_private.owns(owner_id));
create policy own_import on public.dt_imports for select to authenticated using(dt_private.owns(owner_id));

-- The file proxy reads only a server-authorized projection and never returns signed or public URLs.
-- Authenticated and anonymous roles have no allow policy for this bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('dear-tomorrow-private','dear-tomorrow-private',false,6000000,
  array['image/jpeg','image/png','image/webp','audio/wav','audio/mpeg','audio/ogg','audio/webm','audio/mp4']);
create policy dt_private_media_boundary on storage.objects as restrictive for all to anon,authenticated
using (bucket_id <> 'dear-tomorrow-private') with check (bucket_id <> 'dear-tomorrow-private');

create function public.dt_scope(kind_name text, include_content boolean default false, entry_id text default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid := dt_private.verified();
begin
  return jsonb_build_object(
    'revision',coalesce((select w.revision from public.dt_workspaces w where w.owner_id=actor and w.kind=kind_name),0),
    'metadata',coalesce((select w.metadata from public.dt_workspaces w where w.owner_id=actor and w.kind=kind_name),'{}'::jsonb),
    'documents',coalesce((select jsonb_agg(jsonb_build_object('id',d.source_id,'docId',d.id,'summary',d.summary,
      'payload',case when include_content then d.payload else null end) order by d.updated_at desc,d.id)
      from public.dt_documents d where d.owner_id=actor and d.kind=kind_name and (entry_id is null or d.source_id=entry_id)),'[]'::jsonb)
  );
end $$;

create function public.dt_commit_scope(kind_name text, expected int, changes jsonb, removals jsonb, meta jsonb, receipt text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid := dt_private.verified();
  current_revision int;
  item jsonb;
begin
  if kind_name not in ('letters','books','trees','journeys') or expected<0 or
    jsonb_typeof(changes) is distinct from 'array' or jsonb_array_length(changes)>100 or
    jsonb_typeof(removals) is distinct from 'array' or jsonb_array_length(removals)>100 or
    jsonb_typeof(meta) is distinct from 'object' or octet_length(meta::text)>500000 or
    octet_length(changes::text)>15000000 or (receipt is not null and receipt !~ '^[a-f0-9]{64}$')
  then raise exception 'Invalid workspace data.' using errcode='22023'; end if;
  -- Serialize cloud commits and deletion for this owner. The revision check precedes content or receipt changes.
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  perform dt_private.verified();
  if receipt is not null and exists(select from public.dt_imports i
    where i.owner_id=actor and i.kind=kind_name and i.fingerprint=receipt) then
    return (select jsonb_build_object('imported',false,'sourceId',i.source_id) from public.dt_imports i
      where i.owner_id=actor and i.kind=kind_name and i.fingerprint=receipt);
  end if;
  insert into public.dt_workspaces(owner_id,kind) values(actor,kind_name) on conflict do nothing;
  select w.revision into current_revision from public.dt_workspaces w where w.owner_id=actor and w.kind=kind_name for update;
  if expected is distinct from current_revision then raise exception 'Another tab saved a newer version.' using errcode='40001'; end if;
  if receipt is not null and (jsonb_array_length(removals)>0 or jsonb_array_length(changes)<>1) then
    raise exception 'An import must add exactly one document.'; end if;
  delete from public.dt_documents d where d.owner_id=actor and d.kind=kind_name and removals ? d.source_id;
  for item in select value from jsonb_array_elements(changes) loop
    if jsonb_typeof(item->'payload') is distinct from 'object' or item->'payload'->>'id' is distinct from item->>'id'
      or jsonb_typeof(item->'summary') is distinct from 'object' or octet_length((item->'summary')::text)>25000
    then raise exception 'Invalid document payload.' using errcode='22023'; end if;
    if receipt is not null and exists(select from public.dt_documents d
      where d.owner_id=actor and d.kind=kind_name and d.source_id=item->>'id') then
      raise exception 'Keep the existing cloud copy and retry the import.' using errcode='40001';
    end if;
    insert into public.dt_documents(owner_id,kind,source_id,title,draft,summary,payload)
    values(actor,kind_name,item->>'id',item->>'title',coalesce((item->>'draft')::boolean,false),item->'summary',item->'payload')
    on conflict(owner_id,kind,source_id) do update set title=excluded.title,draft=excluded.draft,
      summary=excluded.summary,payload=excluded.payload,updated_at=now();
  end loop;
  if (select count(*) from public.dt_documents d where d.owner_id=actor and d.kind=kind_name)>100 then
    raise exception 'This library has reached its document limit.';
  end if;
  if receipt is not null then insert into public.dt_imports(owner_id,kind,fingerprint,source_id)
    values(actor,kind_name,receipt,changes->0->>'id'); end if;
  update public.dt_workspaces w set revision=current_revision+1,metadata=meta where w.owner_id=actor and w.kind=kind_name;
  return jsonb_build_object('revision',current_revision+1,'imported',receipt is not null,'sourceId',changes->0->>'id');
end $$;

create function dt_private.can_view_shared(actor uuid, document uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select from public.dt_shares s join public.dt_documents d on d.id=s.document_id
    join public.dt_connections c on c.id=s.connection_id
    join public.dt_members me on me.connection_id=c.id and me.user_id=actor
    join public.dt_members owner on owner.connection_id=c.id and owner.user_id=d.owner_id
    join public.dt_profiles p on p.id=owner.user_id
    where s.document_id=document and c.ended_at is null and p.deleting_at is null)
$$;
revoke all on function dt_private.can_view_shared(uuid,uuid) from public;

create function public.dt_share(document uuid, allow_share boolean) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid := dt_private.verified(); paired uuid;
begin
  perform pg_advisory_xact_lock(213829,41);
  perform dt_private.verified();
  if not exists(select from public.dt_documents where id=document and owner_id=actor) then
    raise exception 'Document unavailable.' using errcode='42501';
  end if;
  if not allow_share then delete from public.dt_shares where document_id=document; return; end if;
  select m.connection_id into paired from public.dt_members m where m.user_id=actor;
  if paired is null then raise exception 'Connect with someone before sharing.' using errcode='42501'; end if;
  insert into public.dt_shares(document_id,connection_id) values(document,paired)
  on conflict(document_id) do update set connection_id=excluded.connection_id,granted_at=now();
end $$;

create function public.dt_library(include_shared boolean default false) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid := dt_private.verified();
begin
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id',d.id,'sourceId',d.source_id,'kind',d.kind,'title',d.title,'owned',d.owner_id=actor,
    'ownerName',p.display_name,'updated',d.updated_at,'draft',d.draft,
    'shared',dt_private.can_view_shared(actor,d.id)) order by d.updated_at desc)
    from public.dt_documents d join public.dt_profiles p on p.id=d.owner_id
    where (not include_shared and d.owner_id=actor) or (include_shared and dt_private.can_view_shared(actor,d.id))),'[]'::jsonb);
end $$;

create function dt_private.ready_letter(letter jsonb, opening numeric, clock_ms numeric) returns boolean
language sql immutable set search_path='' as $$
  select coalesce(letter->>'state' in ('sealed','scheduled','opened') and opening is not null and clock_ms>=opening,false)
$$;
revoke all on function dt_private.ready_letter(jsonb,numeric,numeric) from public;

create function public.dt_read_document(document uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  actor uuid := dt_private.verified();
  doc public.dt_documents%rowtype;
  content jsonb;
  hidden boolean := false;
  opens numeric;
  clock_ms numeric := extract(epoch from now())*1000;
  departure numeric;
  arrival numeric;
  step jsonb;
  position int;
  moments numeric[];
  available jsonb := '[]';
  gates jsonb := '[]';
begin
  select d.* into doc from public.dt_documents d where d.id=document
    and (d.owner_id=actor or dt_private.can_view_shared(actor,d.id));
  if not found then return null; end if;
  content := doc.payload;
  if doc.owner_id<>actor and doc.kind='letters' then
    opens := case when doc.payload->>'kind'='tomorrow' then
      (doc.payload->'release'->>'instant')::numeric else 0 end;
    hidden := not dt_private.ready_letter(content,opens,clock_ms);
    if hidden then content:=null; end if;
  elsif doc.owner_id<>actor and doc.kind='journeys' then
    departure := (content->'departure'->>'instant')::numeric;
    arrival := (content->'arrival'->>'instant')::numeric;
    moments := array[departure-3600000,departure,round(departure+(arrival-departure)*.2),
      round(departure+(arrival-departure)*.5),round(departure+(arrival-departure)*.85),arrival];
    for step,position in select value,ordinality::int from jsonb_array_elements(content->'checkpoints') with ordinality loop
      opens:=coalesce((step->'custom'->>'instant')::numeric,moments[position]);
      if dt_private.ready_letter(step->'letter',opens,clock_ms) then
        available:=available||jsonb_build_array(step);
      else
        available:=available||jsonb_build_array(jsonb_set(step,'{letter}','null'));
      end if;
      gates:=gates||jsonb_build_array(jsonb_build_object('position',position,'instant',opens,
        'sealed',coalesce(step->'letter'->>'state' in ('sealed','scheduled','opened'),false)));
    end loop;
    content:=jsonb_set(content,'{checkpoints}',available);
    opens:=null;
  end if;
  return jsonb_build_object('id',doc.id,'ownerId',doc.owner_id,'kind',doc.kind,'sourceId',doc.source_id,
    'title',doc.title,'owned',doc.owner_id=actor,'shared',dt_private.can_view_shared(actor,doc.id),
    'payload',content,'locked',hidden,'opens',opens,'gates',gates);
end $$;

create function public.dt_begin_delete(actor uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if actor is null or not exists(select from auth.users where id=actor and email_confirmed_at is not null)
    then raise exception 'Sign in first.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(213829,41);
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  update public.dt_profiles set deleting_at=coalesce(deleting_at,now()),requests_open=false where id=actor;
  perform dt_private.end_connection(actor);
  update public.dt_requests set state='canceled' where state='pending' and actor in (sender,recipient);
end $$;

create function public.dt_profile_avatar(asset text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid := dt_private.verified();
begin
  if asset is not null and (asset !~ '^[a-f0-9-]{36}/avatar/[a-f0-9]{64}$' or split_part(asset,'/',1)<>actor::text) then
    raise exception 'Invalid profile photograph.' using errcode='22023';
  end if;
  update public.dt_profiles set avatar=asset where id=actor;
end $$;

revoke all on function public.dt_scope(text,boolean,text),public.dt_commit_scope(text,int,jsonb,jsonb,jsonb,text),
  public.dt_share(uuid,boolean),public.dt_library(boolean),public.dt_read_document(uuid),public.dt_profile_avatar(text) from public,anon;
grant execute on function public.dt_scope(text,boolean,text),public.dt_commit_scope(text,int,jsonb,jsonb,jsonb,text),
  public.dt_share(uuid,boolean),public.dt_library(boolean),public.dt_read_document(uuid),public.dt_profile_avatar(text) to authenticated;
revoke all on function public.dt_begin_delete(uuid) from public,anon,authenticated;
grant execute on function public.dt_begin_delete(uuid) to service_role;
