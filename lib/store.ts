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
});

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
