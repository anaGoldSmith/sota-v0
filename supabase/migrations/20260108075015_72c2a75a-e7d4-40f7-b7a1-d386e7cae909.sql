-- Create table for dynamic element catches
CREATE TABLE public.dynamic_catches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  apparatus TEXT NOT NULL,
  extra_criteria TEXT,
  name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for dynamic element throws
CREATE TABLE public.dynamic_throws (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  apparatus TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for dynamic general criteria
CREATE TABLE public.dynamic_general_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.dynamic_catches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_throws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_general_criteria ENABLE ROW LEVEL SECURITY;

-- RLS policies for dynamic_catches
CREATE POLICY "Dynamic catches are viewable by everyone" 
ON public.dynamic_catches FOR SELECT USING (true);

CREATE POLICY "Admins can insert dynamic catches" 
ON public.dynamic_catches FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update dynamic catches" 
ON public.dynamic_catches FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete dynamic catches" 
ON public.dynamic_catches FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for dynamic_throws
CREATE POLICY "Dynamic throws are viewable by everyone" 
ON public.dynamic_throws FOR SELECT USING (true);

CREATE POLICY "Admins can insert dynamic throws" 
ON public.dynamic_throws FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update dynamic throws" 
ON public.dynamic_throws FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete dynamic throws" 
ON public.dynamic_throws FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for dynamic_general_criteria
CREATE POLICY "Dynamic general criteria are viewable by everyone" 
ON public.dynamic_general_criteria FOR SELECT USING (true);

CREATE POLICY "Admins can insert dynamic general criteria" 
ON public.dynamic_general_criteria FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update dynamic general criteria" 
ON public.dynamic_general_criteria FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete dynamic general criteria" 
ON public.dynamic_general_criteria FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_dynamic_catches_updated_at
BEFORE UPDATE ON public.dynamic_catches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dynamic_throws_updated_at
BEFORE UPDATE ON public.dynamic_throws
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dynamic_general_criteria_updated_at
BEFORE UPDATE ON public.dynamic_general_criteria
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();