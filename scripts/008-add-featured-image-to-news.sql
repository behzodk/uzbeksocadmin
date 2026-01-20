-- Add featured image to news table
ALTER TABLE news ADD COLUMN IF NOT EXISTS featured_image TEXT;
