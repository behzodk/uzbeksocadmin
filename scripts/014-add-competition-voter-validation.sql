-- Already successfully applied the migration
alter table public.competitions
  add column if not exists voter_validation_settings jsonb not null default '{
    "rating_identity_field": "guest_email",
    "eligibility_form_id": null,
    "eligibility_form_field_key": null
  }'::jsonb;

alter table public.competition_entry_ratings
  add column if not exists voter_identity text;

update public.competition_entry_ratings
set voter_identity = lower(btrim(guest_email))
where voter_identity is null
  and nullif(btrim(coalesce(guest_email, '')), '') is not null;

create index if not exists competition_entry_ratings_voter_identity_idx
  on public.competition_entry_ratings(voter_identity);

create unique index if not exists competition_entry_ratings_entry_voter_identity_unique
  on public.competition_entry_ratings(entry_id, voter_identity)
  where voter_identity is not null;

create or replace function public.validate_competition_entry_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  validation_settings jsonb;
  eligibility_form_id uuid;
  eligibility_field_key text;
  normalized_email text;
  entry_competition_id uuid;
  matching_submission_exists boolean;
begin
  select competition_id
  into entry_competition_id
  from public.competition_entries
  where id = new.entry_id;

  if entry_competition_id is null then
    raise exception 'Invalid competition entry.';
  end if;

  if new.competition_id is distinct from entry_competition_id then
    raise exception 'Rating entry and competition do not match.';
  end if;

  select voter_validation_settings
  into validation_settings
  from public.competitions
  where id = new.competition_id;

  normalized_email := nullif(lower(btrim(coalesce(new.guest_email, ''))), '');

  if normalized_email is null then
    raise exception 'Email is required to submit a rating.';
  end if;

  new.guest_email := normalized_email;
  new.voter_identity := normalized_email;

  if exists (
    select 1
    from public.competition_entry_ratings existing_rating
    where existing_rating.entry_id = new.entry_id
      and existing_rating.voter_identity = normalized_email
      and (tg_op = 'INSERT' or existing_rating.id <> new.id)
  ) then
    raise exception 'This email has already rated this entry.';
  end if;

  eligibility_form_id := nullif(validation_settings ->> 'eligibility_form_id', '')::uuid;
  eligibility_field_key := nullif(btrim(coalesce(validation_settings ->> 'eligibility_form_field_key', '')), '');

  if eligibility_form_id is not null and eligibility_field_key is not null then
    select exists (
      select 1
      from public.form_submissions submission
      where submission.form_id = eligibility_form_id
        and nullif(lower(btrim(coalesce(submission.answers ->> eligibility_field_key, ''))), '') = normalized_email
    )
    into matching_submission_exists;

    if not matching_submission_exists then
      raise exception 'This email is not eligible to vote for this competition.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_competition_entry_rating_before_write
  on public.competition_entry_ratings;

create trigger validate_competition_entry_rating_before_write
before insert or update on public.competition_entry_ratings
for each row
execute function public.validate_competition_entry_rating();
