-- Create table for DA comments
CREATE TABLE public.da_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apparatus TEXT NOT NULL,
  code TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(apparatus, code)
);

-- Enable RLS
ALTER TABLE public.da_comments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "DA comments are viewable by everyone"
ON public.da_comments
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert DA comments"
ON public.da_comments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update DA comments"
ON public.da_comments
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete DA comments"
ON public.da_comments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_da_comments_updated_at
BEFORE UPDATE ON public.da_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();