-- Add new columns to balances table
ALTER TABLE public.balances 
ADD COLUMN IF NOT EXISTS turn_degrees text,
ADD COLUMN IF NOT EXISTS fouette boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS leg_level text,
ADD COLUMN IF NOT EXISTS flat boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS slow_turn boolean DEFAULT false;