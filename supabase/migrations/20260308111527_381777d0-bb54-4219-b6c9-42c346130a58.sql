
-- Throw combinations control table
CREATE TABLE public.throw_combinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  "Thr6" text DEFAULT 'N',
  "Thr7" text DEFAULT 'N',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.throw_combinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Throw combinations are viewable by everyone" ON public.throw_combinations FOR SELECT USING (true);
CREATE POLICY "Admins can insert throw combinations" ON public.throw_combinations FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update throw combinations" ON public.throw_combinations FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete throw combinations" ON public.throw_combinations FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Catch combinations control table
CREATE TABLE public.catch_combinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  "Catch8" text DEFAULT 'N',
  "Catch9" text DEFAULT 'N',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.catch_combinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catch combinations are viewable by everyone" ON public.catch_combinations FOR SELECT USING (true);
CREATE POLICY "Admins can insert catch combinations" ON public.catch_combinations FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update catch combinations" ON public.catch_combinations FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete catch combinations" ON public.catch_combinations FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
