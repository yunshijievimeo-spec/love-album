create extension if not exists pgcrypto;

create table if not exists public.couple_moment_puzzles (
  id uuid primary key default gen_random_uuid(),
  person text not null check (person in ('号号', '秀琴', '浩浩')),
  moment_date date not null,
  note text not null default '',
  image_path text not null default '',
  image_url text not null default '',
  image_size integer not null default 0 check (image_size >= 0),
  width integer not null default 0 check (width >= 0),
  height integer not null default 0 check (height >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists couple_moment_puzzles_person_date_uidx
  on public.couple_moment_puzzles (person, moment_date);

create index if not exists couple_moment_puzzles_moment_date_idx
  on public.couple_moment_puzzles (moment_date desc, created_at desc);

create or replace function public.set_couple_moment_puzzles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists couple_moment_puzzles_set_updated_at on public.couple_moment_puzzles;
create trigger couple_moment_puzzles_set_updated_at
before update on public.couple_moment_puzzles
for each row execute function public.set_couple_moment_puzzles_updated_at();

alter table public.couple_moment_puzzles enable row level security;

drop policy if exists "moment_puzzles_select_all" on public.couple_moment_puzzles;
create policy "moment_puzzles_select_all"
on public.couple_moment_puzzles
for select
to anon, authenticated
using (true);

drop policy if exists "moment_puzzles_insert_all" on public.couple_moment_puzzles;
create policy "moment_puzzles_insert_all"
on public.couple_moment_puzzles
for insert
to anon, authenticated
with check (true);

drop policy if exists "moment_puzzles_update_all" on public.couple_moment_puzzles;
create policy "moment_puzzles_update_all"
on public.couple_moment_puzzles
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "moment_puzzles_delete_all" on public.couple_moment_puzzles;
create policy "moment_puzzles_delete_all"
on public.couple_moment_puzzles
for delete
to anon, authenticated
using (true);
