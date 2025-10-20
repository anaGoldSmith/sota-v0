-- Create control tables for each apparatus
CREATE TABLE public.hoop_control (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  "Cr1V" TEXT CHECK ("Cr1V" IN ('Y', 'N')),
  "Cr2H" TEXT CHECK ("Cr2H" IN ('Y', 'N')),
  "Cr3L" TEXT CHECK ("Cr3L" IN ('Y', 'N')),
  "Cr7R" TEXT CHECK ("Cr7R" IN ('Y', 'N')),
  "Cr4F" TEXT CHECK ("Cr4F" IN ('Y', 'N')),
  "Cr5W" TEXT CHECK ("Cr5W" IN ('Y', 'N')),
  "Cr6DB" TEXT CHECK ("Cr6DB" IN ('Y', 'N')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.ball_control (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  "Cr1V" TEXT CHECK ("Cr1V" IN ('Y', 'N')),
  "Cr2H" TEXT CHECK ("Cr2H" IN ('Y', 'N')),
  "Cr3L" TEXT CHECK ("Cr3L" IN ('Y', 'N')),
  "Cr7R" TEXT CHECK ("Cr7R" IN ('Y', 'N')),
  "Cr4F" TEXT CHECK ("Cr4F" IN ('Y', 'N')),
  "Cr5W" TEXT CHECK ("Cr5W" IN ('Y', 'N')),
  "Cr6DB" TEXT CHECK ("Cr6DB" IN ('Y', 'N')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.clubs_control (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  "Cr1V" TEXT CHECK ("Cr1V" IN ('Y', 'N')),
  "Cr2H" TEXT CHECK ("Cr2H" IN ('Y', 'N')),
  "Cr3L" TEXT CHECK ("Cr3L" IN ('Y', 'N')),
  "Cr7R" TEXT CHECK ("Cr7R" IN ('Y', 'N')),
  "Cr4F" TEXT CHECK ("Cr4F" IN ('Y', 'N')),
  "Cr5W" TEXT CHECK ("Cr5W" IN ('Y', 'N')),
  "Cr6DB" TEXT CHECK ("Cr6DB" IN ('Y', 'N')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.ribbon_control (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  "Cr1V" TEXT CHECK ("Cr1V" IN ('Y', 'N')),
  "Cr2H" TEXT CHECK ("Cr2H" IN ('Y', 'N')),
  "Cr3L" TEXT CHECK ("Cr3L" IN ('Y', 'N')),
  "Cr7R" TEXT CHECK ("Cr7R" IN ('Y', 'N')),
  "Cr4F" TEXT CHECK ("Cr4F" IN ('Y', 'N')),
  "Cr5W" TEXT CHECK ("Cr5W" IN ('Y', 'N')),
  "Cr6DB" TEXT CHECK ("Cr6DB" IN ('Y', 'N')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hoop_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ball_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ribbon_control ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hoop_control
CREATE POLICY "Hoop control is viewable by everyone" ON public.hoop_control
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert hoop control" ON public.hoop_control
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update hoop control" ON public.hoop_control
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete hoop control" ON public.hoop_control
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for ball_control
CREATE POLICY "Ball control is viewable by everyone" ON public.ball_control
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert ball control" ON public.ball_control
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update ball control" ON public.ball_control
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete ball control" ON public.ball_control
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for clubs_control
CREATE POLICY "Clubs control is viewable by everyone" ON public.clubs_control
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert clubs control" ON public.clubs_control
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update clubs control" ON public.clubs_control
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete clubs control" ON public.clubs_control
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for ribbon_control
CREATE POLICY "Ribbon control is viewable by everyone" ON public.ribbon_control
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert ribbon control" ON public.ribbon_control
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update ribbon control" ON public.ribbon_control
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete ribbon control" ON public.ribbon_control
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_hoop_control_updated_at
  BEFORE UPDATE ON public.hoop_control
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ball_control_updated_at
  BEFORE UPDATE ON public.ball_control
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clubs_control_updated_at
  BEFORE UPDATE ON public.clubs_control
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ribbon_control_updated_at
  BEFORE UPDATE ON public.ribbon_control
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();