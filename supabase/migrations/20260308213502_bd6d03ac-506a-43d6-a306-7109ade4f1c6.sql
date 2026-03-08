
CREATE TABLE public.routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  apparatus text,
  year text,
  rulebook text,
  gymnast_name text,
  elements jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_db numeric DEFAULT 0,
  total_da numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own routines"
  ON public.routines FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own routines"
  ON public.routines FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routines"
  ON public.routines FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routines"
  ON public.routines FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
