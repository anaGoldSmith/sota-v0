-- Create storage bucket for rule books/code of points files
INSERT INTO storage.buckets (id, name, public)
VALUES ('rulebooks', 'rulebooks', true);

-- Create table to store rule book metadata
CREATE TABLE public.rulebooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  category TEXT NOT NULL DEFAULT 'FIG Code of Points',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rulebooks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to view rulebooks (public access)
CREATE POLICY "Rulebooks are viewable by everyone" 
ON public.rulebooks 
FOR SELECT 
USING (true);

-- Storage policies for the rulebooks bucket
CREATE POLICY "Rulebook files are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'rulebooks');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_rulebooks_updated_at
BEFORE UPDATE ON public.rulebooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
