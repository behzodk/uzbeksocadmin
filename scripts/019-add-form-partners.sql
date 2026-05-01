alter table public.forms
add column if not exists partners jsonb not null default '[]'::jsonb;
