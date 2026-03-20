-- Already successfully applied the migration
alter table public.competitions
  add column if not exists leaderboard_settings jsonb not null default '{
    "result_max": 100,
    "scoring_method": "average",
    "minimum_ratings_threshold": 5
  }'::jsonb;
