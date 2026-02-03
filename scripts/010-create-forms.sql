-- Ensure extension for gen_random_uuid()
create extension if not exists "pgcrypto";

-- forms table
create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  is_active boolean not null default true,
  schema jsonb not null,
  event_id uuid references public.events(id) on delete set null,
  created_at timestamptz not null default now()
);

-- form_submissions table
create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  status text not null default 'pending',
  answers jsonb not null,
  created_at timestamptz not null default now()
);

-- helpful indexes
create index if not exists forms_event_id_idx on public.forms(event_id);
create index if not exists form_submissions_form_id_idx on public.form_submissions(form_id);
create index if not exists form_submissions_status_idx on public.form_submissions(status);
