create table if not exists public.couple_morning_voices (
  id uuid primary key default gen_random_uuid(),
  person text not null check (person in ('号号', '秀琴')),
  morning_date date not null,
  audio_path text not null default '',
  audio_url text not null default '',
  audio_size integer not null default 0,
  duration_seconds integer not null default 0,
  mime_type text not null default 'audio/webm',
  heard_by_haohao_at timestamptz,
  heard_by_xiuqin_at timestamptz,
  reply_by_haohao_at timestamptz,
  reply_by_xiuqin_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists couple_morning_voices_person_date_key
  on public.couple_morning_voices (person, morning_date);

create index if not exists couple_morning_voices_morning_date_idx
  on public.couple_morning_voices (morning_date desc, created_at desc);

alter table public.couple_morning_voices enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'couple_morning_voices'
      and policyname = 'couple_morning_voices_select_all'
  ) then
    create policy couple_morning_voices_select_all
      on public.couple_morning_voices
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'couple_morning_voices'
      and policyname = 'couple_morning_voices_insert_all'
  ) then
    create policy couple_morning_voices_insert_all
      on public.couple_morning_voices
      for insert
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'couple_morning_voices'
      and policyname = 'couple_morning_voices_update_all'
  ) then
    create policy couple_morning_voices_update_all
      on public.couple_morning_voices
      for update
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'couple_morning_voices'
      and policyname = 'couple_morning_voices_delete_all'
  ) then
    create policy couple_morning_voices_delete_all
      on public.couple_morning_voices
      for delete
      using (true);
  end if;
end
$$;

comment on table public.couple_morning_voices is '每天一人一条的早安语音卡，只保留当天内容。';
