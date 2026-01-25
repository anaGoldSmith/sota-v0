-- Add extra_value column to dbs_for_risks table
ALTER TABLE public.dbs_for_risks 
ADD COLUMN extra_value numeric DEFAULT NULL;

-- Update extra_value for rotations based on the pattern from the rotations table:
-- If value <= 0.2, extra_value = 0.1
-- If value > 0.2, extra_value = 0.2
UPDATE public.dbs_for_risks 
SET extra_value = CASE 
  WHEN value <= 0.2 THEN 0.1 
  ELSE 0.2 
END
WHERE db_group = 'Rotations';