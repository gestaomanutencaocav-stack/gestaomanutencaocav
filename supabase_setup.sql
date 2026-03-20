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

-- Insert initial contract data if not exists
INSERT INTO contract_info (contract_number, company_name, cnpj, start_date, end_date, renewals_count, contracting_party)
SELECT '31/2021', 'EMPRESA CLÓVIS DE BARROS LIMA CONSTRUÇÕES E INCORPORAÇÕES LTDA', '11.533.627/0001-24', '2021-11-04', '2026-11-04', 5, 'Centro Acadêmico da Vitória - CAV/UFPE'
WHERE NOT EXISTS (SELECT 1 FROM contract_info LIMIT 1);
