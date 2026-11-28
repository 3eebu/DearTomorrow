-- Read-only candidate inventory for one owner. Bind the verified owner UUID
-- and an operator-approved age cutoff as PostgreSQL parameters $1 and $2.
-- Results are sensitive operator data. See docs/remediation/PHASE_4_OPERATIONS.md.
with recursive owner as (
  select id, avatar from public.dt_profiles
  where id = $1::uuid and deleting_at is null
), records as (
  select payload as body from public.dt_documents join owner on owner.id = dt_documents.owner_id
  union all
  select summary from public.dt_documents join owner on owner.id = dt_documents.owner_id
  union all
  select metadata from public.dt_workspaces join owner on owner.id = dt_workspaces.owner_id
), nodes as (
  select body from records
  union all
  select child.value from nodes cross join lateral (
    select value from jsonb_each(case when jsonb_typeof(nodes.body) = 'object' then nodes.body else '{}'::jsonb end)
    union all
    select value from jsonb_array_elements(case when jsonb_typeof(nodes.body) = 'array' then nodes.body else '[]'::jsonb end)
  ) as child
), references_in_use as (
  select avatar as object_name from owner where avatar is not null
  union all
  select body->>'$dearMedia' from nodes where jsonb_typeof(body) = 'object' and body ? '$dearMedia'
)
select object.name
from storage.objects as object
join owner on split_part(object.name, '/', 1) = owner.id::text
where object.bucket_id = 'dear-tomorrow-private'
  and object.name ~ '^[0-9a-f-]{36}/(avatar|((books|trees|letters|journeys)/[A-Za-z0-9_-]{1,100}))/[0-9a-f]{64}$'
  and greatest(object.created_at, object.updated_at) < $2::timestamptz
  and not exists (select 1 from references_in_use r where r.object_name = object.name)
order by object.name;
