import * as XLSX from 'xlsx';

export interface ClienteExcelRow {
  numero_contrato?: string;
  nombre_completo?: string;
  telefono_celular?: string;
  email?: string;
  ubicacion?: string;
  empresa?: string;
  telefono_empresa?: string;
  ref_nombre?: string;
  ref_telefono?: string;
  fecha_inicio?: string;
  precio_venta?: number;
  descuento?: number;
  numero_pagos?: number;
  frecuencia_pago?: string;
  mensualidades?: number;
  monto_pago?: number;
  dia_pago?: number;
  fecha_primer_pago?: string;
  vendedor?: string;
  factura?: boolean | string;
  comision?: boolean | string;
  estado?: string;
  notas?: string;
  gestor_nombre?: string;
}

// Función para convertir números de serie de Excel a fechas ISO
const convertirFechaExcel = (valor: any): string => {
  if (!valor) {
    return new Date().toISOString().split('T')[0];
  }

  // Si es un objeto Date (XLSX ya lo convirtió automáticamente)
  if (valor instanceof Date) {
    // Usar zona horaria local para evitar desfases con Supabase
    const year = valor.getFullYear();
    const month = String(valor.getMonth() + 1).padStart(2, '0');
    const day = String(valor.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Si ya es una cadena de fecha válida, devolverla
  if (typeof valor === 'string') {
    // Verificar si es una fecha ISO válida
    if (valor.includes('-') && /^\d{4}-\d{2}-\d{2}/.test(valor)) {
      return valor.split('T')[0];
    }
    
    // Si es un número como string, convertirlo
    const numeroSerie = parseFloat(valor);
    if (!isNaN(numeroSerie)) {
      return convertirFechaExcel(numeroSerie);
    }
    
    return new Date().toISOString().split('T')[0];
  }

  // Si es un número (serie de Excel)
  if (typeof valor === 'number') {
    // Excel cuenta desde 1900-01-01 (day 1)
    // 25568 es la diferencia correcta en días entre 1900-01-01 y 1970-01-01
    // (incluye el bug de Excel que cuenta 1900 como bisiesto)
    const EXCEL_EPOCH_OFFSET = 25568;
    
    const diasDesdeEpoch = valor - EXCEL_EPOCH_OFFSET;
    const milisegundos = diasDesdeEpoch * 24 * 60 * 60 * 1000;
    const fecha = new Date(milisegundos);
    
    // Validar que la fecha sea válida
    if (!isNaN(fecha.getTime())) {
      // Usar zona horaria local (no UTC) para que Supabase lo guarde correctamente
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return new Date().toISOString().split('T')[0];
};

export const importarClientesExcel = (file: File): Promise<ClienteExcelRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as ClienteExcelRow[];

        // Validar que hay datos
        if (jsonData.length === 0) {
          reject(new Error('El archivo Excel no contiene datos'));
          return;
        }

        // Procesar y limpiar datos
        const clientesProcessados = jsonData.map((row) => ({
          numero_contrato: String(row.numero_contrato || '').trim(),
          nombre_completo: String(row.nombre_completo || '').trim(),
          telefono_celular: String(row.telefono_celular || '').trim() || undefined,
          email: String(row.email || '').trim() || undefined,
          ubicacion: String(row.ubicacion || '').trim() || undefined,
          empresa: String(row.empresa || '').trim() || undefined,
          telefono_empresa: String(row.telefono_empresa || '').trim() || undefined,
          ref_nombre: String(row.ref_nombre || '').trim() || undefined,
          ref_telefono: String(row.ref_telefono || '').trim() || undefined,
          fecha_inicio: convertirFechaExcel(row.fecha_inicio),
          precio_venta: Number(row.precio_venta) || 0,
          descuento: Number(row.descuento) || 0,
          numero_pagos: Number(row.numero_pagos) || 12,
          frecuencia_pago: String(row.frecuencia_pago || 'mensual').trim(),
          mensualidades: Number(row.mensualidades) || 12,
          monto_pago: Number(row.monto_pago) || 0,
          dia_pago: Number(row.dia_pago) || 1,
          fecha_primer_pago: convertirFechaExcel(row.fecha_primer_pago),
          vendedor: String(row.vendedor || '').trim() || undefined,
          factura: row.factura === true || row.factura === 'true' || row.factura === 'sí' || row.factura === 'si',
          comision: row.comision === true || row.comision === 'true' || row.comision === 'sí' || row.comision === 'si',
          estado: String(row.estado || 'inicio').trim(),
          notas: String(row.notas || '').trim() || undefined,
          gestor_nombre: String(row.gestor_nombre || '').trim() || undefined,
        }));

        resolve(clientesProcessados);
      } catch (error) {
        reject(new Error(`Error al procesar el archivo: ${error instanceof Error ? error.message : 'desconocido'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsBinaryString(file);
  });
};

export const validarClientesExcel = (clientes: ClienteExcelRow[]): { validos: ClienteExcelRow[]; errores: { fila: number; error: string }[] } => {
  const validos: ClienteExcelRow[] = [];
  const errores: { fila: number; error: string }[] = [];

  clientes.forEach((cliente, index) => {
    const fila = index + 2; // +2 porque la fila 1 es encabezado y el índice es 0

    // Validar campos obligatorios
    if (!cliente.numero_contrato) {
      errores.push({ fila, error: 'número_contrato es obligatorio' });
      return;
    }

    if (!cliente.nombre_completo) {
      errores.push({ fila, error: 'nombre_completo es obligatorio' });
      return;
    }

    if (!cliente.precio_venta || cliente.precio_venta <= 0) {
      errores.push({ fila, error: 'precio_venta debe ser mayor a 0' });
      return;
    }

    if (!cliente.numero_pagos || cliente.numero_pagos <= 0) {
      errores.push({ fila, error: 'numero_pagos debe ser mayor a 0' });
      return;
    }

    // Validar formato de email si existe
    if (cliente.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.email)) {
      errores.push({ fila, error: 'formato de email inválido' });
      return;
    }

    // Validar frecuencia_pago
    if (cliente.frecuencia_pago && !['quincenal', 'mensual'].includes(cliente.frecuencia_pago)) {
      errores.push({ fila, error: 'frecuencia_pago debe ser "quincenal" o "mensual"' });
      return;
    }

    // Validar estado
    if (cliente.estado && !['inicio', 'activo', 'pausa', 'liquidado'].includes(cliente.estado)) {
      errores.push({ fila, error: 'estado debe ser "inicio", "activo", "pausa" o "liquidado"' });
      return;
    }

    validos.push(cliente);
  });

  return { validos, errores };
};
