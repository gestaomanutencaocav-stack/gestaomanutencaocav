import { supabase } from './supabase';

export interface MaintenanceRequest {
  id: string;
  description: string;
  unit: string;
  responsibleServer?: string;
  date: string;
  createdAt: string; // ISO String for filtering
  type: string;
  status: string;
  statusColor: string;
  professional: string | null;
  avatar: string | null;
  details?: string;
  checklist?: { id: number; task: string; completed: boolean }[];
  authorizedBy?: string;
  authorizedPosition?: string;
  authorizedJustification?: string;
  urgency?: 'Baixa' | 'Média' | 'Alta' | 'Emergencial';
  images?: string[];
}

// Helper to map DB fields to interface
const mapRequest = (req: any): MaintenanceRequest => ({
  id: req.id,
  description: req.description,
  unit: req.unit,
  responsibleServer: req.responsible_server,
  date: req.date,
  createdAt: req.created_at,
  type: req.type,
  status: req.status,
  statusColor: req.status_color,
  professional: req.professional,
  avatar: req.avatar,
  details: req.details,
  checklist: req.checklist,
  authorizedBy: req.authorized_by,
  authorizedPosition: req.authorized_position,
  authorizedJustification: req.authorized_justification,
  urgency: req.urgency,
  images: req.images || [],
});

export interface Material {
  id?: string;
  codigo: string;
  descricao: string;
  unidadeMedida: string;
  quantidadeGeral: number;
  valorUnitario: number;
  valorTotal: number;
  saldoInicial: number;
  saldoAtual: number;
  type: 'estoque' | 'finalistico';
  consumptionRecords?: { date: string; quantity: number }[];
}

const mapMaterial = (m: any): Material => ({
  id: m.id,
  codigo: m.codigo,
  descricao: m.descricao,
  unidadeMedida: m.unidade_medida,
  quantidadeGeral: m.quantidade_geral,
  valorUnitario: m.valor_unitario,
  valorTotal: m.valor_total,
  saldoInicial: m.saldo_inicial,
  saldoAtual: m.saldo_atual,
  type: m.type,
  consumptionRecords: m.consumption_records || [],
});

export const getMaterials = async (type: 'estoque' | 'finalistico') => {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('type', type)
    .order('codigo', { ascending: true });
  
  if (error) {
    console.error('Error fetching materials:', error);
    return [];
  }
  return data.map(mapMaterial);
};

export const upsertMaterials = async (materials: Material[]) => {
  const dbMaterials = materials.map(m => ({
    codigo: m.codigo,
    descricao: m.descricao,
    unidade_medida: m.unidadeMedida,
    quantidade_geral: m.quantidadeGeral,
    valor_unitario: m.valorUnitario,
    valor_total: m.valorTotal,
    saldo_inicial: m.saldoInicial,
    saldo_atual: m.saldoAtual,
    type: m.type,
    consumption_records: m.consumptionRecords || [],
  }));

  // Try upserting. If it fails due to missing constraint, we'll know from the error.
  const { data, error } = await supabase
    .from('materials')
    .upsert(dbMaterials, { 
      onConflict: 'codigo,type',
      ignoreDuplicates: false 
    })
    .select();

  if (error) {
    console.error('Error upserting materials:', error);
    // If the specific conflict target fails, try without it (will use PK if exists)
    if (error.code === '42P10' || error.message.includes('constraint')) {
       const { data: retryData, error: retryError } = await supabase
        .from('materials')
        .insert(dbMaterials)
        .select();
       
       if (retryError) throw retryError;
       return retryData.map(mapMaterial);
    }
    throw error;
  }
  return data.map(mapMaterial);
};

export const updateMaterial = async (id: string, updates: Partial<Material>) => {
  const dbUpdates: any = {};
  if (updates.codigo) dbUpdates.codigo = updates.codigo;
  if (updates.descricao) dbUpdates.descricao = updates.descricao;
  if (updates.unidadeMedida) dbUpdates.unidade_medida = updates.unidadeMedida;
  if (updates.quantidadeGeral !== undefined) dbUpdates.quantidade_geral = updates.quantidadeGeral;
  if (updates.valorUnitario !== undefined) dbUpdates.valor_unitario = updates.valorUnitario;
  if (updates.valorTotal !== undefined) dbUpdates.valor_total = updates.valorTotal;
  if (updates.saldoInicial !== undefined) dbUpdates.saldo_inicial = updates.saldoInicial;
  if (updates.saldoAtual !== undefined) dbUpdates.saldo_atual = updates.saldoAtual;
  if (updates.consumptionRecords) dbUpdates.consumption_records = updates.consumptionRecords;

  const { data, error } = await supabase
    .from('materials')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating material:', error);
    return null;
  }
  return mapMaterial(data);
};

export const getRequests = async () => {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching requests:', error);
    return [];
  }
  return data.map(mapRequest);
};

export const getRequestById = async (id: string) => {
  const cleanId = id.startsWith('#') ? id.substring(1) : id;
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('id', cleanId)
    .single();
  
  if (error) {
    console.error('Error fetching request by id:', error);
    return null;
  }
  return mapRequest(data);
};

