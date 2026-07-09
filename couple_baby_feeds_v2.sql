create extension if not exists pgcrypto;

create table if not exists public.couple_baby_feeds_v2 (
  id uuid primary key default gen_random_uuid(),
  person text not null,
  feed_date date not null,
  amount integer not null default 50 check (amount > 0),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.couple_baby_feeds_v2
drop constraint if exists couple_baby_feeds_v2_person_check;

alter table public.couple_baby_feeds_v2
add constraint couple_baby_feeds_v2_person_check
check (person in ('号号', '秀琴', '浩浩'));

create index if not exists couple_baby_feeds_v2_feed_date_idx
  on public.couple_baby_feeds_v2 (feed_date desc, created_at desc);

alter table public.couple_baby_feeds_v2 enable row level security;

drop policy if exists "baby_feeds_v2_select_all" on public.couple_baby_feeds_v2;
create policy "baby_feeds_v2_select_all"
on public.couple_baby_feeds_v2
for select
to anon, authenticated
using (true);

drop policy if exists "baby_feeds_v2_insert_all" on public.couple_baby_feeds_v2;
create policy "baby_feeds_v2_insert_all"
on public.couple_baby_feeds_v2
for insert
to anon, authenticated
with check (true);
