-- Create criteria table
CREATE TABLE public.criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  symbol_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.criteria ENABLE ROW LEVEL SECURITY;

-- Create policies for criteria
CREATE POLICY "Criteria are viewable by everyone" 
ON public.criteria 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert criteria" 
ON public.criteria 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update criteria" 
ON public.criteria 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete criteria" 
ON public.criteria 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_criteria_updated_at
BEFORE UPDATE ON public.criteria
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();