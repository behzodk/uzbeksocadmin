create extension if not exists "pgcrypto";

create table if not exists public.event_photo_assets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  public_url text not null,
  mime_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

alter table public.event_photo_assets enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_photo_assets'
      and policyname = 'Allow all operations on event_photo_assets'
  ) then
    create policy "Allow all operations on event_photo_assets"
      on public.event_photo_assets
      for all
      using (true)
      with check (true);
  end if;
end $$;

create index if not exists event_photo_assets_event_id_idx on public.event_photo_assets(event_id);
create index if not exists event_photo_assets_created_at_idx on public.event_photo_assets(created_at desc);
-- Files are stored in Cloudflare R2. This table keeps only the asset metadata in Supabase.
