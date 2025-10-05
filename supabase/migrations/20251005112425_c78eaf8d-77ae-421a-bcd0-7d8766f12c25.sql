-- Create storage bucket for jump symbols
INSERT INTO storage.buckets (id, name, public)
VALUES ('jump-symbols', 'jump-symbols', true);

-- Allow anyone to view jump symbol images
CREATE POLICY "Jump symbols are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'jump-symbols');

-- Allow admins to upload jump symbols
CREATE POLICY "Admins can upload jump symbols"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'jump-symbols' AND has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update jump symbols
CREATE POLICY "Admins can update jump symbols"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'jump-symbols' AND has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete jump symbols
CREATE POLICY "Admins can delete jump symbols"
ON storage.objects
FOR DELETE
USING (bucket_id = 'jump-symbols' AND has_role(auth.uid(), 'admin'::app_role));