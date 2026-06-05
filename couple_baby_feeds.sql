create extension if not exists pgcrypto;

create table if not exists public.couple_baby_feeds (
  id uuid primary key default gen_random_uuid(),
  person text not null check (person in ('号号', '秀琴', '浩浩')),
  feed_date date not null,
  amount integer not null default 50 check (amount > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists couple_baby_feeds_feed_date_idx
  on public.couple_baby_feeds (feed_date desc, created_at desc);

alter table public.couple_baby_feeds enable row level security;

drop policy if exists "baby_feeds_select_all" on public.couple_baby_feeds;
create policy "baby_feeds_select_all"
on public.couple_baby_feeds
for select
to anon, authenticated
using (true);

drop policy if exists "baby_feeds_insert_all" on public.couple_baby_feeds;
create policy "baby_feeds_insert_all"
on public.couple_baby_feeds
for insert
to anon, authenticated
with check (true);
