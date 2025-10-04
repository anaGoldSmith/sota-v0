-- Storage policies for rulebooks bucket

-- Allow admins to delete files from rulebooks bucket
CREATE POLICY "Admins can delete rulebooks files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'rulebooks' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to insert files to rulebooks bucket  
CREATE POLICY "Admins can upload rulebooks files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'rulebooks'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update files in rulebooks bucket
CREATE POLICY "Admins can update rulebooks files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'rulebooks'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow everyone to view files in rulebooks bucket (bucket is public)
CREATE POLICY "Everyone can view rulebooks files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'rulebooks');