export const addRequest = async (request: Omit<MaintenanceRequest, 'id' | 'date' | 'createdAt' | 'status' | 'statusColor'>) => {
  const now = new Date();
  const id = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
  
  const newRequest = {
    id,
    description: request.description,
    unit: request.unit,
    responsible_server: request.responsibleServer,
    date: now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    created_at: now.toISOString(),
    type: request.type,
    status: 'Novo',
    status_color: 'blue',
    professional: request.professional,
    avatar: request.avatar,
    details: request.details,
    checklist: request.checklist || [],
    images: request.images || [],
  };

  const { data, error } = await supabase
    .from('requests')
    .insert([newRequest])
    .select()
    .single();

  if (error) {
    console.error('Error adding request:', error);
    throw error;
  }
  return mapRequest(data);
};

export const updateRequest = async (id: string, updates: Partial<MaintenanceRequest>) => {
  const cleanId = id.startsWith('#') ? id.substring(1) : id;
  
  // Map updates to DB fields
  const dbUpdates: any = {};
  if (updates.description) dbUpdates.description = updates.description;
  if (updates.unit) dbUpdates.unit = updates.unit;
  if (updates.responsibleServer) dbUpdates.responsible_server = updates.responsibleServer;
  if (updates.type) dbUpdates.type = updates.type;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.statusColor) dbUpdates.status_color = updates.statusColor;
  if (updates.professional !== undefined) dbUpdates.professional = updates.professional;
  if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
  if (updates.details) dbUpdates.details = updates.details;
  if (updates.checklist) dbUpdates.checklist = updates.checklist;
  if (updates.authorizedBy) dbUpdates.authorized_by = updates.authorizedBy;
  if (updates.authorizedPosition) dbUpdates.authorized_position = updates.authorizedPosition;
  if (updates.authorizedJustification) dbUpdates.authorized_justification = updates.authorizedJustification;
  if (updates.urgency) dbUpdates.urgency = updates.urgency;
  if (updates.images) dbUpdates.images = updates.images;

  const { data, error } = await supabase
    .from('requests')
    .update(dbUpdates)
    .eq('id', cleanId)
    .select()
    .single();

  if (error) {
    console.error('Error updating request:', error);
    return null;
  }
  return mapRequest(data);
};

export const deleteRequest = async (id: string) => {
  const cleanId = id.startsWith('#') ? id.substring(1) : id;
  const { error } = await supabase
    .from('requests')
    .delete()
    .eq('id', cleanId);
  
  if (error) {
    console.error('Error deleting request:', error);
    throw error;
  }
};

export interface Asset {
  id: string;
  name: string;
  category: string;
  location: string;
  status: 'Operacional' | 'Em Manutenção' | 'Crítico';
  lastMaintenance: string;
  nextMaintenance: string;
  description?: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
}

const mapAsset = (asset: any): Asset => ({
  id: asset.id,
  name: asset.name,
  category: asset.category,
  location: asset.location,
  status: asset.status,
  lastMaintenance: asset.last_maintenance,
  nextMaintenance: asset.next_maintenance,
  description: asset.description,
  serialNumber: asset.serial_number,
  brand: asset.brand,
  model: asset.model,
});

export const getAssets = async () => {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Error fetching assets:', error);
    return [];
  }
  return data.map(mapAsset);
};

export const addAsset = async (asset: Omit<Asset, 'id'>) => {
  const id = `AST-${Math.floor(1000 + Math.random() * 9000)}`;
  const dbAsset = {
    id,
    name: asset.name,
    category: asset.category,
    location: asset.location,
    status: asset.status,
    last_maintenance: asset.lastMaintenance,
    next_maintenance: asset.nextMaintenance,
    description: asset.description,
    serial_number: asset.serialNumber,
    brand: asset.brand,
    model: asset.model,
  };
  
  const { data, error } = await supabase
    .from('assets')
    .insert([dbAsset])
    .select()
    .single();

  if (error) {
    console.error('Error adding asset:', error);
    throw error;
  }
  return mapAsset(data);
};

export const updateAsset = async (id: string, updates: Partial<Asset>) => {
  const dbUpdates: any = {};
  if (updates.name) dbUpdates.name = updates.name;
  if (updates.category) dbUpdates.category = updates.category;
  if (updates.location) dbUpdates.location = updates.location;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.lastMaintenance) dbUpdates.last_maintenance = updates.lastMaintenance;
  if (updates.nextMaintenance) dbUpdates.next_maintenance = updates.nextMaintenance;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.serialNumber !== undefined) dbUpdates.serial_number = updates.serialNumber;
  if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
  if (updates.model !== undefined) dbUpdates.model = updates.model;

  const { data, error } = await supabase
    .from('assets')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating asset:', error);
    return null;
  }
  return mapAsset(data);
};

export const deleteAsset = async (id: string) => {
  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting asset:', error);
    throw error;
  }
};
