-- Create pre-acrobatic elements table
CREATE TABLE public.pre_acrobatic_elements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_code TEXT NOT NULL,
  group_name TEXT NOT NULL,
  name TEXT NOT NULL,
  level_change BOOLEAN NOT NULL DEFAULT false,
  two_bases_series BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pre_acrobatic_elements ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (everyone can view elements)
CREATE POLICY "Pre-acrobatic elements are viewable by everyone" 
ON public.pre_acrobatic_elements 
FOR SELECT 
USING (true);

-- Create policy for admin insert/update/delete
CREATE POLICY "Admins can manage pre-acrobatic elements" 
ON public.pre_acrobatic_elements 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pre_acrobatic_elements_updated_at
BEFORE UPDATE ON public.pre_acrobatic_elements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_pre_acrobatic_elements_group_code ON public.pre_acrobatic_elements(group_code);