insert into storage.buckets (id, name, public)
values ('form-images', 'form-images', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read form images'
  ) then
    create policy "Public read form images"
      on storage.objects
      for select
      using (bucket_id = 'form-images');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public upload form images'
  ) then
    create policy "Public upload form images"
      on storage.objects
      for insert
      with check (bucket_id = 'form-images');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public update form images'
  ) then
    create policy "Public update form images"
      on storage.objects
      for update
      using (bucket_id = 'form-images')
      with check (bucket_id = 'form-images');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public delete form images'
  ) then
    create policy "Public delete form images"
      on storage.objects
      for delete
      using (bucket_id = 'form-images');
  end if;
end $$;
