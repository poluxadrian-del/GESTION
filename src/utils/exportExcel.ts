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
