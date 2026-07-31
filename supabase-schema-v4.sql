-- JCC管理アプリ v4: Thanksテーブル
-- Supabaseダッシュボードの「SQL Editor」で実行してください

create table if not exists thanks (
  id uuid default gen_random_uuid() primary key,
  message text not null,
  from_name text not null,
  recipient_type text not null check (recipient_type in ('team', 'individual')),
  recipient_name text not null,
  created_at timestamptz default now()
);

alter table thanks enable row level security;

create policy "allow_all_thanks" on thanks for all using (true) with check (true);
