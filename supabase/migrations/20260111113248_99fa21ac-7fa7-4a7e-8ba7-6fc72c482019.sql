-- Create prerecorded_risks table
CREATE TABLE public.prerecorded_risks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  risk_code TEXT NOT NULL,
  name TEXT NOT NULL,
  rotations_value NUMERIC,
  series TEXT,
  symbol_image TEXT
);

-- Enable RLS
ALTER TABLE public.prerecorded_risks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Prerecorded risks are viewable by everyone"
ON public.prerecorded_risks
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert prerecorded risks"
ON public.prerecorded_risks
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update prerecorded risks"
ON public.prerecorded_risks
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete prerecorded risks"
ON public.prerecorded_risks
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_prerecorded_risks_updated_at
BEFORE UPDATE ON public.prerecorded_risks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();