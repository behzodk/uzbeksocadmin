-- Already successfully applied the migration
create extension if not exists "pgcrypto";

alter table public.competitions
  add column if not exists entry_label text not null default 'Entry';

alter table public.competitions
  add column if not exists rating_criteria jsonb not null default '[]'::jsonb;

create table if not exists public.competition_entries (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  competitor_name text not null,
  competitor_email text,
  competitor_phone text,
  entry_name text not null,
  entry_description text,
  entry_image text,
  rating_public_id uuid not null default gen_random_uuid() unique,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.competition_entry_ratings (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.competition_entries(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  guest_name text,
  guest_email text,
  scores jsonb not null default '{}'::jsonb,
  total_score numeric(10, 2),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.competition_entries enable row level security;
alter table public.competition_entry_ratings enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'competition_entries'
      and policyname = 'Allow all operations on competition_entries'
  ) then
    create policy "Allow all operations on competition_entries"
      on public.competition_entries
      for all
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'competition_entry_ratings'
      and policyname = 'Allow all operations on competition_entry_ratings'
  ) then
    create policy "Allow all operations on competition_entry_ratings"
      on public.competition_entry_ratings
      for all
      using (true)
      with check (true);
  end if;
end $$;

create index if not exists competition_entries_competition_id_idx
  on public.competition_entries(competition_id);

create index if not exists competition_entries_rating_public_id_idx
  on public.competition_entries(rating_public_id);

create index if not exists competition_entry_ratings_entry_id_idx
  on public.competition_entry_ratings(entry_id);

create index if not exists competition_entry_ratings_competition_id_idx
  on public.competition_entry_ratings(competition_id);
