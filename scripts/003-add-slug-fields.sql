-- Add slug fields to events and newsletters tables
ALTER TABLE events ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Add content_html field for rich HTML content
ALTER TABLE events ADD COLUMN IF NOT EXISTS content_html TEXT;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS content_html TEXT;

-- Add featured_image for events
ALTER TABLE events ADD COLUMN IF NOT EXISTS featured_image TEXT;

-- Update existing records with auto-generated slugs
UPDATE events SET slug = LOWER(REPLACE(REPLACE(title, ' ', '-'), '''', '')) WHERE slug IS NULL;
UPDATE newsletters SET slug = LOWER(REPLACE(REPLACE(subject, ' ', '-'), '''', '')) WHERE slug IS NULL;

-- Create indexes for slug lookups
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_newsletters_slug ON newsletters(slug);
