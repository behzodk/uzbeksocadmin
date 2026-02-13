-- Create a function to sync admin roles to auth.users
create or replace function public.sync_admin_roles()
returns trigger as $$
begin
  update auth.users
  set raw_app_meta_data = 
    jsonb_set(
      coalesce(raw_app_meta_data, '{}'::jsonb),
      '{roles}',
      to_jsonb(new.roles)
    )
  where email = new.email;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to sync roles when an admin is created or updated
drop trigger if exists on_admin_change on public.admins;
create trigger on_admin_change
  after insert or update of roles, email on public.admins
  for each row execute procedure public.sync_admin_roles();

-- Function to handle new user sign-ups (if they are already in the admins table)
create or replace function public.handle_new_user_roles()
returns trigger as $$
declare
  admin_roles jsonb;
begin
  select to_jsonb(roles) into admin_roles
  from public.admins
  where email = new.email;

  if admin_roles is not null then
    new.raw_app_meta_data = 
      jsonb_set(
        coalesce(new.raw_app_meta_data, '{}'::jsonb),
        '{roles}',
        admin_roles
      );
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to sync roles when a new user signs up
drop trigger if exists on_auth_user_created_sync_roles on auth.users;
create trigger on_auth_user_created_sync_roles
  before insert on auth.users
  for each row execute procedure public.handle_new_user_roles();
