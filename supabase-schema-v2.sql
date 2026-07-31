-- JCC管理アプリ v2: ミーティング管理テーブル
-- Supabaseダッシュボードの「SQL Editor」で実行してください

-- ミーティングテーブル
create table if not exists meetings (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  meeting_url text,
  notes_url text,
  other_url text,
  is_sos boolean default false,
  series_id uuid, -- 繰り返しミーティングのグループID
  created_by text not null,
  created_at timestamptz default now()
);

-- 参加チーム・個人名テーブル
create table if not exists meeting_recipients (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references meetings(id) on delete cascade not null,
  recipient_type text not null check (recipient_type in ('team', 'individual')),
  recipient_name text not null
);

-- SOS参加表明テーブル（4人のメンバーが「参加する」をタップ）
create table if not exists meeting_participants (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references meetings(id) on delete cascade not null,
  user_name text not null,
  created_at timestamptz default now(),
  unique (meeting_id, user_name)
);

-- RLS有効化
alter table meetings enable row level security;
alter table meeting_recipients enable row level security;
alter table meeting_participants enable row level security;

-- 全操作を許可するポリシー
create policy "allow_all_meetings" on meetings for all using (true) with check (true);
create policy "allow_all_meeting_recipients" on meeting_recipients for all using (true) with check (true);
create policy "allow_all_meeting_participants" on meeting_participants for all using (true) with check (true);
