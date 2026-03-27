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

export interface Professional {
  name: string;
  role: string;
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
  professionals: Professional[];
  avatar: string | null;
  details?: string;
  checklist?: { id: string; task: string; completed: boolean }[];
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
    : (req.professional ? req.professional.split(', ').map((p: string) => ({ name: p, role: 'Técnico' })) : []),
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

export interface PriceCorrection {
  id: string;
  materialType: string;
  percentage: number;
  itemsAffected: number;
  appliedAt: string;
  appliedBy: string;
}

const mapPriceCorrection = (pc: any): PriceCorrection => ({
  id: pc.id,
  materialType: pc.material_type,
  percentage: Number(pc.percentage),
  itemsAffected: Number(pc.items_affected),
  appliedAt: pc.applied_at,
  appliedBy: pc.applied_by,
});

export const getPriceCorrections = async (type: string = 'finalistico') => {
  const { data, error } = await supabase
    .from('price_corrections')
    .select('*')
    .eq('material_type', type)
    .order('applied_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error fetching price corrections:', error);
    return [];
  }
  return data.map(mapPriceCorrection);
};

export const applyPriceCorrection = async (type: 'estoque' | 'finalistico', percentage: number, appliedBy: string = 'Sistema') => {
  // 1. Get all materials of the specified type
  const { data: materials, error: fetchError } = await supabase
    .from('materials')
    .select('*')
    .eq('type', type);

  if (fetchError) throw fetchError;
  if (!materials || materials.length === 0) return { count: 0 };

  const factor = 1 + (percentage / 100);

  // 2. Update each material
  const updates = materials.map(m => {
    const newValue = Number(m.valor_unitario || 0) * factor;
    const newTotal = newValue * Number(m.quantidade_geral || 0);
    return {
      ...m,
      valor_unitario: newValue,
      valor_total: newTotal
    };
  });

  const { error: updateError } = await supabase
    .from('materials')
    .upsert(updates, { onConflict: 'id' });

  if (updateError) throw updateError;

  // 3. Log the correction
  const { error: logError } = await supabase
    .from('price_corrections')
    .insert([{
      material_type: type,
      percentage: percentage,
      items_affected: materials.length,
      applied_by: appliedBy
    }]);

  if (logError) console.error('Error logging price correction:', logError);

  return { count: materials.length };
};

export interface MaterialPriceHistory {
  id: string;
  materialId: string;
  materialCodigo: string;
  referenceMonth: number;
  referenceYear: number;
  unitPrice: number;
  previousPrice: number | null;
  variationPercent: number | null;
  justification: string | null;
  materialType: string;
  createdAt: string;
}

const mapPriceHistory = (ph: any): MaterialPriceHistory => ({
  id: ph.id,
  materialId: ph.material_id,
  materialCodigo: ph.material_codigo,
  referenceMonth: ph.reference_month,
  referenceYear: ph.reference_year,
  unitPrice: Number(ph.unit_price),
  previousPrice: ph.previous_price ? Number(ph.previous_price) : null,
  variationPercent: ph.variation_percent ? Number(ph.variation_percent) : null,
  justification: ph.justification,
  materialType: ph.material_type,
  createdAt: ph.created_at,
});

export const getPriceHistory = async (materialId: string) => {
  const { data, error } = await supabase
    .from('material_price_history')
    .select('*')
    .eq('material_id', materialId)
    .order('reference_year', { ascending: false })
    .order('reference_month', { ascending: false });
  
  if (error) {
    console.error('Error fetching price history:', error);
    return [];
  }
  return data.map(mapPriceHistory);
};

