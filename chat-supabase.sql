create table if not exists public.couple_chat_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  author text not null,
  content text not null
);

create table if not exists public.couple_status_cards (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  author text not null,
  feeling text not null,
  note text not null default ''
);

create table if not exists public.couple_riddles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  author text not null,
  question text not null,
  answer text not null,
  revealed boolean not null default false
);

create table if not exists public.couple_question_rounds (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  prompt text not null,
  hint text not null default '',
  author_a text not null default '',
  answer_a text not null default '',
  author_b text not null default '',
  answer_b text not null default ''
);

create table if not exists public.couple_draw_rounds (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  round_index integer not null default 1,
  drawer text not null,
  prompt text not null,
  drawing_data text not null default '',
  guess_author text not null default '',
  guess_text text not null default ''
);

create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  checkin_date date not null,
  person text not null,
  unique (checkin_date, person)
);

create table if not exists public.couple_hugs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  action_date date not null,
  person text not null,
  unique (action_date, person)
);

create table if not exists public.couple_goodnight_lamps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  action_date date not null,
  person text not null,
  unique (action_date, person)
);

create table if not exists public.couple_miss_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  score_date date not null,
  person text not null,
  score integer not null default 88,
  unique (score_date, person)
);

create table if not exists public.couple_sync_questions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  question_date date not null,
  question text not null,
  hint text not null default '',
  author_a text not null default '',
  answer_a text not null default '',
  author_b text not null default '',
  answer_b text not null default ''
);

create table if not exists public.couple_capsules (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  person text not null,
  content text not null
);

alter table public.couple_chat_messages enable row level security;
alter table public.couple_status_cards enable row level security;
alter table public.couple_riddles enable row level security;
alter table public.couple_question_rounds enable row level security;
alter table public.couple_draw_rounds enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.couple_hugs enable row level security;
alter table public.couple_goodnight_lamps enable row level security;
alter table public.couple_miss_scores enable row level security;
alter table public.couple_sync_questions enable row level security;
alter table public.couple_capsules enable row level security;

drop policy if exists "Anyone can read couple_chat_messages" on public.couple_chat_messages;
create policy "Anyone can read couple_chat_messages"
on public.couple_chat_messages for select
to anon
using (true);

drop policy if exists "Anyone can insert couple_chat_messages" on public.couple_chat_messages;
create policy "Anyone can insert couple_chat_messages"
on public.couple_chat_messages for insert
to anon
with check (true);

drop policy if exists "Anyone can update couple_chat_messages" on public.couple_chat_messages;
create policy "Anyone can update couple_chat_messages"
on public.couple_chat_messages for update
to anon
using (true)
with check (true);

drop policy if exists "Anyone can delete couple_chat_messages" on public.couple_chat_messages;
create policy "Anyone can delete couple_chat_messages"
on public.couple_chat_messages for delete
to anon
using (true);

drop policy if exists "Anyone can read couple_status_cards" on public.couple_status_cards;
create policy "Anyone can read couple_status_cards"
on public.couple_status_cards for select
to anon
using (true);

drop policy if exists "Anyone can insert couple_status_cards" on public.couple_status_cards;
create policy "Anyone can insert couple_status_cards"
on public.couple_status_cards for insert
to anon
with check (true);

drop policy if exists "Anyone can update couple_status_cards" on public.couple_status_cards;
create policy "Anyone can update couple_status_cards"
on public.couple_status_cards for update
to anon
using (true)
with check (true);

drop policy if exists "Anyone can delete couple_status_cards" on public.couple_status_cards;
create policy "Anyone can delete couple_status_cards"
on public.couple_status_cards for delete
to anon
using (true);

drop policy if exists "Anyone can read couple_riddles" on public.couple_riddles;
create policy "Anyone can read couple_riddles"
on public.couple_riddles for select
to anon
using (true);

drop policy if exists "Anyone can insert couple_riddles" on public.couple_riddles;
create policy "Anyone can insert couple_riddles"
on public.couple_riddles for insert
to anon
with check (true);

drop policy if exists "Anyone can update couple_riddles" on public.couple_riddles;
create policy "Anyone can update couple_riddles"
on public.couple_riddles for update
to anon
using (true)
with check (true);

drop policy if exists "Anyone can delete couple_riddles" on public.couple_riddles;
create policy "Anyone can delete couple_riddles"
on public.couple_riddles for delete
to anon
using (true);

drop policy if exists "Anyone can read couple_question_rounds" on public.couple_question_rounds;
create policy "Anyone can read couple_question_rounds"
on public.couple_question_rounds for select
to anon
using (true);

drop policy if exists "Anyone can insert couple_question_rounds" on public.couple_question_rounds;
create policy "Anyone can insert couple_question_rounds"
on public.couple_question_rounds for insert
to anon
with check (true);

drop policy if exists "Anyone can update couple_question_rounds" on public.couple_question_rounds;
create policy "Anyone can update couple_question_rounds"
on public.couple_question_rounds for update
to anon
using (true)
with check (true);

drop policy if exists "Anyone can delete couple_question_rounds" on public.couple_question_rounds;
create policy "Anyone can delete couple_question_rounds"
on public.couple_question_rounds for delete
to anon
using (true);

drop policy if exists "Anyone can read couple_draw_rounds" on public.couple_draw_rounds;
create policy "Anyone can read couple_draw_rounds"
on public.couple_draw_rounds for select
to anon
using (true);

