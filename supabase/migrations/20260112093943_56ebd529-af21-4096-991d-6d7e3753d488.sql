-- Create table for Jumps DBs with Rotations/Turns for Risks
CREATE TABLE public.jumps_dbs_for_risks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  value NUMERIC,
  turn_degrees TEXT,
  symbol_image TEXT
);

-- Create table for Rotations DBs for Risks
CREATE TABLE public.rotations_dbs_for_risks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  value NUMERIC,
  turn_degrees TEXT,
  symbol_image TEXT
);

-- Enable RLS on both tables
ALTER TABLE public.jumps_dbs_for_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotations_dbs_for_risks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jumps_dbs_for_risks
CREATE POLICY "Jumps DBs for risks are viewable by everyone"
ON public.jumps_dbs_for_risks
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert jumps DBs for risks"
ON public.jumps_dbs_for_risks
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update jumps DBs for risks"
ON public.jumps_dbs_for_risks
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete jumps DBs for risks"
ON public.jumps_dbs_for_risks
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for rotations_dbs_for_risks
CREATE POLICY "Rotations DBs for risks are viewable by everyone"
ON public.rotations_dbs_for_risks
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert rotations DBs for risks"
ON public.rotations_dbs_for_risks
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update rotations DBs for risks"
ON public.rotations_dbs_for_risks
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete rotations DBs for risks"
ON public.rotations_dbs_for_risks
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at triggers
CREATE TRIGGER update_jumps_dbs_for_risks_updated_at
BEFORE UPDATE ON public.jumps_dbs_for_risks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rotations_dbs_for_risks_updated_at
BEFORE UPDATE ON public.rotations_dbs_for_risks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();