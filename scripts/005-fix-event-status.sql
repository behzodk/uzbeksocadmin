-- Drop the old check constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

-- Update existing statuses to match new schema
UPDATE events SET status = 'published' WHERE status IN ('upcoming', 'ongoing');
UPDATE events SET status = 'draft' WHERE status NOT IN ('published', 'cancelled', 'completed');

-- Add new check constraint
ALTER TABLE events ADD CONSTRAINT events_status_check 
  CHECK (status IN ('draft', 'published', 'cancelled', 'completed'));

-- Set default value to 'draft'
ALTER TABLE events ALTER COLUMN status SET DEFAULT 'draft';
