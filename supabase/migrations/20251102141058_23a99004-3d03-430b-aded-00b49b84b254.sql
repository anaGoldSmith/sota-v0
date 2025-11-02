-- Drop existing DA tables if they exist
DROP TABLE IF EXISTS public.hoop_da CASCADE;
DROP TABLE IF EXISTS public.ball_da CASCADE;
DROP TABLE IF EXISTS public.clubs_da CASCADE;
DROP TABLE IF EXISTS public.ribbon_da CASCADE;

-- Create separate DA tables for each apparatus type
CREATE TABLE public.hoop_da (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  value NUMERIC NOT NULL,
  symbol_image TEXT,
  "Cr1V" BOOLEAN NOT NULL DEFAULT false,
  "Cr2H" BOOLEAN NOT NULL DEFAULT false,
  "Cr3L" BOOLEAN NOT NULL DEFAULT false,
  "Cr7R" BOOLEAN NOT NULL DEFAULT false,
  "Cr4F" BOOLEAN NOT NULL DEFAULT false,
  "Cr5W" BOOLEAN NOT NULL DEFAULT false,
  "Cr6DB" BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE public.ball_da (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  value NUMERIC NOT NULL,
  symbol_image TEXT,
  "Cr1V" BOOLEAN NOT NULL DEFAULT false,
  "Cr2H" BOOLEAN NOT NULL DEFAULT false,
  "Cr3L" BOOLEAN NOT NULL DEFAULT false,
  "Cr7R" BOOLEAN NOT NULL DEFAULT false,
  "Cr4F" BOOLEAN NOT NULL DEFAULT false,
  "Cr5W" BOOLEAN NOT NULL DEFAULT false,
  "Cr6DB" BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE public.clubs_da (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  value NUMERIC NOT NULL,
  symbol_image TEXT,
  "Cr1V" BOOLEAN NOT NULL DEFAULT false,
  "Cr2H" BOOLEAN NOT NULL DEFAULT false,
  "Cr3L" BOOLEAN NOT NULL DEFAULT false,
  "Cr7R" BOOLEAN NOT NULL DEFAULT false,
  "Cr4F" BOOLEAN NOT NULL DEFAULT false,
  "Cr5W" BOOLEAN NOT NULL DEFAULT false,
  "Cr6DB" BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE public.ribbon_da (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  value NUMERIC NOT NULL,
  symbol_image TEXT,
  "Cr1V" BOOLEAN NOT NULL DEFAULT false,
  "Cr2H" BOOLEAN NOT NULL DEFAULT false,
  "Cr3L" BOOLEAN NOT NULL DEFAULT false,
  "Cr7R" BOOLEAN NOT NULL DEFAULT false,
  "Cr4F" BOOLEAN NOT NULL DEFAULT false,
  "Cr5W" BOOLEAN NOT NULL DEFAULT false,
  "Cr6DB" BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS on all tables
ALTER TABLE public.hoop_da ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ball_da ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs_da ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ribbon_da ENABLE ROW LEVEL SECURITY;

-- Create policies for hoop_da
CREATE POLICY "Hoop DA elements are viewable by everyone"
  ON public.hoop_da FOR SELECT USING (true);
CREATE POLICY "Admins can insert hoop DA"
  ON public.hoop_da FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update hoop DA"
  ON public.hoop_da FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete hoop DA"
  ON public.hoop_da FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policies for ball_da
CREATE POLICY "Ball DA elements are viewable by everyone"
  ON public.ball_da FOR SELECT USING (true);
CREATE POLICY "Admins can insert ball DA"
  ON public.ball_da FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update ball DA"
  ON public.ball_da FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete ball DA"
  ON public.ball_da FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policies for clubs_da
CREATE POLICY "Clubs DA elements are viewable by everyone"
  ON public.clubs_da FOR SELECT USING (true);
CREATE POLICY "Admins can insert clubs DA"
  ON public.clubs_da FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update clubs DA"
  ON public.clubs_da FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete clubs DA"
  ON public.clubs_da FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policies for ribbon_da
CREATE POLICY "Ribbon DA elements are viewable by everyone"
  ON public.ribbon_da FOR SELECT USING (true);
CREATE POLICY "Admins can insert ribbon DA"
  ON public.ribbon_da FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update ribbon DA"
  ON public.ribbon_da FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete ribbon DA"
  ON public.ribbon_da FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_hoop_da_updated_at
  BEFORE UPDATE ON public.hoop_da
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ball_da_updated_at
  BEFORE UPDATE ON public.ball_da
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clubs_da_updated_at
  BEFORE UPDATE ON public.clubs_da
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ribbon_da_updated_at
  BEFORE UPDATE ON public.ribbon_da
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate data from unified table to separate tables (if da_elements exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'da_elements') THEN
    INSERT INTO public.hoop_da (id, created_at, updated_at, code, name, description, value, symbol_image, "Cr1V", "Cr2H", "Cr3L", "Cr7R", "Cr4F", "Cr5W", "Cr6DB")
    SELECT id, created_at, updated_at, code, name, description, value, symbol_image, "Cr1V", "Cr2H", "Cr3L", "Cr7R", "Cr4F", "Cr5W", "Cr6DB"
    FROM da_elements WHERE apparatus_type = 'hoop';

    INSERT INTO public.ball_da (id, created_at, updated_at, code, name, description, value, symbol_image, "Cr1V", "Cr2H", "Cr3L", "Cr7R", "Cr4F", "Cr5W", "Cr6DB")
    SELECT id, created_at, updated_at, code, name, description, value, symbol_image, "Cr1V", "Cr2H", "Cr3L", "Cr7R", "Cr4F", "Cr5W", "Cr6DB"
    FROM da_elements WHERE apparatus_type = 'ball';

    INSERT INTO public.clubs_da (id, created_at, updated_at, code, name, description, value, symbol_image, "Cr1V", "Cr2H", "Cr3L", "Cr7R", "Cr4F", "Cr5W", "Cr6DB")
    SELECT id, created_at, updated_at, code, name, description, value, symbol_image, "Cr1V", "Cr2H", "Cr3L", "Cr7R", "Cr4F", "Cr5W", "Cr6DB"
    FROM da_elements WHERE apparatus_type = 'clubs';

    INSERT INTO public.ribbon_da (id, created_at, updated_at, code, name, description, value, symbol_image, "Cr1V", "Cr2H", "Cr3L", "Cr7R", "Cr4F", "Cr5W", "Cr6DB")
    SELECT id, created_at, updated_at, code, name, description, value, symbol_image, "Cr1V", "Cr2H", "Cr3L", "Cr7R", "Cr4F", "Cr5W", "Cr6DB"
    FROM da_elements WHERE apparatus_type = 'ribbon';
    
    DROP TABLE da_elements CASCADE;
  END IF;
END
$$;