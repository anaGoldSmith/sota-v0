-- Create table for specific throw variations for Risk construction
CREATE TABLE public.r_throws_specific (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  apparatus TEXT NOT NULL, -- H, B, CL, R, all, H&B, etc.
  symbol_image TEXT
);

-- Enable Row Level Security
ALTER TABLE public.r_throws_specific ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "R throws specific are viewable by everyone" 
ON public.r_throws_specific 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert r throws specific" 
ON public.r_throws_specific 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update r throws specific" 
ON public.r_throws_specific 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete r throws specific" 
ON public.r_throws_specific 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_r_throws_specific_updated_at
BEFORE UPDATE ON public.r_throws_specific
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();