-- Update existing news statuses from sent -> published
UPDATE news SET status = 'published' WHERE status = 'sent';

-- Replace status check constraint to allow published
ALTER TABLE news DROP CONSTRAINT IF EXISTS news_status_check;
ALTER TABLE news DROP CONSTRAINT IF EXISTS newsletters_status_check;
ALTER TABLE news DROP CONSTRAINT IF EXISTS news_status_check1;

ALTER TABLE news
  ADD CONSTRAINT news_status_check
  CHECK (status IN ('draft', 'scheduled', 'published'));
