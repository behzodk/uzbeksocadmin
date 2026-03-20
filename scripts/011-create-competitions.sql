-- Already successfully applied the migration
create extension if not exists "pgcrypto";

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  slug text unique,
  content_html text,
  location text,
  start_date timestamptz not null,
  end_date timestamptz,
  registration_deadline timestamptz,
  capacity integer,
  prize text,
  featured_image text,
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled', 'completed')),
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.competitions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'competitions'
      and policyname = 'Allow all operations on competitions'
  ) then
    create policy "Allow all operations on competitions"
      on public.competitions
      for all
      using (true)
      with check (true);
  end if;
end $$;

create index if not exists competitions_slug_idx on public.competitions(slug);
create index if not exists competitions_start_date_idx on public.competitions(start_date);
create index if not exists competitions_registration_deadline_idx on public.competitions(registration_deadline);
