-- Atomic budget for Open Food Facts: no more than 10 uncached requests per minute.
-- OFF documents 15 read-product requests/minute/IP; reserve headroom for other requests.
create table if not exists public.food_barcode_external_budget (
  minute_bucket timestamptz primary key,
  calls integer not null default 0 check(calls >= 0 and calls <= 10)
);
alter table public.food_barcode_external_budget enable row level security;
revoke all on public.food_barcode_external_budget from anon,authenticated;
-- Only service_role may run this security-invoker function.
create or replace function public.food_barcode_take_budget()
returns boolean
language plpgsql
security invoker
set search_path = public
as $fn$
declare remaining integer;
begin
  insert into public.food_barcode_external_budget(minute_bucket,calls)
  values (date_trunc('minute',now()),1)
  on conflict (minute_bucket) do update set calls=public.food_barcode_external_budget.calls+1
  where public.food_barcode_external_budget.calls < 10
  returning calls into remaining;
  return remaining is not null;
end
$fn$;
revoke all on function public.food_barcode_take_budget() from public,anon,authenticated;
grant execute on function public.food_barcode_take_budget() to service_role;