export const addPriceHistory = async (materialId: string, payload: {
  referenceMonth: number;
  referenceYear: number;
  unitPrice: number;
  justification?: string;
}) => {
  // 1. Get the material to get its current price and code
  const { data: material, error: fetchError } = await supabase
    .from('materials')
    .select('*')
    .eq('id', materialId)
    .single();

  if (fetchError) throw fetchError;

  const previousPrice = Number(material.valor_unitario || 0);
  const variationPercent = previousPrice > 0 
    ? ((payload.unitPrice - previousPrice) / previousPrice) * 100 
    : 0;

  // 2. Insert into history
  const { data: historyData, error: historyError } = await supabase
    .from('material_price_history')
    .insert([{
      material_id: materialId,
      material_codigo: material.codigo,
      reference_month: payload.referenceMonth,
      reference_year: payload.referenceYear,
      unit_price: payload.unitPrice,
      previous_price: previousPrice,
      variation_percent: variationPercent,
      justification: payload.justification,
      material_type: material.type
    }])
    .select()
    .single();

  if (historyError) throw historyError;

  // 3. Update the material's current price
  const { error: updateError } = await supabase
    .from('materials')
    .update({
      valor_unitario: payload.unitPrice,
      valor_total: payload.unitPrice * Number(material.saldo_atual || 0)
    })
    .eq('id', materialId);

  if (updateError) throw updateError;

  return mapPriceHistory(historyData);
};

export const getMaterials = async (type: 'estoque' | 'finalistico', month?: number, year?: number) => {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('type', type)
    .order('codigo', { ascending: true });
  
  if (error) {
    console.error('Error fetching materials:', error);
    return [];
  }

  const mappedMaterials = data.map(mapMaterial);

  // If month and year are provided, we need to fetch the prices for that period
  if (month && year) {
    const { data: historyData, error: historyError } = await supabase
      .from('material_price_history')
      .select('*')
      .eq('reference_month', month)
      .eq('reference_year', year);

    if (!historyError && historyData) {
      return mappedMaterials.map(m => {
        const history = historyData.find(h => h.material_id === m.id);
        if (history) {
          return {
            ...m,
            valorUnitario: Number(history.unit_price),
            valorTotal: Number(history.unit_price) * m.saldoAtual,
            priceVariation: Number(history.variation_percent),
            isHistoricalPrice: true
          };
        }
        return m;
      });
    }
  }

  return mappedMaterials;
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
    dbUpdates.professional = updates.professionals.map(p => `${p.name} — ${p.role}`).join(', ');
  }
  if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
  if (updates.details !== undefined) dbUpdates.details = updates.details;
  if (updates.checklist !== undefined) dbUpdates.checklist = updates.checklist;
  if (updates.authorizedBy !== undefined) dbUpdates.authorized_by = updates.authorizedBy;
  if (updates.authorizedPosition !== undefined) dbUpdates.authorized_position = updates.authorizedPosition;
  if (updates.authorizedJustification !== undefined) dbUpdates.authorized_justification = updates.authorizedJustification;
  if (updates.urgency !== undefined) dbUpdates.urgency = updates.urgency;
  if (updates.images !== undefined) dbUpdates.images = updates.images;
  if (updates.matriculaSiape) dbUpdates.matricula_siape = updates.matriculaSiape;
  if (updates.emailSolicitante) dbUpdates.email_solicitante = updates.emailSolicitante;
  if (updates.tombamento) dbUpdates.tombamento = updates.tombamento;
  if (updates.modeloEquipamento) dbUpdates.modelo_equipamento = updates.modeloEquipamento;
  if (updates.tipoEquipamento) dbUpdates.tipo_equipamento = updates.tipoEquipamento;
  if (updates.btus) dbUpdates.btus = updates.btus;
  if (updates.horaFinalizacao !== undefined) dbUpdates.hora_finalizacao = updates.horaFinalizacao;
  if (updates.dataFinalizacao !== undefined) dbUpdates.data_finalizacao = updates.dataFinalizacao;
  if (updates.servidorRepassou) dbUpdates.servidor_repassou = updates.servidorRepassou;
  if (updates.observacao !== undefined) dbUpdates.observacao = updates.observacao;
  if (updates.timeline !== undefined) dbUpdates.timeline = updates.timeline;
  if (updates.documents !== undefined) dbUpdates.documents = updates.documents;

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

