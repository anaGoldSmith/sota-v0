-- Fix extra_value for rotation 3.1105 to be 0.1 (exception case)
UPDATE public.dbs_for_risks 
SET extra_value = 0.1 
WHERE code = '3.1105' AND db_group = 'Rotations';