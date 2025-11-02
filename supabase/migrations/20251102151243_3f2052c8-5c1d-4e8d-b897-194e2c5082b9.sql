-- Remove symbol_image column from all DA tables
ALTER TABLE public.hoop_da DROP COLUMN IF EXISTS symbol_image;
ALTER TABLE public.ball_da DROP COLUMN IF EXISTS symbol_image;
ALTER TABLE public.clubs_da DROP COLUMN IF EXISTS symbol_image;
ALTER TABLE public.ribbon_da DROP COLUMN IF EXISTS symbol_image;