-- JCC管理アプリ v6: 質問箱テーブル
-- Supabaseダッシュボードの「SQL Editor」で実行してください

create table if not exists questions (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  from_name text not null,
  from_team text not null,
  status text not null default 'unanswered' check (status in ('unanswered', 'answered')),
  created_at timestamptz default now()
);

create table if not exists question_recipients (
  id uuid default gen_random_uuid() primary key,
  question_id uuid references questions(id) on delete cascade not null,
  recipient_type text not null check (recipient_type in ('team', 'individual')),
  recipient_name text not null
);

create table if not exists question_comments (
  id uuid default gen_random_uuid() primary key,
  question_id uuid references questions(id) on delete cascade not null,
  content text not null,
  created_by text not null,
  created_at timestamptz default now()
);

alter table questions enable row level security;
alter table question_recipients enable row level security;
alter table question_comments enable row level security;

create policy "allow_all_questions" on questions for all using (true) with check (true);
create policy "allow_all_question_recipients" on question_recipients for all using (true) with check (true);
create policy "allow_all_question_comments" on question_comments for all using (true) with check (true);
