-- Add symbol_image column to technical elements tables
ALTER TABLE public.hoop_technical_elements 
ADD COLUMN IF NOT EXISTS symbol_image text;

ALTER TABLE public.ball_technical_elements 
ADD COLUMN IF NOT EXISTS symbol_image text;

ALTER TABLE public.clubs_technical_elements 
ADD COLUMN IF NOT EXISTS symbol_image text;

ALTER TABLE public.ribbon_technical_elements 
ADD COLUMN IF NOT EXISTS symbol_image text;