
-- Create events table for landing page
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text NOT NULL,
  dates text,
  title text NOT NULL,
  city text,
  disciplines text,
  status text,
  link text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Everyone can read events
CREATE POLICY "Events are viewable by everyone" ON public.events
  FOR SELECT USING (true);

-- Admins can manage events
CREATE POLICY "Admins can insert events" ON public.events
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update events" ON public.events
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete events" ON public.events
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for landing page images
INSERT INTO storage.buckets (id, name, public) VALUES ('landing-page-images', 'landing-page-images', true);

-- Storage policies for landing page images
CREATE POLICY "Anyone can view landing page images" ON storage.objects
  FOR SELECT USING (bucket_id = 'landing-page-images');

CREATE POLICY "Admins can upload landing page images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'landing-page-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete landing page images" ON storage.objects
  FOR DELETE USING (bucket_id = 'landing-page-images' AND has_role(auth.uid(), 'admin'::app_role));
