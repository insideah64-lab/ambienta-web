-- Transactional fixtures only; no users, projects or object metadata survive ROLLBACK.
begin;
select set_config('ambienta.qa_a',gen_random_uuid()::text,true),set_config('ambienta.qa_b',gen_random_uuid()::text,true),set_config('ambienta.qa_pa',gen_random_uuid()::text,true),set_config('ambienta.qa_pb',gen_random_uuid()::text,true),set_config('ambienta.qa_result',gen_random_uuid()::text,true);
insert into auth.users(id,email) values(current_setting('ambienta.qa_a')::uuid,'mita-qa-a@example.invalid'),(current_setting('ambienta.qa_b')::uuid,'mita-qa-b@example.invalid');
insert into public.environmental_projects(id,owner_id,name,province) values(current_setting('ambienta.qa_pa')::uuid,current_setting('ambienta.qa_a')::uuid,'QA synthetic A','Salta'),(current_setting('ambienta.qa_pb')::uuid,current_setting('ambienta.qa_b')::uuid,'QA synthetic B','Salta');
select set_config('request.jwt.claims',json_build_object('sub',current_setting('ambienta.qa_a'),'role','authenticated')::text,true);
set local role authenticated;
insert into public.mita_browser_results(id,project_id,source_project_ref,fingerprint,report,manifest)
 select current_setting('ambienta.qa_result')::uuid,current_setting('ambienta.qa_pa')::uuid,'DEMO-001',repeat('a',64),jsonb_build_object('schema','mita.browser-ndvi/1','engine','browser-ndvi-s2-v1','projectId','DEMO-001','fingerprint',repeat('a',64),'analysisId',replace(current_setting('ambienta.qa_result'),'-','')),jsonb_object_agg(f,jsonb_build_object('sha256',repeat('b',64),'size',4,'contentType',t)) from (values('report.json','application/json'),('ndvi.tif','image/tiff'),('preview.png','image/png'),('statistics.csv','text/csv')) v(f,t);
do $$ begin
 if (select count(*) from public.mita_browser_results)<>1 then raise exception 'Owner cannot read result';end if;
 begin
  update public.mita_browser_results set status='ready' where id=current_setting('ambienta.qa_result')::uuid;
  raise exception 'Incomplete files unexpectedly accepted';
 exception when check_violation then null;end;
 begin
  insert into public.mita_browser_results(id,project_id,source_project_ref,fingerprint,report,manifest) select gen_random_uuid(),current_setting('ambienta.qa_pb')::uuid,source_project_ref,repeat('c',64),report,manifest from public.mita_browser_results limit 1;
  raise exception 'Foreign project unexpectedly accepted';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.mita_browser_results(id,project_id,source_project_ref,fingerprint,report,manifest) select gen_random_uuid(),project_id,source_project_ref,repeat('d',64),'{}'::jsonb,manifest from public.mita_browser_results limit 1;
  raise exception 'Missing report fields unexpectedly accepted';
 exception when check_violation then null;end;
end $$;
-- Storage metadata fixtures exercise SQL policies, not the Storage HTTP upload service.
insert into storage.objects(bucket_id,name,metadata) select 'mita-browser-private',current_setting('ambienta.qa_pa')||'/'||current_setting('ambienta.qa_result')||'/'||f,jsonb_build_object('size',4,'mimetype',t) from (values('report.json','application/json'),('ndvi.tif','image/tiff'),('preview.png','image/png'),('statistics.csv','text/csv')) v(f,t);
update public.mita_browser_results set status='ready' where id=current_setting('ambienta.qa_result')::uuid;
do $$ begin
 if not exists(select 1 from public.mita_browser_results where status='ready' and completed_at is not null) then raise exception 'Ready transition failed';end if;
 begin
  update public.mita_browser_results set status='failed';raise exception 'Ready record mutable';
 exception when check_violation then null;end;
 -- Hosted Storage blocks direct SQL deletion independently of RLS; deletion uses the API.
 if (select count(*) from storage.objects where bucket_id='mita-browser-private')<>4 then raise exception 'Ready files deleted';end if;
 begin
  update storage.objects set metadata='{}' where bucket_id='mita-browser-private';
  if found then raise exception 'Ready file overwrite allowed';end if;
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('ambienta.qa_b'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.mita_browser_results) or exists(select 1 from storage.objects where bucket_id='mita-browser-private') then raise exception 'Other user can read private results';end if;
 begin
  insert into storage.objects(bucket_id,name) values('mita-browser-private',current_setting('ambienta.qa_pa')||'/'||current_setting('ambienta.qa_result')||'/report.json');raise exception 'Other user can upload';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform 1 from public.mita_browser_results;raise exception 'Anonymous access allowed';exception when insufficient_privilege then null;end;
 if exists(select 1 from storage.objects where bucket_id='mita-browser-private') then raise exception 'Anonymous file read allowed';end if;
end $$;
reset role;
select 'PASS: owner scope, foreign/anonymous denial, required report, incomplete upload denial, ready immutability; fixtures rolled back' as result;
rollback;
