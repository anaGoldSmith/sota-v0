-- Create hoop_bases table
CREATE TABLE public.hoop_bases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  value NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ball_bases table
CREATE TABLE public.ball_bases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  value NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clubs_bases table
CREATE TABLE public.clubs_bases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  value NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ribbon_bases table
CREATE TABLE public.ribbon_bases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  value NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.hoop_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ball_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ribbon_bases ENABLE ROW LEVEL SECURITY;

-- Create policies for hoop_bases
CREATE POLICY "Hoop bases are viewable by everyone" 
ON public.hoop_bases 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert hoop bases" 
ON public.hoop_bases 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update hoop bases" 
ON public.hoop_bases 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete hoop bases" 
ON public.hoop_bases 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policies for ball_bases
CREATE POLICY "Ball bases are viewable by everyone" 
ON public.ball_bases 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert ball bases" 
ON public.ball_bases 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update ball bases" 
ON public.ball_bases 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete ball bases" 
ON public.ball_bases 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policies for clubs_bases
CREATE POLICY "Clubs bases are viewable by everyone" 
ON public.clubs_bases 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert clubs bases" 
ON public.clubs_bases 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update clubs bases" 
ON public.clubs_bases 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete clubs bases" 
ON public.clubs_bases 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policies for ribbon_bases
CREATE POLICY "Ribbon bases are viewable by everyone" 
ON public.ribbon_bases 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert ribbon bases" 
ON public.ribbon_bases 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update ribbon bases" 
ON public.ribbon_bases 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete ribbon bases" 
ON public.ribbon_bases 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_hoop_bases_updated_at
BEFORE UPDATE ON public.hoop_bases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ball_bases_updated_at
BEFORE UPDATE ON public.ball_bases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clubs_bases_updated_at
BEFORE UPDATE ON public.clubs_bases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ribbon_bases_updated_at
BEFORE UPDATE ON public.ribbon_bases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();