-- Create vertical_rotations table
CREATE TABLE public.vertical_rotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "group" TEXT,
  group_name TEXT,
  db TEXT,
  code TEXT NOT NULL,
  name TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vertical_rotations ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Anyone can view vertical rotations"
  ON public.vertical_rotations
  FOR SELECT
  USING (true);

-- Allow admins to manage vertical rotations
CREATE POLICY "Admins can manage vertical rotations"
  ON public.vertical_rotations
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));