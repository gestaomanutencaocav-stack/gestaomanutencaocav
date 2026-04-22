-- Create contract_info table
CREATE TABLE IF NOT EXISTS contract_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number TEXT DEFAULT '31/2021',
    company_name TEXT DEFAULT 'EMPRESA CLÓVIS DE BARROS LIMA CONSTRUÇÕES E INCORPORAÇÕES LTDA',
    cnpj TEXT DEFAULT '11.533.627/0001-24',
    start_date DATE DEFAULT '2021-11-04',
    end_date DATE DEFAULT '2026-11-04',
    renewals_count INTEGER DEFAULT 5,
    contracting_party TEXT DEFAULT 'Centro Acadêmico da Vitória - CAV/UFPE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for contract_info
ALTER TABLE contract_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to contract_info" ON contract_info FOR ALL USING (true) WITH CHECK (true);

-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    unit TEXT NOT NULL,
    responsible_server TEXT,
    date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    status_color TEXT DEFAULT 'blue',
    professional TEXT,
    avatar TEXT,
    details TEXT,
    checklist JSONB DEFAULT '[]'::jsonb,
    authorized_by TEXT,
    authorized_position TEXT,
    authorized_justification TEXT,
    urgency TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    professionals JSONB DEFAULT '[]'::jsonb,
    timeline JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb,
    data_finalizacao TEXT,
    hora_finalizacao TEXT,
    observacao TEXT,
    matricula_siape TEXT,
    email_solicitante TEXT,
    tombamento TEXT,
    modelo_equipamento TEXT,
    tipo_equipamento TEXT,
    btus TEXT,
    servidor_repassou TEXT
);

-- Enable RLS for requests
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to requests" ON requests FOR ALL USING (true) WITH CHECK (true);

-- Create financial_records table
CREATE TABLE IF NOT EXISTS financial_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER,
    month INTEGER,
    invoice_number TEXT,
    payment_value NUMERIC DEFAULT 0,
    materials_value NUMERIC DEFAULT 0,
    materials_citl_value NUMERIC DEFAULT 0,
    total_invoice NUMERIC DEFAULT 0,
    discounts NUMERIC DEFAULT 0,
    total_after_discounts NUMERIC DEFAULT 0,
    fiscal_note_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for financial_records
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to financial_records" ON financial_records FOR ALL USING (true) WITH CHECK (true);

-- Create repactuacoes table
CREATE TABLE IF NOT EXISTS repactuacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_number TEXT,
    year INTEGER,
    date DATE,
    triggering_factor TEXT,
    status TEXT DEFAULT 'Em Análise',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for repactuacoes
ALTER TABLE repactuacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to repactuacoes" ON repactuacoes FOR ALL USING (true) WITH CHECK (true);

-- Create professionals table
CREATE TABLE IF NOT EXISTS professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    specialty TEXT,
    registration TEXT,
    phone TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for professionals
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to professionals" ON professionals FOR ALL USING (true) WITH CHECK (true);

-- Create inspections table
CREATE TABLE IF NOT EXISTS inspections (
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
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to inspections" ON inspections FOR ALL USING (true) WITH CHECK (true);

-- Create inspection_records table
CREATE TABLE IF NOT EXISTS inspection_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
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
ALTER TABLE inspection_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to inspection_records" ON inspection_records FOR ALL USING (true) WITH CHECK (true);

-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
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
    average_monthly_consumption NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(codigo, type)
);

-- Enable RLS for materials
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to materials" ON materials FOR ALL USING (true) WITH CHECK (true);

-- Create price_corrections table
CREATE TABLE IF NOT EXISTS price_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_type TEXT NOT NULL,
    percentage NUMERIC NOT NULL,
    items_affected INTEGER NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    applied_by TEXT DEFAULT 'Sistema'
);

-- Enable RLS for price_corrections
ALTER TABLE price_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to price_corrections" ON price_corrections FOR ALL USING (true) WITH CHECK (true);

-- Create material_price_history table
CREATE TABLE IF NOT EXISTS public.material_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
  material_codigo TEXT NOT NULL,
  reference_month INTEGER NOT NULL,
  reference_year INTEGER NOT NULL,
  unit_price NUMERIC(15,4) NOT NULL,
  previous_price NUMERIC(15,4),
  variation_percent NUMERIC(10,4),
  justification TEXT,
  material_type TEXT DEFAULT 'finalistico',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for material_price_history
ALTER TABLE public.material_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on material_price_history" ON public.material_price_history FOR ALL USING (true) WITH CHECK (true);

-- Insert initial professionals if not exists
INSERT INTO professionals (name, specialty, registration, phone)
SELECT 'João Silva', 'Elétrica', '12345', '(81) 98888-7777'
WHERE NOT EXISTS (SELECT 1 FROM professionals LIMIT 1);

INSERT INTO professionals (name, specialty, registration, phone)
SELECT 'Maria Santos', 'Hidráulica', '67890', '(81) 97777-6666'
WHERE NOT EXISTS (SELECT 1 FROM professionals WHERE name = 'Maria Santos');

INSERT INTO professionals (name, specialty, registration, phone)
VALUES ('Marinaldo de Souza Amorim', 'Oficial de Manutenção', '', '')
ON CONFLICT DO NOTHING;

-- Insert initial inspections if not exists
INSERT INTO inspections (name, area, periodicity, description, status)
SELECT 'Inspeção Elétrica Mensal', 'Elétrica', 'mensal', 'Verificação de quadros e fiação', 'ativa'
WHERE NOT EXISTS (SELECT 1 FROM inspections LIMIT 1);

-- Insert initial contract data if not exists
INSERT INTO contract_info (contract_number, company_name, cnpj, start_date, end_date, renewals_count, contracting_party)
SELECT '31/2021', 'EMPRESA CLÓVIS DE BARROS LIMA CONSTRUÇÕES E INCORPORAÇÕES LTDA', '11.533.627/0001-24', '2021-11-04', '2026-11-04', 5, 'Centro Acadêmico da Vitória - CAV/UFPE'
WHERE NOT EXISTS (SELECT 1 FROM contract_info LIMIT 1);
