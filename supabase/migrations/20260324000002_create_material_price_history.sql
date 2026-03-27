-- Create table for material price history
CREATE TABLE IF NOT EXISTS public.material_price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID REFERENCES public.materials(id) 
    ON DELETE CASCADE,
  material_codigo TEXT NOT NULL,
  reference_month INTEGER NOT NULL,
  reference_year INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  previous_price NUMERIC,
  variation_percent NUMERIC,
  justification TEXT,
  material_type TEXT DEFAULT 'finalistico',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.material_price_history 
  ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all on material_price_history"
  ON public.material_price_history
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_price_history_material 
  ON public.material_price_history(material_id);

CREATE INDEX IF NOT EXISTS idx_price_history_period 
  ON public.material_price_history(reference_year, reference_month);
