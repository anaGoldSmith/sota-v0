-- Add symbol_image column to technical elements tables
ALTER TABLE ball_technical_elements ADD COLUMN IF NOT EXISTS symbol_image TEXT;
ALTER TABLE hoop_technical_elements ADD COLUMN IF NOT EXISTS symbol_image TEXT;
ALTER TABLE clubs_technical_elements ADD COLUMN IF NOT EXISTS symbol_image TEXT;
ALTER TABLE ribbon_technical_elements ADD COLUMN IF NOT EXISTS symbol_image TEXT;