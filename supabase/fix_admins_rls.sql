-- Allow authenticated users to insert, update, and delete on admins table
-- This is necessary for the initial admin creation flow via the dashboard
create policy "Allow authenticated insert access"
on public.admins for insert
to authenticated
using (true)
with check (true);

create policy "Allow authenticated update access"
on public.admins for update
to authenticated
using (true);

create policy "Allow authenticated delete access"
on public.admins for delete
to authenticated
using (true);
