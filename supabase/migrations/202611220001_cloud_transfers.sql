-- Temporary, private transport for requests larger than a function's body limit.
create unlogged table dt_private.cloud_chunks (
  owner_id uuid not null references public.dt_profiles(id) on delete cascade,
  transfer_id uuid not null,
  part integer not null check (part between 0 and 21),
  content text not null check (octet_length(content) between 4 and 3333336),
  expires_at timestamptz not null,
  primary key(owner_id, transfer_id, part)
);
create index dt_cloud_chunks_expiry on dt_private.cloud_chunks(expires_at);
revoke all on dt_private.cloud_chunks from public, anon, authenticated;

create function public.dt_stage_cloud_chunk(actor uuid, transfer uuid, ordinal integer, encoded text)
returns void language plpgsql security definer set search_path='' as $$
declare deadline timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 88470));
  if not exists(select 1 from public.dt_profiles where id=actor and deleting_at is null) then
    raise exception 'Account unavailable' using errcode='42501';
  end if;
  delete from dt_private.cloud_chunks where expires_at<=now();
  select min(expires_at) into deadline from dt_private.cloud_chunks
    where owner_id=actor and transfer_id=transfer;
  if deadline is null then
    if (select count(distinct transfer_id) from dt_private.cloud_chunks where owner_id=actor) >= 2 then
      raise exception 'Too many pending transfers' using errcode='54000';
    end if;
    deadline := now()+interval '30 minutes';
  end if;
  insert into dt_private.cloud_chunks(owner_id,transfer_id,part,content,expires_at)
    values(actor,transfer,ordinal,encoded,deadline)
    on conflict(owner_id,transfer_id,part) do nothing;
  if not found and not exists(select 1 from dt_private.cloud_chunks
      where owner_id=actor and transfer_id=transfer and part=ordinal and content=encoded) then
    raise exception 'Chunk differs from the original' using errcode='22023';
  end if;
end $$;

create function public.dt_read_cloud_chunk(actor uuid, transfer uuid, ordinal integer, parts integer)
returns text language sql stable security definer set search_path='' as $$
  select c.content from dt_private.cloud_chunks c
  where c.owner_id=actor and c.transfer_id=transfer and c.part=ordinal and c.expires_at>now()
    and parts between 2 and 22 and ordinal between 0 and parts-1
    and exists(select 1 from dt_private.cloud_chunks
      where owner_id=actor and transfer_id=transfer and expires_at>now()
      having count(*)=parts and min(part)=0 and max(part)=parts-1)
$$;

create function public.dt_drop_cloud_transfer(actor uuid, transfer uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 88470));
  delete from dt_private.cloud_chunks where owner_id=actor and transfer_id=transfer;
end
$$;

revoke all on function public.dt_stage_cloud_chunk(uuid,uuid,integer,text),
  public.dt_read_cloud_chunk(uuid,uuid,integer,integer), public.dt_drop_cloud_transfer(uuid,uuid) from public, anon, authenticated;
grant execute on function public.dt_stage_cloud_chunk(uuid,uuid,integer,text),
  public.dt_read_cloud_chunk(uuid,uuid,integer,integer), public.dt_drop_cloud_transfer(uuid,uuid) to service_role;
