-- Create gymnast-icons storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('gymnast-icons', 'gymnast-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Gymnast icons are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'gymnast-icons');

-- Admin upload
CREATE POLICY "Admins can upload gymnast icons"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'gymnast-icons' AND has_role(auth.uid(), 'admin'::app_role));

-- Admin update
CREATE POLICY "Admins can update gymnast icons"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'gymnast-icons' AND has_role(auth.uid(), 'admin'::app_role));

-- Admin delete
CREATE POLICY "Admins can delete gymnast icons"
ON storage.objects
FOR DELETE
USING (bucket_id = 'gymnast-icons' AND has_role(auth.uid(), 'admin'::app_role));