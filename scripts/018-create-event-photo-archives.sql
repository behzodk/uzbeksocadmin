create extension if not exists "pgcrypto";

create table if not exists public.event_photo_archives (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  public_url text not null,
  asset_count integer not null check (asset_count > 0),
  file_size bigint,
  photo_asset_ids uuid[] not null default '{}'::uuid[],
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table public.event_photo_archives enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_photo_archives'
      and policyname = 'Allow all operations on event_photo_archives'
  ) then
    create policy "Allow all operations on event_photo_archives"
      on public.event_photo_archives
      for all
      using (true)
      with check (true);
  end if;
end $$;

create index if not exists event_photo_archives_event_id_idx on public.event_photo_archives(event_id);
create index if not exists event_photo_archives_created_at_idx on public.event_photo_archives(created_at desc);

insert into storage.buckets (id, name, public)
values ('event-photo-archives', 'event-photo-archives', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read event photo archives'
  ) then
    create policy "Public read event photo archives"
      on storage.objects
      for select
      using (bucket_id = 'event-photo-archives');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public upload event photo archives'
  ) then
    create policy "Public upload event photo archives"
      on storage.objects
      for insert
      with check (bucket_id = 'event-photo-archives');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public update event photo archives'
  ) then
    create policy "Public update event photo archives"
      on storage.objects
      for update
      using (bucket_id = 'event-photo-archives')
      with check (bucket_id = 'event-photo-archives');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public delete event photo archives'
  ) then
    create policy "Public delete event photo archives"
      on storage.objects
      for delete
      using (bucket_id = 'event-photo-archives');
  end if;
end $$;
