-- Add symbol_image column to dynamic_catches
ALTER TABLE public.dynamic_catches 
ADD COLUMN symbol_image text;

-- Add symbol_image column to dynamic_throws
ALTER TABLE public.dynamic_throws 
ADD COLUMN symbol_image text;

-- Add symbol_image column to dynamic_general_criteria
ALTER TABLE public.dynamic_general_criteria 
ADD COLUMN symbol_image text;

-- Create storage bucket for dynamic element symbols
INSERT INTO storage.buckets (id, name, public)
VALUES ('dynamic-element-symbols', 'dynamic-element-symbols', true);

-- Create storage policies for dynamic element symbols
CREATE POLICY "Dynamic element symbols are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'dynamic-element-symbols');

CREATE POLICY "Admins can upload dynamic element symbols"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'dynamic-element-symbols' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update dynamic element symbols"
ON storage.objects FOR UPDATE
USING (bucket_id = 'dynamic-element-symbols' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete dynamic element symbols"
ON storage.objects FOR DELETE
USING (bucket_id = 'dynamic-element-symbols' AND has_role(auth.uid(), 'admin'::app_role));