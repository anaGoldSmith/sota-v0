-- Create jumps table for storing difficulty of body jumps
CREATE TABLE public.jumps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT,
  description TEXT NOT NULL,
  value DECIMAL(4,2) NOT NULL,
  turn_degrees TEXT,
  symbol_image TEXT,
  jump_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.jumps ENABLE ROW LEVEL SECURITY;

-- Create policies for jump access
CREATE POLICY "Jumps are viewable by everyone" 
ON public.jumps 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert jumps" 
ON public.jumps 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update jumps" 
ON public.jumps 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete jumps" 
ON public.jumps 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_jumps_updated_at
BEFORE UPDATE ON public.jumps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_jumps_value ON public.jumps(value);
CREATE INDEX idx_jumps_code ON public.jumps(code);
CREATE INDEX idx_jumps_jump_number ON public.jumps(jump_number);

-- Insert initial jump data based on the PDF structure
-- Jump Type 1: Tuck jumps
INSERT INTO public.jumps (code, name, description, value, turn_degrees, jump_number) VALUES
('1.101', 'Tuck jump 360°', 'Tuck jump with 360° turn, take-off from 2 feet', 0.10, '360', 1),
('1.102', 'Tuck jump 360°', 'Tuck jump with 360° turn, take-off from 1 foot', 0.10, '360', 1),
('1.103', 'Tuck jump 360°', 'Tuck jump with 360° turn, landing on 1 foot', 0.10, '360', 1),
('1.2101', 'Tuck jump 540°', 'Tuck jump with 540° turn, take-off from 2 feet', 0.20, '540', 1),
('1.2102', 'Tuck jump 540°', 'Tuck jump with 540° turn, take-off from 1 foot', 0.20, '540', 1),
('1.2103', 'Tuck jump 540°', 'Tuck jump with 540° turn, landing on 1 foot', 0.20, '540', 1),
('1.301', 'Tuck jump 720°', 'Tuck jump with 720° turn, take-off from 2 feet', 0.30, '720', 1),
('1.302', 'Tuck jump 720°', 'Tuck jump with 720° turn, take-off from 1 foot', 0.30, '720', 1),
('1.303', 'Tuck jump 720°', 'Tuck jump with 720° turn, landing on 1 foot', 0.30, '720', 1);

-- Jump Type 2: Straddle jumps
INSERT INTO public.jumps (code, name, description, value, turn_degrees, jump_number) VALUES
('2.101', 'Straddle jump 360°', 'Straddle jump with 360° turn, take-off from 2 feet', 0.10, '360', 2),
('2.102', 'Straddle jump 360°', 'Straddle jump with 360° turn, take-off from 1 foot', 0.10, '360', 2),
('2.103', 'Straddle jump 360°', 'Straddle jump with 360° turn, landing on 1 foot', 0.10, '360', 2),
('2.2101', 'Straddle jump 540°', 'Straddle jump with 540° turn, take-off from 2 feet', 0.20, '540', 2),
('2.2102', 'Straddle jump 540°', 'Straddle jump with 540° turn, take-off from 1 foot', 0.20, '540', 2),
('2.2103', 'Straddle jump 540°', 'Straddle jump with 540° turn, landing on 1 foot', 0.20, '540', 2),
('2.301', 'Straddle jump 720°', 'Straddle jump with 720° turn, take-off from 2 feet', 0.30, '720', 2),
('2.302', 'Straddle jump 720°', 'Straddle jump with 720° turn, take-off from 1 foot', 0.30, '720', 2),
('2.303', 'Straddle jump 720°', 'Straddle jump with 720° turn, landing on 1 foot', 0.30, '720', 2);

-- Jump Type 3: Split jumps
INSERT INTO public.jumps (code, name, description, value, turn_degrees, jump_number) VALUES
('3.101', 'Split jump', 'Split jump, take-off from 2 feet', 0.10, 'NA', 3),
('3.102', 'Split jump', 'Split jump, take-off from 1 foot', 0.10, 'NA', 3),
('3.103', 'Split jump', 'Split jump, landing on 1 foot', 0.10, 'NA', 3),
('3.2101', 'Split jump 180°', 'Split jump with 180° turn, take-off from 2 feet', 0.20, '180', 3),
('3.2102', 'Split jump 180°', 'Split jump with 180° turn, take-off from 1 foot', 0.20, '180', 3),
('3.2103', 'Split jump 180°', 'Split jump with 180° turn, landing on 1 foot', 0.20, '180', 3),
('3.301', 'Split jump 360°', 'Split jump with 360° turn, take-off from 2 feet', 0.30, '360', 3),
('3.302', 'Split jump 360°', 'Split jump with 360° turn, take-off from 1 foot', 0.30, '360', 3),
('3.303', 'Split jump 360°', 'Split jump with 360° turn, landing on 1 foot', 0.30, '360', 3);

-- Jump Type 4: Ring/Arch jumps
INSERT INTO public.jumps (code, name, description, value, turn_degrees, jump_number) VALUES
('4.101', 'Ring jump', 'Ring/Arch jump, take-off from 2 feet', 0.10, 'NA', 4),
('4.102', 'Ring jump', 'Ring/Arch jump, take-off from 1 foot', 0.10, 'NA', 4),
('4.103', 'Ring jump', 'Ring/Arch jump, landing on 1 foot', 0.10, 'NA', 4),
('4.2101', 'Ring jump 180°', 'Ring/Arch jump with 180° turn, take-off from 2 feet', 0.20, '180', 4),
('4.2102', 'Ring jump 180°', 'Ring/Arch jump with 180° turn, take-off from 1 foot', 0.20, '180', 4),
('4.2103', 'Ring jump 180°', 'Ring/Arch jump with 180° turn, landing on 1 foot', 0.20, '180', 4),
('4.301', 'Ring jump 360°', 'Ring/Arch jump with 360° turn, take-off from 2 feet', 0.30, '360', 4),
('4.302', 'Ring jump 360°', 'Ring/Arch jump with 360° turn, take-off from 1 foot', 0.30, '360', 4),
('4.303', 'Ring jump 360°', 'Ring/Arch jump with 360° turn, landing on 1 foot', 0.30, '360', 4);

-- Jump Type 5: Cossack jumps
INSERT INTO public.jumps (code, name, description, value, turn_degrees, jump_number) VALUES
('5.101', 'Cossack jump', 'Cossack jump, take-off from 2 feet', 0.10, 'NA', 5),
('5.102', 'Cossack jump', 'Cossack jump, take-off from 1 foot', 0.10, 'NA', 5),
('5.103', 'Cossack jump', 'Cossack jump, landing on 1 foot', 0.10, 'NA', 5),
('5.2101', 'Cossack jump 180°', 'Cossack jump with 180° turn, take-off from 2 feet', 0.20, '180', 5),
('5.2102', 'Cossack jump 180°', 'Cossack jump with 180° turn, take-off from 1 foot', 0.20, '180', 5),
('5.2103', 'Cossack jump 180°', 'Cossack jump with 180° turn, landing on 1 foot', 0.20, '180', 5);