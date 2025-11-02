-- Create technical elements tables for each apparatus type
CREATE TABLE public.hoop_technical_elements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  parent_group TEXT NOT NULL,
  parent_group_code TEXT NOT NULL,
  technical_element BOOLEAN NOT NULL DEFAULT false,
  da BOOLEAN NOT NULL DEFAULT false,
  special_code BOOLEAN NOT NULL DEFAULT false,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  data_information_about_te TEXT
);

CREATE TABLE public.ball_technical_elements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  parent_group TEXT NOT NULL,
  parent_group_code TEXT NOT NULL,
  technical_element BOOLEAN NOT NULL DEFAULT false,
  da BOOLEAN NOT NULL DEFAULT false,
  special_code BOOLEAN NOT NULL DEFAULT false,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  data_information_about_te TEXT
);

CREATE TABLE public.clubs_technical_elements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  parent_group TEXT NOT NULL,
  parent_group_code TEXT NOT NULL,
  technical_element BOOLEAN NOT NULL DEFAULT false,
  da BOOLEAN NOT NULL DEFAULT false,
  special_code BOOLEAN NOT NULL DEFAULT false,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  data_information_about_te TEXT
);

CREATE TABLE public.ribbon_technical_elements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  parent_group TEXT NOT NULL,
  parent_group_code TEXT NOT NULL,
  technical_element BOOLEAN NOT NULL DEFAULT false,
  da BOOLEAN NOT NULL DEFAULT false,
  special_code BOOLEAN NOT NULL DEFAULT false,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  data_information_about_te TEXT
);

-- Enable RLS on all technical elements tables
ALTER TABLE public.hoop_technical_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ball_technical_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs_technical_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ribbon_technical_elements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for hoop_technical_elements
CREATE POLICY "Hoop technical elements are viewable by everyone"
ON public.hoop_technical_elements
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert hoop technical elements"
ON public.hoop_technical_elements
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update hoop technical elements"
ON public.hoop_technical_elements
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete hoop technical elements"
ON public.hoop_technical_elements
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for ball_technical_elements
CREATE POLICY "Ball technical elements are viewable by everyone"
ON public.ball_technical_elements
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert ball technical elements"
ON public.ball_technical_elements
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update ball technical elements"
ON public.ball_technical_elements
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete ball technical elements"
ON public.ball_technical_elements
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for clubs_technical_elements
CREATE POLICY "Clubs technical elements are viewable by everyone"
ON public.clubs_technical_elements
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert clubs technical elements"
ON public.clubs_technical_elements
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update clubs technical elements"
ON public.clubs_technical_elements
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete clubs technical elements"
ON public.clubs_technical_elements
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for ribbon_technical_elements
CREATE POLICY "Ribbon technical elements are viewable by everyone"
ON public.ribbon_technical_elements
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert ribbon technical elements"
ON public.ribbon_technical_elements
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update ribbon technical elements"
ON public.ribbon_technical_elements
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete ribbon technical elements"
ON public.ribbon_technical_elements
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_hoop_technical_elements_updated_at
BEFORE UPDATE ON public.hoop_technical_elements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ball_technical_elements_updated_at
BEFORE UPDATE ON public.ball_technical_elements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clubs_technical_elements_updated_at
BEFORE UPDATE ON public.clubs_technical_elements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ribbon_technical_elements_updated_at
BEFORE UPDATE ON public.ribbon_technical_elements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();