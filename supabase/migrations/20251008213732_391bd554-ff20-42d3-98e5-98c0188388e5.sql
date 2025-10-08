-- Create balances table
CREATE TABLE public.balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT,
  description TEXT NOT NULL,
  value NUMERIC NOT NULL,
  symbol_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

-- Create policies for balances
CREATE POLICY "Balances are viewable by everyone" 
ON public.balances 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert balances" 
ON public.balances 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update balances" 
ON public.balances 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete balances" 
ON public.balances 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for balances timestamps
CREATE TRIGGER update_balances_updated_at
BEFORE UPDATE ON public.balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create rotations table
CREATE TABLE public.rotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT,
  description TEXT NOT NULL,
  value NUMERIC NOT NULL,
  turn_degrees TEXT,
  symbol_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rotations ENABLE ROW LEVEL SECURITY;

-- Create policies for rotations
CREATE POLICY "Rotations are viewable by everyone" 
ON public.rotations 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert rotations" 
ON public.rotations 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update rotations" 
ON public.rotations 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete rotations" 
ON public.rotations 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for rotations timestamps
CREATE TRIGGER update_rotations_updated_at
BEFORE UPDATE ON public.rotations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();