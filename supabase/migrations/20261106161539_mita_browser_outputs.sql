-- Additive: browser-computed products. Existing project/evidence schemas remain unchanged.
create table public.mita_browser_results (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.environmental_projects(id) on delete restrict,
 owner_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
 source_project_ref text not null check (source_project_ref ~ '^[A-Za-z0-9_-]{1,80}$'),
 fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
 report jsonb not null check (jsonb_typeof(report)='object' and octet_length(report::text)<=131072 and report->>'schema'='mita.browser-ndvi/1' and report->>'engine'='browser-ndvi-s2-v1' and report->>'projectId'=source_project_ref and report->>'fingerprint'=fingerprint and report->>'analysisId'=replace(id::text,'-','')),
 manifest jsonb not null check (jsonb_typeof(manifest)='object' and manifest ?& array['report.json','ndvi.tif','preview.png','statistics.csv'] and manifest-array['report.json','ndvi.tif','preview.png','statistics.csv']='{}'::jsonb),
 status text not null default 'uploading' check (status in ('uploading','ready','failed')),
 verification text not null default 'client-computed' check (verification='client-computed'),
 error text check (error is null or length(error)<=400),
 created_at timestamptz not null default now(),
 completed_at timestamptz,
 unique(project_id,fingerprint)
);
comment on table public.mita_browser_results is 'Products computed in the client browser. File consistency and ownership controls do not certify scientific accuracy or normative compliance.';
create index mita_browser_results_project_created on public.mita_browser_results(project_id,created_at desc);
create index mita_browser_results_owner_created on public.mita_browser_results(owner_id,created_at desc);
alter table public.mita_browser_results enable row level security;
revoke all on public.mita_browser_results from anon,authenticated;
grant select on public.mita_browser_results to authenticated;
grant insert(id,project_id,owner_id,source_project_ref,fingerprint,report,manifest,status) on public.mita_browser_results to authenticated;
grant update(status,error) on public.mita_browser_results to authenticated;
create policy mita_browser_select_owned on public.mita_browser_results for select to authenticated
 using(owner_id=(select auth.uid()) and exists(select 1 from public.environmental_projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy mita_browser_insert_owned on public.mita_browser_results for insert to authenticated
 with check(owner_id=(select auth.uid()) and status='uploading' and exists(select 1 from public.environmental_projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy mita_browser_update_owned on public.mita_browser_results for update to authenticated
 using(owner_id=(select auth.uid()) and exists(select 1 from public.environmental_projects p where p.id=project_id and p.owner_id=(select auth.uid())))
 with check(owner_id=(select auth.uid()) and exists(select 1 from public.environmental_projects p where p.id=project_id and p.owner_id=(select auth.uid())));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('mita-browser-private','mita-browser-private',false,16777216,array['application/json','image/tiff','image/png','text/csv']);
create policy mita_browser_files_select on storage.objects for select to authenticated
 using(bucket_id='mita-browser-private' and array_length(storage.foldername(name),1)=2 and exists(
 select 1 from public.mita_browser_results r where r.project_id::text=(storage.foldername(name))[1] and r.id::text=(storage.foldername(name))[2] and r.owner_id=(select auth.uid())));
create policy mita_browser_files_insert on storage.objects for insert to authenticated
 with check(bucket_id='mita-browser-private' and array_length(storage.foldername(name),1)=2 and storage.filename(name)=any(array['report.json','ndvi.tif','preview.png','statistics.csv']) and exists(
 select 1 from public.mita_browser_results r where r.project_id::text=(storage.foldername(name))[1] and r.id::text=(storage.foldername(name))[2] and r.owner_id=(select auth.uid()) and r.status='uploading'));
create policy mita_browser_files_delete_partial on storage.objects for delete to authenticated
 using(bucket_id='mita-browser-private' and array_length(storage.foldername(name),1)=2 and exists(
 select 1 from public.mita_browser_results r where r.project_id::text=(storage.foldername(name))[1] and r.id::text=(storage.foldername(name))[2] and r.owner_id=(select auth.uid()) and r.status in ('uploading','failed')));

create function public.mita_browser_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare filename text; info jsonb; expected_type text; n bigint;
begin
 if tg_op='INSERT' then
  if new.status<>'uploading' or new.error is not null or new.completed_at is not null then raise exception 'El resultado debe comenzar como carga pendiente.' using errcode='23514'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.owner_id::text,416));
  select count(*) into n from public.mita_browser_results where owner_id=new.owner_id and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
  if n>=20 then raise exception 'Máximo de 20 guardados privados por usuario y día.' using errcode='23514'; end if;
 else
  if old.status='ready' then raise exception 'El resultado terminado es inmutable; creá otro análisis.' using errcode='23514'; end if;
  if (new.id,new.project_id,new.owner_id,new.source_project_ref,new.fingerprint,new.report,new.manifest,new.created_at,new.verification) is distinct from (old.id,old.project_id,old.owner_id,old.source_project_ref,old.fingerprint,old.report,old.manifest,old.created_at,old.verification) then raise exception 'No se pueden sustituir metadatos, proyecto ni propietario.' using errcode='23514'; end if;
  if old.status='failed' and new.status<>'failed' then raise exception 'Se conserva el registro de carga fallida.' using errcode='23514'; end if;
 end if;
 foreach filename in array array['report.json','ndvi.tif','preview.png','statistics.csv'] loop
  info:=new.manifest->filename;
  expected_type:=case filename when 'report.json' then 'application/json' when 'ndvi.tif' then 'image/tiff' when 'preview.png' then 'image/png' else 'text/csv' end;
  if jsonb_typeof(info) is distinct from 'object' or coalesce(info->>'sha256','')!~'^[a-f0-9]{64}$' or coalesce(info->>'size','')!~'^[0-9]{1,8}$' or (info->>'size')::bigint not between 1 and 16777216 or info->>'contentType' is distinct from expected_type then raise exception 'Manifiesto de archivos inválido.' using errcode='23514'; end if;
  if new.status='ready' and not exists(select 1 from storage.objects o where o.bucket_id='mita-browser-private' and o.name=new.project_id::text||'/'||new.id::text||'/'||filename and (o.metadata->>'size')::bigint=(info->>'size')::bigint and o.metadata->>'mimetype'=expected_type) then raise exception 'La carga de archivos está incompleta o su tamaño/tipo no coincide.' using errcode='23514'; end if;
 end loop;
 if new.status='ready' then new.completed_at:=now();new.error:=null;end if;
 return new;
end $$;
revoke all on function public.mita_browser_guard() from public,anon;
grant execute on function public.mita_browser_guard() to authenticated;
create trigger mita_browser_guard_before_write before insert or update on public.mita_browser_results for each row execute function public.mita_browser_guard();
