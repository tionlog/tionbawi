begin;

create table if not exists public."tionbawi comm" (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 30),
  message text not null check (char_length(btrim(message)) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists tionbawi_comm_created_at_idx on public."tionbawi comm" (created_at desc);
alter table public."tionbawi comm" enable row level security;
revoke all on public."tionbawi comm" from anon, authenticated;
grant select, insert on public."tionbawi comm" to anon, authenticated;

drop policy if exists "Public can read comments" on public."tionbawi comm";
create policy "Public can read comments" on public."tionbawi comm"
  for select to anon, authenticated using (true);

drop policy if exists "Public can add comments" on public."tionbawi comm";
create policy "Public can add comments" on public."tionbawi comm"
  for insert to anon, authenticated
  with check (char_length(btrim(name)) between 1 and 30 and char_length(btrim(message)) between 1 and 300);

notify pgrst, 'reload schema';
commit;
