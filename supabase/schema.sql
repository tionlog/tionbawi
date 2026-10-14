begin;

create table if not exists public.suhsih_comments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 30),
  message text not null check (char_length(btrim(message)) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists suhsih_comments_created_at_idx on public.suhsih_comments (created_at desc);
alter table public.suhsih_comments enable row level security;
revoke all on public.suhsih_comments from anon, authenticated;
grant select, insert on public.suhsih_comments to anon, authenticated;

drop policy if exists "Public can read comments" on public.suhsih_comments;
create policy "Public can read comments" on public.suhsih_comments
  for select to anon, authenticated using (true);

drop policy if exists "Public can add comments" on public.suhsih_comments;
create policy "Public can add comments" on public.suhsih_comments
  for insert to anon, authenticated
  with check (char_length(btrim(name)) between 1 and 30 and char_length(btrim(message)) between 1 and 300);

notify pgrst, 'reload schema';
commit;
