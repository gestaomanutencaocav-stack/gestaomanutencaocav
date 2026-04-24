-- Adicionar campo contract_id na tabela financial_records se não existir
ALTER TABLE financial_records 
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contract_info(id);

-- Adicionar campo status na tabela contract_info se não existir
ALTER TABLE contract_info 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Encerrado', 'Suspenso'));

-- Atualizar registros existentes para apontar para o contrato atual
-- Assumindo que o contrato existente é o primeiro da tabela
UPDATE financial_records 
SET contract_id = (SELECT id FROM contract_info LIMIT 1)
WHERE contract_id IS NULL;
