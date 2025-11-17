-- First delete all objects from the base symbol buckets
DELETE FROM storage.objects 
WHERE bucket_id IN (
  'ball-bases-symbols',
  'hoop-bases-symbols', 
  'clubs-bases-symbols',
  'ribbon-bases-symbols'
);

-- Then delete the buckets themselves
DELETE FROM storage.buckets 
WHERE id IN (
  'ball-bases-symbols',
  'hoop-bases-symbols', 
  'clubs-bases-symbols',
  'ribbon-bases-symbols'
);