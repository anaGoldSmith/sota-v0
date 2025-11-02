-- Add symbol_image column to bases tables
ALTER TABLE ball_bases ADD COLUMN IF NOT EXISTS symbol_image TEXT;
ALTER TABLE hoop_bases ADD COLUMN IF NOT EXISTS symbol_image TEXT;
ALTER TABLE clubs_bases ADD COLUMN IF NOT EXISTS symbol_image TEXT;
ALTER TABLE ribbon_bases ADD COLUMN IF NOT EXISTS symbol_image TEXT;