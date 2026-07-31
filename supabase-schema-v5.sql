-- JCC管理アプリ v5: マイページ確認済みテーブル
-- Supabaseダッシュボードの「SQL Editor」で実行してください

create table if not exists my_page_dismissals (
  id uuid default gen_random_uuid() primary key,
  user_name text not null,
  item_type text not null check (item_type in ('request', 'meeting')),
  item_id uuid not null,
  created_at timestamptz default now(),
  unique (user_name, item_type, item_id)
);

alter table my_page_dismissals enable row level security;

create policy "allow_all_my_page_dismissals" on my_page_dismissals for all using (true) with check (true);
