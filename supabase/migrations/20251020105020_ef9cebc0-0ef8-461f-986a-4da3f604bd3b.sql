-- Create storage bucket for criteria symbols
INSERT INTO storage.buckets (id, name, public) 
VALUES ('criteria-symbols', 'criteria-symbols', true);

-- Create RLS policies for criteria-symbols bucket
CREATE POLICY "Criteria symbol images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'criteria-symbols');

CREATE POLICY "Admins can upload criteria symbols" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'criteria-symbols' 
  AND (SELECT public.has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins can update criteria symbols" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'criteria-symbols' 
  AND (SELECT public.has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins can delete criteria symbols" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'criteria-symbols' 
  AND (SELECT public.has_role(auth.uid(), 'admin'::app_role))
);