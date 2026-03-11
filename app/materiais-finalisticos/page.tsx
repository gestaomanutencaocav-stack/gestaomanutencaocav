'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import MaterialsManager from '@/components/MaterialsManager';

export default function MateriaisFinalisticosPage() {
  return (
    <DashboardLayout title="Materiais Finalísticos">
      <MaterialsManager 
        title="Lista de Materiais Finalísticos" 
        description="Gestão de materiais destinados à atividade fim e projetos específicos."
      />
    </DashboardLayout>
  );
}
