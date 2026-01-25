-- Drop the old separate tables if they exist
DROP TABLE IF EXISTS public.jumps_dbs_for_risks;
DROP TABLE IF EXISTS public.rotations_dbs_for_risks;

-- Create a unified table for DBs for Risks
CREATE TABLE public.dbs_for_risks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  db_group TEXT NOT NULL,
  "group" TEXT,
  code TEXT NOT NULL,
  name TEXT,
  description TEXT,
  value NUMERIC,
  turn_degrees TEXT,
  symbol_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dbs_for_risks ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Anyone can read dbs_for_risks"
ON public.dbs_for_risks
FOR SELECT
USING (true);

-- Create policy for admin insert/update/delete
CREATE POLICY "Admins can manage dbs_for_risks"
ON public.dbs_for_risks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);