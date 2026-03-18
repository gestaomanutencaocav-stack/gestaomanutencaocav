import { supabase } from './supabase';

export interface TimelineEvent {
  date: string;
  action: string;
  user: string;
  type: 'auto' | 'manual';
}

export interface Document {
  name: string;
  size: number;
  url: string;
  date: string;
}

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
  professionals: string[];
  avatar: string | null;
  details?: string;
  checklist?: { id: number; task: string; completed: boolean }[];
  authorizedBy?: string;
  authorizedPosition?: string;
  authorizedJustification?: string;
  urgency?: 'Baixa' | 'Média' | 'Alta' | 'Emergencial';
  images?: string[];
  matriculaSiape?: string;
  emailSolicitante?: string;
  tombamento?: string;
  modeloEquipamento?: string;
  tipoEquipamento?: string;
  btus?: string;
  horaFinalizacao?: string;
  dataFinalizacao?: string;
  servidorRepassou?: string;
  observacao?: string;
  timeline?: TimelineEvent[];
  documents?: Document[];
}

// Helper to map DB fields to interface
const mapRequest = (req: any): MaintenanceRequest => ({
  id: req.id || '',
  description: req.description || '',
  unit: req.unit || '',
  responsibleServer: req.responsible_server || '',
  date: req.date || '',
  createdAt: req.created_at || '',
  type: req.type || 'Geral',
  status: req.status || 'Novo',
  statusColor: req.status_color || 'blue',
  professionals: Array.isArray(req.professionals) 
    ? req.professionals 
    : (req.professional ? req.professional.split(', ').filter(Boolean) : []),
  avatar: req.avatar,
  details: req.details || '',
  checklist: Array.isArray(req.checklist) ? req.checklist : [],
  authorizedBy: req.authorized_by,
  authorizedPosition: req.authorized_position,
  authorizedJustification: req.authorized_justification,
  urgency: req.urgency,
  images: Array.isArray(req.images) ? req.images : [],
  matriculaSiape: req.matricula_siape || '',
  emailSolicitante: req.email_solicitante || '',
  tombamento: req.tombamento || '',
  modeloEquipamento: req.modelo_equipamento || '',
  tipoEquipamento: req.tipo_equipamento || '',
  btus: req.btus || '',
  horaFinalizacao: req.hora_finalizacao || '',
  dataFinalizacao: req.data_finalizacao || '',
  servidorRepassou: req.servidor_repassou || '',
  observacao: req.observacao || '',
  timeline: Array.isArray(req.timeline) ? req.timeline : [],
  documents: Array.isArray(req.documents) ? req.documents : [],
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
  quantidadeGeral: Number(m.quantidade_geral || 0),
  valorUnitario: Number(m.valor_unitario || 0),
  valorTotal: Number(m.valor_total || 0),
  saldoInicial: Number(m.saldo_inicial || 0),
  saldoAtual: Number(m.saldo_atual || 0),
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

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  photoUrl: string;
}

export const getProfessionals = async (): Promise<Professional[]> => {
  const { data, error } = await supabase
    .from('professionals')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Error fetching professionals:', error);
    // Return mock data if table doesn't exist yet to avoid breaking UI
    return [
      { id: '1', name: 'João Silva', specialty: 'Eletricista', photoUrl: 'https://i.pravatar.cc/150?u=joao' },
      { id: '2', name: 'Maria Santos', specialty: 'Hidráulica', photoUrl: 'https://i.pravatar.cc/150?u=maria' },
      { id: '3', name: 'Pedro Costa', specialty: 'Ar Condicionado', photoUrl: 'https://i.pravatar.cc/150?u=pedro' },
      { id: '4', name: 'Ana Oliveira', specialty: 'Pintura', photoUrl: 'https://i.pravatar.cc/150?u=ana' },
    ];
  }
  return data.map(p => ({
    id: p.id,
    name: p.name,
    specialty: p.specialty,
    photoUrl: p.photo_url
  }));
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
  // More unique ID to avoid collisions
  const id = `REQ-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  const newRequest: any = {
    id,
    description: request.description || 'Sem descrição',
    unit: request.unit || 'Sem unidade',
    responsible_server: request.responsibleServer || 'Não informado',
    date: now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    created_at: now.toISOString(),
    type: request.type || 'Geral',
    status: 'Novo',
    status_color: 'blue',
    professional: (request.professionals || []).join(', '),
    avatar: request.avatar,
    details: request.details || '',
    checklist: request.checklist || [],
    matricula_siape: request.matriculaSiape || '',
    email_solicitante: request.emailSolicitante || '',
    tombamento: request.tombamento || '',
    modelo_equipamento: request.modeloEquipamento || '',
    tipo_equipamento: request.tipoEquipamento || '',
    btus: request.btus || '',
    hora_finalizacao: request.horaFinalizacao || '',
    data_finalizacao: request.dataFinalizacao || '',
    servidor_repassou: request.servidorRepassou || '',
    observacao: request.observacao || '',
    timeline: request.timeline || [
      { 
        date: now.toISOString(), 
        action: 'Solicitação criada', 
        user: request.responsibleServer || 'Sistema', 
        type: 'auto' 
      }
    ],
    documents: request.documents || [],
  };

  // Try to include new columns if they exist
  const extendedRequest = {
    ...newRequest,
    professionals: request.professionals || [],
    images: request.images || [],
  };

  try {
    console.log('Attempting to insert request:', id);
    const { data, error } = await supabase
      .from('requests')
      .insert([extendedRequest])
      .select();

    if (error) {
      console.error('Initial insert failed:', error);
      // If it fails due to missing columns (42703), retry with basic fields
      if (error.code === '42703' || error.message.includes('column')) {
        console.warn('New columns missing in DB, retrying with basic fields');
        const { data: retryData, error: retryError } = await supabase
          .from('requests')
          .insert([newRequest])
          .select();
        
        if (retryError) {
          console.error('Retry insert failed:', retryError);
          // Third fallback: bare minimum fields
          const bareMinimum = {
            id,
            description: request.description || 'Sem descrição',
            unit: request.unit || 'Sem unidade',
            type: request.type || 'Geral',
            status: 'Novo',
            created_at: now.toISOString(),
          };
          console.warn('Retrying with bare minimum fields');
          const { data: finalData, error: finalError } = await supabase
            .from('requests')
            .insert([bareMinimum])
            .select();
            
          if (finalError) {
            throw new Error(`Erro fatal ao criar solicitação: ${finalError.message}`);
          }
          return mapRequest(finalData?.[0]);
        }
        return mapRequest(retryData?.[0]);
      }
      throw new Error(`Erro ao criar solicitação: ${error.message} (Código: ${error.code})`);
    }
    
    if (!data || data.length === 0) {
      throw new Error('Nenhum dado retornado após a inserção.');
    }

    return mapRequest(data[0]);
  } catch (error: any) {
    console.error('Error in addRequest:', error);
    throw error;
  }
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
  if (updates.professionals !== undefined) {
    dbUpdates.professionals = updates.professionals;
    dbUpdates.professional = updates.professionals.join(', ');
  }
  if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
  if (updates.details) dbUpdates.details = updates.details;
  if (updates.checklist) dbUpdates.checklist = updates.checklist;
  if (updates.authorizedBy) dbUpdates.authorized_by = updates.authorizedBy;
  if (updates.authorizedPosition) dbUpdates.authorized_position = updates.authorizedPosition;
  if (updates.authorizedJustification) dbUpdates.authorized_justification = updates.authorizedJustification;
  if (updates.urgency) dbUpdates.urgency = updates.urgency;
  if (updates.images) dbUpdates.images = updates.images;
  if (updates.matriculaSiape) dbUpdates.matricula_siape = updates.matriculaSiape;
  if (updates.emailSolicitante) dbUpdates.email_solicitante = updates.emailSolicitante;
  if (updates.tombamento) dbUpdates.tombamento = updates.tombamento;
  if (updates.modeloEquipamento) dbUpdates.modelo_equipamento = updates.modeloEquipamento;
  if (updates.tipoEquipamento) dbUpdates.tipo_equipamento = updates.tipoEquipamento;
  if (updates.btus) dbUpdates.btus = updates.btus;
  if (updates.horaFinalizacao) dbUpdates.hora_finalizacao = updates.horaFinalizacao;
  if (updates.dataFinalizacao) dbUpdates.data_finalizacao = updates.dataFinalizacao;
  if (updates.servidorRepassou) dbUpdates.servidor_repassou = updates.servidorRepassou;
  if (updates.observacao) dbUpdates.observacao = updates.observacao;
  if (updates.timeline) dbUpdates.timeline = updates.timeline;
  if (updates.documents) dbUpdates.documents = updates.documents;

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
