-- v7: user_logins テーブル（参加者一覧・ログイン記録用）

create table if not exists user_logins (
  user_name      text primary key,
  teams          text[]      not null default '{}',
  first_login_at timestamptz not null default now(),
  last_login_at  timestamptz not null default now()
);

alter table user_logins enable row level security;

-- 全員が読み書き可能（匿名キーで upsert するため）
create policy "anyone can read user_logins"
  on user_logins for select using (true);

create policy "anyone can insert user_logins"
  on user_logins for insert with check (true);

create policy "anyone can update user_logins"
  on user_logins for update using (true);
