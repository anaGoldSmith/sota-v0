-- Add RLS policies for rulebooks table to allow admins to INSERT/UPDATE/DELETE
CREATE POLICY "Admins can insert rulebooks" ON public.rulebooks
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update rulebooks" ON public.rulebooks
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete rulebooks" ON public.rulebooks
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add RLS policies for storage.objects to allow admins to upload to rulebooks bucket
CREATE POLICY "Admins can upload rulebooks" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'rulebooks' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update rulebook files" ON storage.objects
FOR UPDATE 
TO authenticated
USING (bucket_id = 'rulebooks' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete rulebook files" ON storage.objects
FOR DELETE 
TO authenticated
USING (bucket_id = 'rulebooks' AND public.has_role(auth.uid(), 'admin'));