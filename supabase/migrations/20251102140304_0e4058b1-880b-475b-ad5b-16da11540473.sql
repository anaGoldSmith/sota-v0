-- Create unified difficulty apparatus (DA) elements table
CREATE TABLE IF NOT EXISTS public.da_elements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  apparatus_type TEXT NOT NULL CHECK (apparatus_type IN ('hoop', 'ball', 'clubs', 'ribbon')),
  code TEXT NOT NULL,
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
  "Cr6DB" BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(apparatus_type, code)
);

-- Enable RLS
ALTER TABLE public.da_elements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "DA elements are viewable by everyone"
  ON public.da_elements
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert DA elements"
  ON public.da_elements
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update DA elements"
  ON public.da_elements
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete DA elements"
  ON public.da_elements
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_da_elements_updated_at
  BEFORE UPDATE ON public.da_elements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing data from bases and control tables
-- Hoop
INSERT INTO public.da_elements (apparatus_type, code, name, description, value, symbol_image, "Cr1V", "Cr2H", "Cr3L", "Cr7R", "Cr4F", "Cr5W", "Cr6DB")
SELECT 
  'hoop' as apparatus_type,
  hb.code,
  hb.name,
  hb.description,
  hb.value,
  hb.symbol_image,
  COALESCE(hc."Cr1V" = 'Y', false) as "Cr1V",
  COALESCE(hc."Cr2H" = 'Y', false) as "Cr2H",
  COALESCE(hc."Cr3L" = 'Y', false) as "Cr3L",
  COALESCE(hc."Cr7R" = 'Y', false) as "Cr7R",
  COALESCE(hc."Cr4F" = 'Y', false) as "Cr4F",
  COALESCE(hc."Cr5W" = 'Y', false) as "Cr5W",
  COALESCE(hc."Cr6DB" = 'Y', false) as "Cr6DB"
FROM hoop_bases hb
LEFT JOIN hoop_control hc ON hb.code = hc.code;

-- Ball
INSERT INTO public.da_elements (apparatus_type, code, name, description, value, symbol_image, "Cr1V", "Cr2H", "Cr3L", "Cr7R", "Cr4F", "Cr5W", "Cr6DB")
SELECT 
  'ball' as apparatus_type,
  bb.code,
  bb.name,
  bb.description,
  bb.value,
  bb.symbol_image,
  COALESCE(bc."Cr1V" = 'Y', false) as "Cr1V",
  COALESCE(bc."Cr2H" = 'Y', false) as "Cr2H",
  COALESCE(bc."Cr3L" = 'Y', false) as "Cr3L",
  COALESCE(bc."Cr7R" = 'Y', false) as "Cr7R",
  COALESCE(bc."Cr4F" = 'Y', false) as "Cr4F",
  COALESCE(bc."Cr5W" = 'Y', false) as "Cr5W",
  COALESCE(bc."Cr6DB" = 'Y', false) as "Cr6DB"
FROM ball_bases bb
LEFT JOIN ball_control bc ON bb.code = bc.code;

-- Clubs
INSERT INTO public.da_elements (apparatus_type, code, name, description, value, symbol_image, "Cr1V", "Cr2H", "Cr3L", "Cr7R", "Cr4F", "Cr5W", "Cr6DB")
SELECT 
  'clubs' as apparatus_type,
  cb.code,
  cb.name,
  cb.description,
  cb.value,
  cb.symbol_image,
  COALESCE(cc."Cr1V" = 'Y', false) as "Cr1V",
  COALESCE(cc."Cr2H" = 'Y', false) as "Cr2H",
  COALESCE(cc."Cr3L" = 'Y', false) as "Cr3L",
  COALESCE(cc."Cr7R" = 'Y', false) as "Cr7R",
  COALESCE(cc."Cr4F" = 'Y', false) as "Cr4F",
  COALESCE(cc."Cr5W" = 'Y', false) as "Cr5W",
  COALESCE(cc."Cr6DB" = 'Y', false) as "Cr6DB"
FROM clubs_bases cb
LEFT JOIN clubs_control cc ON cb.code = cc.code;

-- Ribbon
INSERT INTO public.da_elements (apparatus_type, code, name, description, value, symbol_image, "Cr1V", "Cr2H", "Cr3L", "Cr7R", "Cr4F", "Cr5W", "Cr6DB")
SELECT 
  'ribbon' as apparatus_type,
  rb.code,
  rb.name,
  rb.description,
  rb.value,
  rb.symbol_image,
  COALESCE(rc."Cr1V" = 'Y', false) as "Cr1V",
  COALESCE(rc."Cr2H" = 'Y', false) as "Cr2H",
  COALESCE(rc."Cr3L" = 'Y', false) as "Cr3L",
  COALESCE(rc."Cr7R" = 'Y', false) as "Cr7R",
  COALESCE(rc."Cr4F" = 'Y', false) as "Cr4F",
  COALESCE(rc."Cr5W" = 'Y', false) as "Cr5W",
  COALESCE(rc."Cr6DB" = 'Y', false) as "Cr6DB"
FROM ribbon_bases rb
LEFT JOIN ribbon_control rc ON rb.code = rc.code;

-- Drop old tables
DROP TABLE IF EXISTS hoop_control CASCADE;
DROP TABLE IF EXISTS ball_control CASCADE;
DROP TABLE IF EXISTS clubs_control CASCADE;
DROP TABLE IF EXISTS ribbon_control CASCADE;
DROP TABLE IF EXISTS hoop_bases CASCADE;
DROP TABLE IF EXISTS ball_bases CASCADE;
DROP TABLE IF EXISTS clubs_bases CASCADE;
DROP TABLE IF EXISTS ribbon_bases CASCADE;