-- JCC管理アプリ v3: 日程調整テーブル
-- Supabaseダッシュボードの「SQL Editor」で実行してください

-- 候補日テーブル
create table if not exists schedule_candidates (
  id uuid default gen_random_uuid() primary key,
  request_id uuid references requests(id) on delete cascade not null,
  date date not null,
  time_from text, -- HH:MM 形式（任意）
  time_to text,   -- HH:MM 形式（任意）
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 回答テーブル（○/△/×）
create table if not exists schedule_responses (
  id uuid default gen_random_uuid() primary key,
  candidate_id uuid references schedule_candidates(id) on delete cascade not null,
  request_id uuid references requests(id) on delete cascade not null,
  user_name text not null,
  response text not null check (response in ('available', 'maybe', 'unavailable')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (candidate_id, user_name)
);

-- RLS有効化
alter table schedule_candidates enable row level security;
alter table schedule_responses enable row level security;

-- 全操作を許可するポリシー
create policy "allow_all_schedule_candidates" on schedule_candidates for all using (true) with check (true);
create policy "allow_all_schedule_responses" on schedule_responses for all using (true) with check (true);
