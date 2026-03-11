'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import MaterialsManager from '@/components/MaterialsManager';

export default function MateriaisEstoquePage() {
  return (
    <DashboardLayout title="Materiais em Estoque">
      <MaterialsManager 
        title="Materiais em Estoque" 
        description="Controle de insumos, peças e materiais armazenados no almoxarifado central."
        type="estoque"
      />
    </DashboardLayout>
  );
}
