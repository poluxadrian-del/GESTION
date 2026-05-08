import * as XLSX from 'xlsx';

export const exportarExcel = (
  datos: any[],
  nombreArchivo: string,
  nombreHoja: string = 'Reporte'
) => {
  if (datos.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  // Crear workbook y worksheet
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja);

  // Ajustar ancho de columnas
  const colWidths = Object.keys(datos[0]).map(key => ({
    wch: Math.min(Math.max(key.length, 15), 30)
  }));
  ws['!cols'] = colWidths;

  // Aplicar formato a fechas y números
  const columnKeys = Object.keys(datos[0]);
  
  for (let i = 0; i < datos.length; i++) {
    columnKeys.forEach((columnKey, colIndex) => {
      // Calcular dirección de celda (A2, B2, etc.) - fila 2 en adelante (1 es header)
      const cellAddress = XLSX.utils.encode_cell({ r: i + 1, c: colIndex });
      const cell = ws[cellAddress];
      
      if (cell) {
        const originalValue = datos[i][columnKey];
        
        // Si es una fecha (detección en formato YYYY-MM-DD)
        if (typeof originalValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(originalValue)) {
          // Convertir string a número serial de Excel
          const [year, month, day] = originalValue.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          // Calcular número serial: días desde 30/12/1899
          const serial = Math.floor((date.getTime() - new Date(1899, 11, 30).getTime()) / 86400000) + 1;
          cell.v = serial;
          cell.t = 'n';
          cell.z = 'dd/mm/yyyy';
        }
        // Si es un número formateado como moneda o detectado como tal
        else if (typeof originalValue === 'string' && originalValue.match(/^\$[\d,]+\.?\d*$/)) {
          const numValue = parseFloat(originalValue.replace(/[$,]/g, ''));
          cell.v = numValue;
          cell.t = 'n';
          cell.z = '#,##0';
        }
        // Si ya es un número y corresponde a moneda
        else if (typeof originalValue === 'number' && 
                 (columnKey.toLowerCase().includes('total') || 
                  columnKey.toLowerCase().includes('monto') ||
                  columnKey.toLowerCase().includes('precio') ||
                  columnKey.toLowerCase().includes('saldo') ||
                  columnKey.toLowerCase().includes('pagado') ||
                  columnKey.toLowerCase().includes('venta'))) {
          cell.z = '#,##0';
        }
      }
    });
  }

  // Descargar archivo
  XLSX.writeFile(wb, `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportarPlantillaClientes = () => {
  const plantilla = [
    {
      numero_contrato: 'CONT001',
      nombre_completo: 'Juan Pérez García',
      telefono_celular: '3001234567',
      email: 'juan@example.com',
      ubicacion: 'Bogotá',
      empresa: 'Empresa XYZ',
      telefono_empresa: '6015551234',
      ref_nombre: 'Carlos López',
      ref_telefono: '3009876543',
      gestor_nombre: 'María González',
      fecha_inicio: new Date().toISOString().split('T')[0],
      precio_venta: 10000,
      descuento: 500,
      numero_pagos: 12,
      frecuencia_pago: 'mensual',
      mensualidades: 12,
      monto_pago: 791.67,
      dia_pago: 15,
      fecha_primer_pago: new Date().toISOString().split('T')[0],
      vendedor: 'Pedro Sánchez',
      factura: true,
      comision: true,
      estado: 'activo',
      notas: 'Cliente preferencial'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(plantilla);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

  // Ajustar ancho de columnas
  ws['!cols'] = [
    { wch: 15 }, // numero_contrato
    { wch: 20 }, // nombre_completo
    { wch: 15 }, // telefono_celular
    { wch: 20 }, // email
    { wch: 15 }, // ubicacion
    { wch: 15 }, // empresa
    { wch: 15 }, // telefono_empresa
    { wch: 15 }, // ref_nombre
    { wch: 15 }, // ref_telefono
    { wch: 15 }, // gestor_nombre
    { wch: 15 }, // fecha_inicio
    { wch: 12 }, // precio_venta
    { wch: 12 }, // descuento
    { wch: 14 }, // numero_pagos
    { wch: 16 }, // frecuencia_pago
    { wch: 14 }, // mensualidades
    { wch: 12 }, // monto_pago
    { wch: 10 }, // dia_pago
    { wch: 18 }, // fecha_primer_pago
    { wch: 15 }, // vendedor
    { wch: 10 }, // factura
    { wch: 10 }, // comision
    { wch: 15 }, // estado
    { wch: 30 }  // notas
  ];

  XLSX.writeFile(wb, `Plantilla_Clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
};
