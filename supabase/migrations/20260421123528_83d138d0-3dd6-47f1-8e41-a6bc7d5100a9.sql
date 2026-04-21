INSERT INTO storage.buckets (id, name, public) VALUES ('apparatus-symbols', 'apparatus-symbols', true);

CREATE POLICY "Apparatus symbols are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'apparatus-symbols');

CREATE POLICY "Admins can upload apparatus symbols"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'apparatus-symbols' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update apparatus symbols"
ON storage.objects FOR UPDATE
USING (bucket_id = 'apparatus-symbols' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete apparatus symbols"
ON storage.objects FOR DELETE
USING (bucket_id = 'apparatus-symbols' AND has_role(auth.uid(), 'admin'::app_role));