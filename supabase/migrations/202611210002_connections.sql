create table public.dt_requests (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references public.dt_profiles(id) on delete cascade,
  recipient uuid not null references public.dt_profiles(id) on delete cascade,
  state text not null default 'pending' check (state in ('pending','accepted','declined','canceled','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '7 days',
  check (sender<>recipient)
);
create unique index dt_one_pending_pair on public.dt_requests(least(sender,recipient),greatest(sender,recipient)) where state='pending';
create index dt_request_recipient on public.dt_requests(recipient,created_at desc);
create index dt_request_sender on public.dt_requests(sender,created_at desc);
create table public.dt_connections (
  id uuid primary key default gen_random_uuid(),
  accepted_at timestamptz not null default now(),
  ended_at timestamptz
);
create table public.dt_members (
  user_id uuid primary key references public.dt_profiles(id) on delete cascade,
  connection_id uuid not null references public.dt_connections(id) on delete cascade
);
create index dt_members_connection on public.dt_members(connection_id);
create table dt_private.rate_limits (
  actor uuid references public.dt_profiles(id) on delete cascade,
  purpose text,
  started_at timestamptz not null,
  hits int not null,
  primary key(actor,purpose)
);
create table dt_private.matches (
  id uuid primary key default gen_random_uuid(),
  actor uuid not null references public.dt_profiles(id) on delete cascade,
  target uuid not null references public.dt_profiles(id) on delete cascade,
  until_at timestamptz not null default now()+interval '10 minutes'
);
create index dt_match_actor on dt_private.matches(actor,until_at);

alter table public.dt_requests enable row level security;
alter table public.dt_connections enable row level security;
alter table public.dt_members enable row level security;
alter table dt_private.rate_limits enable row level security;
alter table dt_private.matches enable row level security;
revoke all on public.dt_requests,public.dt_connections,public.dt_members from public,anon,authenticated;

create function dt_private.rate(actor_id uuid, purpose_name text, ceiling int, window_size interval) returns boolean
language plpgsql security definer set search_path='' as $$
declare total int;
begin
  insert into dt_private.rate_limits as r(actor,purpose,started_at,hits) values(actor_id,purpose_name,now(),1)
  on conflict (actor,purpose) do update
  set started_at=case when r.started_at+window_size<=now() then now() else r.started_at end,
      hits=case when r.started_at+window_size<=now() then 1 else least(r.hits+1,ceiling+1) end
  returning hits into total;
  return total<=ceiling;
end $$;
revoke all on function dt_private.rate(uuid,text,int,interval) from public;

create function public.dt_find_account(code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  viewer uuid := dt_private.verified();
  candidate public.dt_profiles%rowtype;
  ticket uuid;
begin
  if not dt_private.rate(viewer,'lookup',12,interval '10 minutes') then
    return jsonb_build_object('error','Please wait before looking up another ID.');
  end if;
  if code is null or code !~ '^[2-9A-H]{8}-[2-9A-H]{8}-[2-9A-H]{8}$' then
    return jsonb_build_object('error','Enter a valid Dear Tomorrow ID.');
  end if;
  select p.* into candidate from public.dt_profiles p join auth.users u on u.id=p.id
  where p.dear_id=code and p.id<>viewer and u.email_confirmed_at is not null
    and p.deleting_at is null and p.requests_open
    and not exists(select from public.dt_members where user_id in (p.id,viewer));
  if not found then return jsonb_build_object('error','No available account matched that ID.'); end if;
  delete from dt_private.matches where matches.actor=viewer and until_at<=now();
  insert into dt_private.matches(actor,target) values(viewer,candidate.id) returning id into ticket;
  return jsonb_build_object('name',candidate.display_name,'match',ticket);
end $$;

create function dt_private.end_connection(person uuid) returns void
language plpgsql security definer set search_path='' as $$
declare paired uuid;
begin
  select connection_id into paired from public.dt_members where user_id=person;
  if paired is not null then
    update public.dt_connections set ended_at=now() where id=paired;
    delete from public.dt_members where connection_id=paired;
  end if;
end $$;
revoke all on function dt_private.end_connection(uuid) from public;

create function public.dt_connection_action(operation text, reference uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  actor_id uuid := dt_private.verified();
  recipient_id uuid;
  request_row public.dt_requests%rowtype;
  pair_id uuid;
begin
  -- Serializes state transitions across both sides before checking membership.
  perform pg_advisory_xact_lock(213829,41);
  perform dt_private.verified();
  if operation='disconnect' then
    perform dt_private.end_connection(actor_id);
    return jsonb_build_object('ok',true);
  elsif operation in ('close_requests','open_requests') then
    update public.dt_profiles set requests_open=(operation='open_requests') where id=actor_id;
    return jsonb_build_object('ok',true);
  elsif operation='send' then
    if not dt_private.rate(actor_id,'request',5,interval '24 hours') then
      return jsonb_build_object('error','You can send another request tomorrow.');
    end if;
    select m.target into recipient_id from dt_private.matches m where m.id=reference and m.actor=actor_id and m.until_at>now();
    if recipient_id is null or recipient_id=actor_id or not exists (
      select from public.dt_profiles p join auth.users u on p.id=u.id where p.id=recipient_id
        and p.requests_open and p.deleting_at is null and u.email_confirmed_at is not null
    ) or exists(select from public.dt_members where user_id in (actor_id,recipient_id)) then
      return jsonb_build_object('error','This account is unavailable for a request.');
    end if;
    update public.dt_requests set state='expired' where state='pending' and expires_at<=now()
      and least(sender,recipient)=least(actor_id,recipient_id) and greatest(sender,recipient)=greatest(actor_id,recipient_id);
    if exists (select from public.dt_requests where state='declined' and sender=actor_id
      and recipient=recipient_id and created_at>now()-interval '7 days') then
      return jsonb_build_object('error','This account is unavailable for a request.');
    end if;
    if exists (select from public.dt_requests where state='pending' and sender=recipient_id and recipient=actor_id) then
      return jsonb_build_object('error','This person already sent you a request. You can respond to it below.');
    end if;
    insert into public.dt_requests(sender,recipient) values(actor_id,recipient_id) on conflict do nothing;
    delete from dt_private.matches where id=reference and actor=actor_id;
    return jsonb_build_object('ok',true);
  end if;

  select * into request_row from public.dt_requests where id=reference
    and ((operation='cancel' and sender=actor_id) or (operation in ('accept','decline') and recipient=actor_id));
  if not found or request_row.state<>'pending' then
    return jsonb_build_object('error','This request is no longer pending.');
  end if;
  if request_row.expires_at<=now() then
    update public.dt_requests set state='expired' where id=request_row.id;
    return jsonb_build_object('error','This request has expired.');
  end if;
  if operation='cancel' or operation='decline' then
    update public.dt_requests set state=case when operation='cancel' then 'canceled' else 'declined' end where id=request_row.id;
    return jsonb_build_object('ok',true);
  end if;
  if exists (select from public.dt_members where user_id in (request_row.sender,actor_id))
    or not exists (select from public.dt_profiles where id=request_row.sender and deleting_at is null) then
    return jsonb_build_object('error','One of these accounts is unavailable for a connection.');
  end if;
  insert into public.dt_connections default values returning id into pair_id;
  insert into public.dt_members(user_id,connection_id) values(actor_id,pair_id),(request_row.sender,pair_id);
  update public.dt_requests set state='accepted' where id=request_row.id;
  update public.dt_requests set state='canceled' where state='pending'
    and (sender in (request_row.sender,actor_id) or recipient in (request_row.sender,actor_id));
  return jsonb_build_object('ok',true,'paired',true);
end $$;

create function public.dt_connection_view() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor_id uuid := dt_private.verified();
begin
  return jsonb_build_object(
    'partner', (select jsonb_build_object('name',p.display_name,'since',c.accepted_at)
      from public.dt_members a join public.dt_members b on a.connection_id=b.connection_id
      join public.dt_connections c on c.id=a.connection_id join public.dt_profiles p on p.id=b.user_id
      where a.user_id=actor_id and b.user_id<>actor_id and c.ended_at is null and p.deleting_at is null),
    'requestsOpen',(select requests_open from public.dt_profiles where id=actor_id),
    'requests',coalesce((select jsonb_agg(d.item) from (
      select jsonb_build_object('id',r.id,'name',p.display_name,'incoming',r.recipient=actor_id,
        'status',case when r.expires_at<=now() and r.state='pending' then 'expired' else r.state end) item
      from public.dt_requests r join public.dt_profiles p on p.id=case when r.sender=actor_id then r.recipient else r.sender end
      where actor_id in (r.sender,r.recipient) order by r.created_at desc limit 24
    ) d),'[]'::jsonb)
  );
end $$;

revoke all on function public.dt_find_account(text),public.dt_connection_action(text,uuid),public.dt_connection_view() from public,anon;
grant execute on function public.dt_find_account(text),public.dt_connection_action(text,uuid),public.dt_connection_view() to authenticated;
