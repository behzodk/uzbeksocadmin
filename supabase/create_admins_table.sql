-- Create a table for managing admins
create table public.admins (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  roles jsonb not null default '{
    "super_admin": false,
    "form_access": false,
    "news_access": false,
    "events_access": false
  }'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.admins enable row level security;

-- Create policies (modify as needed based on auth requirements)
-- Allow read access to authenticated users (so the app can check if current user is admin)
create policy "Allow authenticated read access"
on public.admins for select
to authenticated
using (true);

-- Allow only super_admins to insert/update/delete (self-referencing logic might need function)
-- For now, maybe allow service role or specific setup.
-- Assuming initial setup is done manually or via seed.
