-- Create table for pre-recorded risk components
CREATE TABLE public.prerecorded_risk_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  risk_code TEXT NOT NULL,
  risk_component_code TEXT NOT NULL,
  description TEXT,
  value NUMERIC,
  symbol_image TEXT
);

-- Enable Row Level Security
ALTER TABLE public.prerecorded_risk_components ENABLE ROW LEVEL SECURITY;

-- Create policies for access
CREATE POLICY "Prerecorded risk components are viewable by everyone" 
ON public.prerecorded_risk_components 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert prerecorded risk components" 
ON public.prerecorded_risk_components 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update prerecorded risk components" 
ON public.prerecorded_risk_components 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete prerecorded risk components" 
ON public.prerecorded_risk_components 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_prerecorded_risk_components_updated_at
BEFORE UPDATE ON public.prerecorded_risk_components
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();