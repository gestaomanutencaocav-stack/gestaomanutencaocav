import { google } from 'googleapis';
import { addRequest, getRequests } from './store';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

async function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error('Google Service Account credentials not found in environment variables.');
  }

  const auth = new google.auth.JWT(email, null, key, SCOPES);
  return google.sheets({ version: 'v4', auth });
}

export async function syncFromGoogleSheets() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const range = "'Respostas ao formulário'!A:U"; // Adjust range to include all columns up to "Importado"

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SPREADSHEET_ID not found in environment variables.');
  }

  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values;
  if (!rows || rows.length <= 1) {
    return { imported: 0, message: 'No data found in spreadsheet.' };
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Find column indices
  const colIndex = (name: string) => headers.indexOf(name);
  
  const idx = {
    timestamp: colIndex('Carimbo de data/hora'),
    requester: colIndex('Nome do solicitante'),
    matricula: colIndex('Matrícula/SIAPE'),
    unit: colIndex('Departamento/Setor solicitante'),
    description: colIndex('Detalhamento'),
    details: colIndex('Local do serviço'),
    type: colIndex('Tipo de serviço'),
    email: colIndex('Endereço de e-mail'),
    photo: colIndex('Foto'),
    tombamento: colIndex('TOMBAMENTO'),
    modelo: colIndex('MODELO'),
    tipoEquip: colIndex('TIPO'),
    btus: colIndex("BTU'S"),
    urgency: colIndex('Grau de prioridade'),
    horaFin: colIndex('Hora de finalização'),
    dataFin: colIndex('Data de finalização'),
    professional: colIndex('Profissional que atendeu a solicitação'),
    servidorRepassou: colIndex('Servidor que repassou a solicitação'),
    observacao: colIndex('Observação'),
    imported: colIndex('Importado'),
  };

  let importedCount = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowIndex = i + 2; // +1 for header, +1 for 1-based indexing

    // Skip if already imported
    if (idx.imported !== -1 && row[idx.imported]) {
      continue;
    }

    const requestData: any = {
      description: row[idx.description] || 'Sem descrição',
      unit: row[idx.unit] || 'Sem unidade',
      responsibleServer: row[idx.requester] || 'Não informado',
      type: row[idx.type] || 'Geral',
      details: row[idx.details] || '',
      matriculaSiape: row[idx.matricula] || '',
      emailSolicitante: row[idx.email] || '',
      tombamento: row[idx.tombamento] || '',
      modeloEquipamento: row[idx.modelo] || '',
      tipoEquipamento: row[idx.tipoEquip] || '',
      btus: row[idx.btus] || '',
      urgency: row[idx.urgency] || 'Média',
      horaFinalizacao: row[idx.horaFin] || '',
      dataFinalizacao: row[idx.dataFin] || '',
      servidorRepassou: row[idx.servidorRepassou] || '',
      observacao: row[idx.observacao] || '',
      professionals: row[idx.professional] ? [row[idx.professional]] : [],
      images: row[idx.photo] ? [row[idx.photo]] : [],
    };

    try {
      await addRequest(requestData);
      importedCount++;

      // Mark as imported in Google Sheets
      const importColLetter = String.fromCharCode(65 + idx.imported);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'Respostas ao formulário'!${importColLetter}${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[new Date().toLocaleString('pt-BR')]],
        },
      });
    } catch (error) {
      console.error(`Error importing row ${rowIndex}:`, error);
    }
  }

  return { imported: importedCount };
}