export interface Inspection {
  id: string;
  name: string;
  area: string;
  periodicity: 'diaria' | 'semanal' | 'quinzenal' | 'mensal';
  description: string;
  professionals: string[];
  status: 'ativa' | 'inativa';
  nextDate: string;
  createdAt: string;
}

export interface InspectionRecord {
  id: string;
  inspectionId: string;
  executionDate: string;
  startTime: string;
  endTime: string;
  problemsFound: string;
  problemsResolved: string;
  problemsPending: string;
  professionals: string[];
  executionStatus: 'Realizada' | 'Parcial' | 'Não Realizada';
  images: string[];
  observations: string;
  createdAt: string;
}

const mapInspection = (i: any): Inspection => ({
  id: i.id,
  name: i.name,
  area: i.area,
  periodicity: i.periodicity,
  description: i.description,
  professionals: Array.isArray(i.professionals) ? i.professionals : [],
  status: i.status,
  nextDate: i.next_date,
  createdAt: i.created_at,
});

const mapInspectionRecord = (r: any): InspectionRecord => ({
  id: r.id,
  inspectionId: r.inspection_id,
  executionDate: r.execution_date,
  startTime: r.start_time,
  endTime: r.end_time,
  problemsFound: r.problems_found,
  problemsResolved: r.problems_resolved,
  problemsPending: r.problems_pending,
  professionals: Array.isArray(r.professionals) 
    ? r.professionals 
    : (r.professional ? r.professional.split(', ').filter(Boolean) : []),
  executionStatus: r.execution_status,
  images: Array.isArray(r.images) ? r.images : [],
  observations: r.observations,
  createdAt: r.created_at,
});

export const getInspections = async () => {
  const { data, error } = await supabase
    .from('inspections')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching inspections:', error);
    return [];
  }
  return data.map(mapInspection);
};

export const getInspectionRecords = async (inspectionId?: string) => {
  let query = supabase.from('inspection_records').select('*').order('execution_date', { ascending: false });
  if (inspectionId) {
    query = query.eq('inspection_id', inspectionId);
  }
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching records:', error);
    return [];
  }
  return data.map(mapInspectionRecord);
};

export const addInspection = async (inspection: Omit<Inspection, 'id' | 'createdAt'>) => {
  const { data, error } = await supabase
    .from('inspections')
    .insert([{
      name: inspection.name,
      area: inspection.area,
      periodicity: inspection.periodicity,
      description: inspection.description,
      professionals: inspection.professionals,
      status: inspection.status,
      next_date: inspection.nextDate,
    }])
    .select()
    .single();
  
  if (error) throw error;
  return mapInspection(data);
};

export const updateInspection = async (id: string, updates: Partial<Inspection>) => {
  const dbUpdates: any = {};
  if (updates.name) dbUpdates.name = updates.name;
  if (updates.area) dbUpdates.area = updates.area;
  if (updates.periodicity) dbUpdates.periodicity = updates.periodicity;
  if (updates.description) dbUpdates.description = updates.description;
  if (updates.professionals) dbUpdates.professionals = updates.professionals;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.nextDate) dbUpdates.next_date = updates.nextDate;

  const { data, error } = await supabase
    .from('inspections')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return mapInspection(data);
};

export const addInspectionRecord = async (record: Omit<InspectionRecord, 'id' | 'createdAt'>) => {
  const { data, error } = await supabase
    .from('inspection_records')
    .insert([{
      inspection_id: record.inspectionId,
      execution_date: record.executionDate,
      start_time: record.startTime,
      end_time: record.endTime,
      problems_found: record.problemsFound,
      problems_resolved: record.problemsResolved,
      problems_pending: record.problemsPending,
      professionals: record.professionals,
      professional: record.professionals.join(', '), // Fallback for singular column
      execution_status: record.executionStatus,
      images: record.images,
      observations: record.observations,
    }])
    .select()
    .single();
  
  if (error) throw error;
  return mapInspectionRecord(data);
};
