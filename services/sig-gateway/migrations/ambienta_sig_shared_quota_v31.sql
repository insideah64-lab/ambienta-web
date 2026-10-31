-- AMBIENTA V3.1 · shared budget across Supabase Edge instances.
-- No user/project coordinates, identities or environmental files are stored.
-- Callable through PostgREST ONLY with the server-side service_role credential.
create schema if not exists ambienta_sig;
revoke all on schema ambienta_sig from public, anon, authenticated;
grant usage on schema ambienta_sig to service_role;

create table if not exists ambienta_sig.request_budget (
 period_seconds integer not null check (period_seconds in (60, 3600, 86400)),
 bucket bigint not null,
 scope text not null check (scope in ('global', 'layer:municipios', 'layer:otbn', 'layer:vegetacion')),
 used integer not null default 0 check (used >= 0),
 updated_at timestamptz not null default now(),
 primary key (period_seconds,bucket,scope)
);
alter table ambienta_sig.request_budget enable row level security;
revoke all on ambienta_sig.request_budget from public, anon, authenticated;
grant select, insert, update on ambienta_sig.request_budget to service_role;

create or replace function public.ambienta_sig_reserve_quota(p_layer text)
returns jsonb language plpgsql volatile security invoker
set search_path = ''
as $$
declare
 v_now bigint := pg_catalog.floor(pg_catalog.extract(epoch from pg_catalog.clock_timestamp()))::bigint;
 v_seconds integer;
 v_scope text;
 v_limit integer;
 v_used integer;
 v_bucket bigint;
 v_retry integer;
begin
 if p_layer is null or p_layer not in ('municipios','otbn','vegetacion') then
   raise exception 'capa SIG no autorizada' using errcode='22023';
 end if;
 -- A fixed transaction-scoped lock prevents oversubscription by separate Edge instances.
 perform pg_catalog.pg_advisory_xact_lock(73312, 31);
 -- Check ALL five windows before consuming any credits.
 for v_seconds,v_scope,v_limit in
   select q.seconds,q.scope,q.quota
   from (values
      (60,'global',12),
      (60,'layer:'||p_layer,8),
      (3600,'global',120),
      (3600,'layer:'||p_layer,60),
      (86400,'global',500)
   ) as q(seconds,scope,quota)
   order by q.seconds,q.scope
 loop
   v_bucket := v_now / v_seconds;
   select b.used into v_used
     from ambienta_sig.request_budget as b
     where b.period_seconds=v_seconds and b.bucket=v_bucket and b.scope=v_scope;
   if pg_catalog.coalesce(v_used,0)>=v_limit then
      v_retry := pg_catalog.greatest(1,v_seconds - (v_now % v_seconds))::integer;
      return pg_catalog.jsonb_build_object('allowed',false,
         'reason','GLOBAL_BUDGET_EXHAUSTED','retryAfterSeconds',v_retry,
         'periodSeconds',v_seconds,'scope',v_scope);
   end if;
 end loop;
 -- Increment in the SAME transaction, after the atomic check.
 for v_seconds,v_scope,v_limit in
   select q.seconds,q.scope,q.quota
   from (values
      (60,'global',12),
      (60,'layer:'||p_layer,8),
      (3600,'global',120),
      (3600,'layer:'||p_layer,60),
      (86400,'global',500)
   ) as q(seconds,scope,quota)
 loop
   v_bucket := v_now / v_seconds;
   insert into ambienta_sig.request_budget as b
     (period_seconds,bucket,scope,used)
   values (v_seconds,v_bucket,v_scope,1)
   on conflict (period_seconds,bucket,scope)
   do update set used=b.used + 1,updated_at=pg_catalog.now();
 end loop;
 return pg_catalog.jsonb_build_object('allowed',true,'policy','global_shared',
    'periodsSeconds',pg_catalog.jsonb_build_array(60,3600,86400));
end;
$$;

revoke all on function public.ambienta_sig_reserve_quota(text) from public, anon, authenticated;
grant execute on function public.ambienta_sig_reserve_quota(text) to service_role;

comment on function public.ambienta_sig_reserve_quota(text) is
 'AMBIENTA SIG internal atomic global/provider budget; service_role only; no user info or BBOX retained';
