alter table public.competitions
  add column if not exists featured_image_path text;

alter table public.competition_entries
  add column if not exists entry_image_path text;

insert into storage.buckets (id, name, public)
values ('competition-images', 'competition-images', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read competition images'
  ) then
    create policy "Public read competition images"
      on storage.objects
      for select
      using (bucket_id = 'competition-images');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public upload competition images'
  ) then
    create policy "Public upload competition images"
      on storage.objects
      for insert
      with check (bucket_id = 'competition-images');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public update competition images'
  ) then
    create policy "Public update competition images"
      on storage.objects
      for update
      using (bucket_id = 'competition-images')
      with check (bucket_id = 'competition-images');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public delete competition images'
  ) then
    create policy "Public delete competition images"
      on storage.objects
      for delete
      using (bucket_id = 'competition-images');
  end if;
end $$;
