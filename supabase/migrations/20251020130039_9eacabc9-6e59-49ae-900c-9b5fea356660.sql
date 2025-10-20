-- Add symbol_image column to all base tables
ALTER TABLE public.ball_bases ADD COLUMN symbol_image text;
ALTER TABLE public.hoop_bases ADD COLUMN symbol_image text;
ALTER TABLE public.clubs_bases ADD COLUMN symbol_image text;
ALTER TABLE public.ribbon_bases ADD COLUMN symbol_image text;

-- Create storage buckets for base symbols
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ball-bases-symbols', 'ball-bases-symbols', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('hoop-bases-symbols', 'hoop-bases-symbols', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('clubs-bases-symbols', 'clubs-bases-symbols', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('ribbon-bases-symbols', 'ribbon-bases-symbols', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for base symbols
CREATE POLICY "Base symbols are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id IN ('ball-bases-symbols', 'hoop-bases-symbols', 'clubs-bases-symbols', 'ribbon-bases-symbols'));

CREATE POLICY "Admins can upload base symbols" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id IN ('ball-bases-symbols', 'hoop-bases-symbols', 'clubs-bases-symbols', 'ribbon-bases-symbols')
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update base symbols" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id IN ('ball-bases-symbols', 'hoop-bases-symbols', 'clubs-bases-symbols', 'ribbon-bases-symbols')
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete base symbols" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id IN ('ball-bases-symbols', 'hoop-bases-symbols', 'clubs-bases-symbols', 'ribbon-bases-symbols')
  AND has_role(auth.uid(), 'admin'::app_role)
);