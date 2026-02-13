-- Migration to update existing admin roles to granular structure

-- Function to migrate a single roles JSONB object
create or replace function public.migrate_role_structure(old_roles jsonb)
returns jsonb as $$
declare
  new_roles jsonb;
begin
  -- Initialize new structure with super_admin (assumed boolean or null)
  new_roles := jsonb_build_object(
    'super_admin', coalesce((old_roles->>'super_admin')::boolean, false),
    'forms', jsonb_build_object(
      'read', coalesce((old_roles->>'form_access')::boolean, false),
      'create', coalesce((old_roles->>'form_access')::boolean, false),
      'update', coalesce((old_roles->>'form_access')::boolean, false),
      'delete', coalesce((old_roles->>'form_access')::boolean, false)
    ),
    'news', jsonb_build_object(
      'read', coalesce((old_roles->>'news_access')::boolean, false),
      'create', coalesce((old_roles->>'news_access')::boolean, false),
      'update', coalesce((old_roles->>'news_access')::boolean, false),
      'delete', coalesce((old_roles->>'news_access')::boolean, false)
    ),
    'events', jsonb_build_object(
      'read', coalesce((old_roles->>'events_access')::boolean, false),
      'create', coalesce((old_roles->>'events_access')::boolean, false),
      'update', coalesce((old_roles->>'events_access')::boolean, false),
      'delete', coalesce((old_roles->>'events_access')::boolean, false)
    )
  );

  return new_roles;
end;
$$ language plpgsql;

-- Update all admins with the new structure
-- Only update if the structure looks old (e.g., has 'form_access' key)
update public.admins
set roles = public.migrate_role_structure(roles)
where roles ? 'form_access';

-- Drop the helper function
drop function public.migrate_role_structure(jsonb);

-- Force sync to update auth.users metadata
update public.admins set email = email;
