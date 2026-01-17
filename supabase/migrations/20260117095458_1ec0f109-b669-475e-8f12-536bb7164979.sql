-- Add extra_value column to rotations table
ALTER TABLE public.rotations 
ADD COLUMN extra_value numeric NULL;