ALTER TABLE events ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private';

-- Update existing records based on status
UPDATE events SET visibility = 'public' WHERE status = 'published';
UPDATE events SET visibility = 'private' WHERE status IN ('draft', 'cancelled', 'completed');
