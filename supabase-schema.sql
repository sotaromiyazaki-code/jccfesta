-- JCC管理アプリ Supabaseスキーマ
-- Supabaseダッシュボードの「SQL Editor」で実行してください

-- 依頼テーブル
create table if not exists requests (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  deadline date,
  priority text not null check (priority in ('urgent', 'normal')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  created_by text not null,
  created_at timestamptz default now()
);

-- 宛先テーブル（チームまたは個人名）
create table if not exists request_recipients (
  id uuid default gen_random_uuid() primary key,
  request_id uuid references requests(id) on delete cascade not null,
  recipient_type text not null check (recipient_type in ('team', 'individual')),
  recipient_name text not null
);

-- コメントテーブル
create table if not exists comments (
  id uuid default gen_random_uuid() primary key,
  request_id uuid references requests(id) on delete cascade not null,
  content text not null,
  created_by text not null,
  created_at timestamptz default now()
);

-- リアクションテーブル（同一人物・同一絵文字は1回まで）
create table if not exists reactions (
  id uuid default gen_random_uuid() primary key,
  request_id uuid references requests(id) on delete cascade not null,
  emoji text not null,
  created_by text not null,
  created_at timestamptz default now(),
  unique (request_id, emoji, created_by)
);

-- RLS（Row Level Security）を有効化
alter table requests enable row level security;
alter table request_recipients enable row level security;
alter table comments enable row level security;
alter table reactions enable row level security;

-- 全操作を許可するポリシー（合言葉で入室したメンバーのみがアクセスするため）
create policy "allow_all_requests" on requests for all using (true) with check (true);
create policy "allow_all_recipients" on request_recipients for all using (true) with check (true);
create policy "allow_all_comments" on comments for all using (true) with check (true);
create policy "allow_all_reactions" on reactions for all using (true) with check (true);
