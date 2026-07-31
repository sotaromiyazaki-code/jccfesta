-- JCC管理アプリ v4b: Thanks用リアクション・コメントテーブル
-- Supabaseダッシュボードの「SQL Editor」で実行してください

create table if not exists thanks_reactions (
  id uuid default gen_random_uuid() primary key,
  thanks_id uuid references thanks(id) on delete cascade not null,
  emoji text not null,
  created_by text not null,
  created_at timestamptz default now(),
  unique (thanks_id, emoji, created_by)
);

create table if not exists thanks_comments (
  id uuid default gen_random_uuid() primary key,
  thanks_id uuid references thanks(id) on delete cascade not null,
  content text not null,
  created_by text not null,
  created_at timestamptz default now()
);

alter table thanks_reactions enable row level security;
alter table thanks_comments enable row level security;

create policy "allow_all_thanks_reactions" on thanks_reactions for all using (true) with check (true);
create policy "allow_all_thanks_comments" on thanks_comments for all using (true) with check (true);
