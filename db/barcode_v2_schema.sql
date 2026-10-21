-- Food barcode v2: additive review pipeline and shared external lookup cache.
-- Preserves existing catalog, aliases and diet logs. No destructive data updates.
create table if not exists public.food_product_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  barcode text not null check (barcode ~ '^[0-9]{8,14}$'),
  brand text check (brand is null or length(brand) <= 120),
  name text not null check (char_length(btrim(name)) between 2 and 200),
  category text not null default '超商鮮食',
  sub_category text,
  basis_type text not null default 'serving' check (basis_type in ('serving','100g','100ml')),
  serving_quantity numeric check (serving_quantity > 0 and serving_quantity <= 100000),
  serving_unit text check (serving_unit in ('g','ml')),
  kcal numeric check (kcal is null or kcal between 0 and 3500),
  protein numeric check (protein is null or protein between 0 and 300),
  fat numeric check (fat is null or fat between 0 and 300),
  carbs numeric check (carbs is null or carbs between 0 and 300),
  source_type text not null default 'manual' check (source_type in ('manual','label_ocr','package_label','external_correction')),
  source_url text check (source_url is null or length(source_url) <= 1500),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists food_product_submissions_user_pending_barcode_uniq
on public.food_product_submissions(user_id,barcode) where status='pending';
create index if not exists food_product_submissions_status_created_idx
on public.food_product_submissions(status,created_at desc);
alter table public.food_product_submissions enable row level security;
revoke all on public.food_product_submissions from anon,authenticated;
grant select,insert on public.food_product_submissions to authenticated;
create policy "food_submissions_select_own" on public.food_product_submissions
for select to authenticated using (user_id=(select auth.uid()));
create policy "food_submissions_insert_own_pending" on public.food_product_submissions
for insert to authenticated with check (
  user_id=(select auth.uid()) and status='pending'
  and review_notes is null and reviewed_at is null
);

create table if not exists public.food_barcode_cache (
  barcode text primary key check (barcode ~ '^[0-9]{8,14}$'),
  state text not null check (state in ('complete','incomplete','not_found')),
  payload jsonb not null default '{}'::jsonb,
  source_name text not null default 'Open Food Facts',
  source_url text,
  attribution text not null default 'Open Food Facts (ODbL)',
  retrieved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_used_at timestamptz
);
create index if not exists food_barcode_cache_expiry_idx on public.food_barcode_cache(expires_at);
alter table public.food_barcode_cache enable row level security;
revoke all on public.food_barcode_cache from anon,authenticated;
grant select on public.food_barcode_cache to authenticated;
create policy "food_barcode_cache_read_auth" on public.food_barcode_cache
for select to authenticated using(true);

-- Old permissive policies OR together, allowing everyone to read pending entries and
-- permitting any authenticated writer to mark their own insertion as verified.
drop policy if exists "Anyone can read custom foods" on public.custom_foods;
drop policy if exists "Authenticated users can insert foods" on public.custom_foods;
drop policy if exists "Enable insert access for authenticated users" on public.custom_foods;
drop policy if exists "Enable update for users based on created_by" on public.custom_foods;
create policy "food_customs_insert_unverified_own" on public.custom_foods
for insert to authenticated
with check (created_by=(select auth.uid()) and is_verified is false);
revoke all on public.custom_foods from anon;
revoke update,delete,truncate,trigger,references on public.custom_foods from authenticated;
grant select,insert on public.custom_foods to authenticated;
-- Tighten read-only catalog grants to reflect existing authenticated RLS policies.
revoke all on public.food_catalog_candidates from anon;
revoke insert,update,delete,truncate,trigger,references on public.food_catalog_candidates from authenticated;
grant select on public.food_catalog_candidates to authenticated;
revoke all on public.food_barcode_aliases from anon;
revoke insert,update,delete,truncate,trigger,references on public.food_barcode_aliases from authenticated;
grant select on public.food_barcode_aliases to authenticated;
