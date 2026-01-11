-- Remove series column and rename rotations_value to total_value
ALTER TABLE public.prerecorded_risks DROP COLUMN IF EXISTS series;
ALTER TABLE public.prerecorded_risks RENAME COLUMN rotations_value TO total_value;