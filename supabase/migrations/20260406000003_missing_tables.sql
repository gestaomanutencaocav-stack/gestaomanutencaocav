-- Create professionals table
CREATE TABLE IF NOT EXISTS public.professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    specialty TEXT,
    registration TEXT,
    phone TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for professionals
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to professionals" ON public.professionals FOR ALL USING (true) WITH CHECK (true);

-- Create inspections table
CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    area TEXT NOT NULL,
    periodicity TEXT NOT NULL,
    description TEXT,
    professionals JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'ativa',
    next_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for inspections
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to inspections" ON public.inspections FOR ALL USING (true) WITH CHECK (true);

-- Create inspection_records table
CREATE TABLE IF NOT EXISTS public.inspection_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE,
    execution_date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    problems_found TEXT DEFAULT '0',
    problems_resolved TEXT DEFAULT '0',
    problems_pending TEXT DEFAULT '0',
    professionals JSONB DEFAULT '[]'::jsonb,
    professional TEXT, -- Fallback for singular column
    execution_status TEXT DEFAULT 'Realizada',
    images JSONB DEFAULT '[]'::jsonb,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for inspection_records
ALTER TABLE public.inspection_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to inspection_records" ON public.inspection_records FOR ALL USING (true) WITH CHECK (true);

-- Create materials table
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    unidade_medida TEXT,
    quantidade_geral NUMERIC DEFAULT 0,
    valor_unitario NUMERIC DEFAULT 0,
    valor_total NUMERIC DEFAULT 0,
    saldo_inicial NUMERIC DEFAULT 0,
    saldo_atual NUMERIC DEFAULT 0,
    type TEXT NOT NULL, -- 'estoque' or 'finalistico'
    consumption_records JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(codigo, type)
);

-- Enable RLS for materials
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to materials" ON public.materials FOR ALL USING (true) WITH CHECK (true);

-- Create price_corrections table
CREATE TABLE IF NOT EXISTS public.price_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_type TEXT NOT NULL,
    percentage NUMERIC NOT NULL,
    items_affected INTEGER NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    applied_by TEXT DEFAULT 'Sistema'
);

-- Enable RLS for price_corrections
ALTER TABLE public.price_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to price_corrections" ON public.price_corrections FOR ALL USING (true) WITH CHECK (true);
