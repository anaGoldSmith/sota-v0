-- Add value column to dynamic_throws
ALTER TABLE public.dynamic_throws ADD COLUMN value numeric;

-- Add value column to dynamic_catches  
ALTER TABLE public.dynamic_catches ADD COLUMN value numeric;

-- Add value column to dynamic_general_criteria
ALTER TABLE public.dynamic_general_criteria ADD COLUMN value numeric;

-- Clean up existing data from all three tables
DELETE FROM public.dynamic_throws WHERE id IS NOT NULL;
DELETE FROM public.dynamic_catches WHERE id IS NOT NULL;
DELETE FROM public.dynamic_general_criteria WHERE id IS NOT NULL;