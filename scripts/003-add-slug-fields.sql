-- Add slug fields to events and news tables
ALTER TABLE events ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE news ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Add content_html field for rich HTML content
ALTER TABLE events ADD COLUMN IF NOT EXISTS content_html TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS content_html TEXT;

-- Add featured_image for events
ALTER TABLE events ADD COLUMN IF NOT EXISTS featured_image TEXT;

-- Update existing records with auto-generated slugs
UPDATE events SET slug = LOWER(REPLACE(REPLACE(title, ' ', '-'), '''', '')) WHERE slug IS NULL;
UPDATE news SET slug = LOWER(REPLACE(REPLACE(subject, ' ', '-'), '''', '')) WHERE slug IS NULL;

-- Create indexes for slug lookups
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_newsletters_slug ON news(slug);
