-- Create storage buckets for technical elements symbols
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('hoop-technical-elements-symbols', 'hoop-technical-elements-symbols', true),
  ('ball-technical-elements-symbols', 'ball-technical-elements-symbols', true),
  ('clubs-technical-elements-symbols', 'clubs-technical-elements-symbols', true),
  ('ribbon-technical-elements-symbols', 'ribbon-technical-elements-symbols', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for hoop technical elements symbols
CREATE POLICY "Hoop TE symbols are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'hoop-technical-elements-symbols');

CREATE POLICY "Admins can upload hoop TE symbols" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'hoop-technical-elements-symbols' AND (SELECT has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can update hoop TE symbols" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'hoop-technical-elements-symbols' AND (SELECT has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can delete hoop TE symbols" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'hoop-technical-elements-symbols' AND (SELECT has_role(auth.uid(), 'admin'::app_role)));

-- Create policies for ball technical elements symbols
CREATE POLICY "Ball TE symbols are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'ball-technical-elements-symbols');

CREATE POLICY "Admins can upload ball TE symbols" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'ball-technical-elements-symbols' AND (SELECT has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can update ball TE symbols" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'ball-technical-elements-symbols' AND (SELECT has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can delete ball TE symbols" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'ball-technical-elements-symbols' AND (SELECT has_role(auth.uid(), 'admin'::app_role)));

-- Create policies for clubs technical elements symbols
CREATE POLICY "Clubs TE symbols are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'clubs-technical-elements-symbols');

CREATE POLICY "Admins can upload clubs TE symbols" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'clubs-technical-elements-symbols' AND (SELECT has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can update clubs TE symbols" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'clubs-technical-elements-symbols' AND (SELECT has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can delete clubs TE symbols" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'clubs-technical-elements-symbols' AND (SELECT has_role(auth.uid(), 'admin'::app_role)));

-- Create policies for ribbon technical elements symbols
CREATE POLICY "Ribbon TE symbols are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'ribbon-technical-elements-symbols');

CREATE POLICY "Admins can upload ribbon TE symbols" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'ribbon-technical-elements-symbols' AND (SELECT has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can update ribbon TE symbols" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'ribbon-technical-elements-symbols' AND (SELECT has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can delete ribbon TE symbols" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'ribbon-technical-elements-symbols' AND (SELECT has_role(auth.uid(), 'admin'::app_role)));