drop policy if exists "Anyone can insert couple_draw_rounds" on public.couple_draw_rounds;
create policy "Anyone can insert couple_draw_rounds"
on public.couple_draw_rounds for insert
to anon
with check (true);

drop policy if exists "Anyone can update couple_draw_rounds" on public.couple_draw_rounds;
create policy "Anyone can update couple_draw_rounds"
on public.couple_draw_rounds for update
to anon
using (true)
with check (true);

drop policy if exists "Anyone can delete couple_draw_rounds" on public.couple_draw_rounds;
create policy "Anyone can delete couple_draw_rounds"
on public.couple_draw_rounds for delete
to anon
using (true);

drop policy if exists "Anyone can read daily_checkins" on public.daily_checkins;
create policy "Anyone can read daily_checkins"
on public.daily_checkins for select
to anon
using (true);

drop policy if exists "Anyone can insert daily_checkins" on public.daily_checkins;
create policy "Anyone can insert daily_checkins"
on public.daily_checkins for insert
to anon
with check (true);

drop policy if exists "Anyone can update daily_checkins" on public.daily_checkins;
create policy "Anyone can update daily_checkins"
on public.daily_checkins for update
to anon
using (true)
with check (true);

drop policy if exists "Anyone can delete daily_checkins" on public.daily_checkins;
create policy "Anyone can delete daily_checkins"
on public.daily_checkins for delete
to anon
using (true);

drop policy if exists "Anyone can read couple_hugs" on public.couple_hugs;
create policy "Anyone can read couple_hugs"
on public.couple_hugs for select
to anon
using (true);

drop policy if exists "Anyone can insert couple_hugs" on public.couple_hugs;
create policy "Anyone can insert couple_hugs"
on public.couple_hugs for insert
to anon
with check (true);

drop policy if exists "Anyone can update couple_hugs" on public.couple_hugs;
create policy "Anyone can update couple_hugs"
on public.couple_hugs for update
to anon
using (true)
with check (true);

drop policy if exists "Anyone can delete couple_hugs" on public.couple_hugs;
create policy "Anyone can delete couple_hugs"
on public.couple_hugs for delete
to anon
using (true);

drop policy if exists "Anyone can read couple_goodnight_lamps" on public.couple_goodnight_lamps;
create policy "Anyone can read couple_goodnight_lamps"
on public.couple_goodnight_lamps for select
to anon
using (true);

drop policy if exists "Anyone can insert couple_goodnight_lamps" on public.couple_goodnight_lamps;
create policy "Anyone can insert couple_goodnight_lamps"
on public.couple_goodnight_lamps for insert
to anon
with check (true);

drop policy if exists "Anyone can update couple_goodnight_lamps" on public.couple_goodnight_lamps;
create policy "Anyone can update couple_goodnight_lamps"
on public.couple_goodnight_lamps for update
to anon
using (true)
with check (true);

drop policy if exists "Anyone can delete couple_goodnight_lamps" on public.couple_goodnight_lamps;
create policy "Anyone can delete couple_goodnight_lamps"
on public.couple_goodnight_lamps for delete
to anon
using (true);

drop policy if exists "Anyone can read couple_miss_scores" on public.couple_miss_scores;
create policy "Anyone can read couple_miss_scores"
on public.couple_miss_scores for select
to anon
using (true);

drop policy if exists "Anyone can insert couple_miss_scores" on public.couple_miss_scores;
create policy "Anyone can insert couple_miss_scores"
on public.couple_miss_scores for insert
to anon
with check (true);

drop policy if exists "Anyone can update couple_miss_scores" on public.couple_miss_scores;
create policy "Anyone can update couple_miss_scores"
on public.couple_miss_scores for update
to anon
using (true)
with check (true);

drop policy if exists "Anyone can delete couple_miss_scores" on public.couple_miss_scores;
create policy "Anyone can delete couple_miss_scores"
on public.couple_miss_scores for delete
to anon
using (true);

drop policy if exists "Anyone can read couple_sync_questions" on public.couple_sync_questions;
create policy "Anyone can read couple_sync_questions"
on public.couple_sync_questions for select
to anon
using (true);

drop policy if exists "Anyone can insert couple_sync_questions" on public.couple_sync_questions;
create policy "Anyone can insert couple_sync_questions"
on public.couple_sync_questions for insert
to anon
with check (true);

drop policy if exists "Anyone can update couple_sync_questions" on public.couple_sync_questions;
create policy "Anyone can update couple_sync_questions"
on public.couple_sync_questions for update
to anon
using (true)
with check (true);

drop policy if exists "Anyone can delete couple_sync_questions" on public.couple_sync_questions;
create policy "Anyone can delete couple_sync_questions"
on public.couple_sync_questions for delete
to anon
using (true);

drop policy if exists "Anyone can read couple_capsules" on public.couple_capsules;
create policy "Anyone can read couple_capsules"
on public.couple_capsules for select
to anon
using (true);

drop policy if exists "Anyone can insert couple_capsules" on public.couple_capsules;
create policy "Anyone can insert couple_capsules"
on public.couple_capsules for insert
to anon
with check (true);

drop policy if exists "Anyone can update couple_capsules" on public.couple_capsules;
create policy "Anyone can update couple_capsules"
on public.couple_capsules for update
to anon
using (true)
with check (true);

drop policy if exists "Anyone can delete couple_capsules" on public.couple_capsules;
create policy "Anyone can delete couple_capsules"
on public.couple_capsules for delete
to anon
using (true);
