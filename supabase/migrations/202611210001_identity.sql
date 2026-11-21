create schema if not exists dt_private;
revoke all on schema dt_private from public;

create table public.dt_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  dear_id text not null unique check (dear_id ~ '^[2-9A-H]{8}-[2-9A-H]{8}-[2-9A-H]{8}$'),
  onboarded boolean not null default false,
  requests_open boolean not null default true,
  avatar text,
  deleting_at timestamptz
);
alter table public.dt_profiles enable row level security;
revoke all on public.dt_profiles from public, anon, authenticated;
grant select on public.dt_profiles to authenticated;
create policy profile_owner on public.dt_profiles for select to authenticated using (id = (select auth.uid()));

create function dt_private.insert_profile(user_id uuid, metadata jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  name text := left(btrim(coalesce(metadata->>'display_name','')),60);
  raw text;
begin
  if name = '' or name ~ '[[:cntrl:]]' then name := 'Dear Tomorrow reader'; end if;
  for attempt in 1..8 loop
    -- Two independent 48-bit segments avoid the UUID version and variant nibbles.
    raw := translate(upper(left(gen_random_uuid()::text,8) ||
      substr(gen_random_uuid()::text,10,4) || left(gen_random_uuid()::text,8) ||
      substr(gen_random_uuid()::text,10,4)), '01', 'GH');
    begin
      insert into public.dt_profiles (id,display_name,dear_id)
      values (user_id,name,substr(raw,1,8)||'-'||substr(raw,9,8)||'-'||substr(raw,17,8))
      on conflict (id) do nothing;
      return;
    exception when unique_violation then
      if attempt = 8 then raise; end if;
    end;
  end loop;
end $$;
revoke all on function dt_private.insert_profile(uuid,jsonb) from public;

create function dt_private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform dt_private.insert_profile(new.id,new.raw_user_meta_data);
  return new;
end $$;
revoke all on function dt_private.create_profile() from public;
create trigger dt_new_account after insert on auth.users for each row execute function dt_private.create_profile();
select dt_private.insert_profile(id,raw_user_meta_data) from auth.users;

create function dt_private.verified() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null or not exists (
    select from auth.users u join public.dt_profiles p on p.id=u.id
    where u.id=actor and u.email_confirmed_at is not null and p.deleting_at is null
  ) then raise exception 'Verify your email and sign in first.' using errcode='42501'; end if;
  return actor;
end $$;
revoke all on function dt_private.verified() from public;

create function public.dt_profile_name(name text, finish boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := dt_private.verified();
begin
  name := btrim(name);
  if name is null or char_length(name) not between 1 and 60 or name ~ '[[:cntrl:]]' then
    raise exception 'Choose a display name between 1 and 60 characters.' using errcode='22023';
  end if;
  update public.dt_profiles set display_name=name,onboarded=onboarded or coalesce(finish,false) where id=actor;
end $$;
revoke all on function public.dt_profile_name(text,boolean) from public,anon;
grant execute on function public.dt_profile_name(text,boolean) to authenticated;
