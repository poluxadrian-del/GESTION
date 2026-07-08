import * as XLSX from 'xlsx';

export interface ClienteActualizacionExcelRow {
  numero_contrato?: string;
  nuevo_contrato?: string;
  cargo?: string;
}

export const importarActualizacionesExcel = (file: File): Promise<ClienteActualizacionExcelRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as ClienteActualizacionExcelRow[];

        // Validar que hay datos
        if (jsonData.length === 0) {
          reject(new Error('El archivo Excel no contiene datos'));
          return;
        }

        // Procesar y limpiar datos
        const actualizacionesProcessadas = jsonData.map((row) => ({
          numero_contrato: String(row.numero_contrato || '').trim(),
          nuevo_contrato: String(row.nuevo_contrato || '').trim() || undefined,
          cargo: String(row.cargo || '').trim() || undefined,
        }));

        resolve(actualizacionesProcessadas);
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

export const validarActualizacionesExcel = (
  actualizaciones: ClienteActualizacionExcelRow[]
): { validas: ClienteActualizacionExcelRow[]; errores: { fila: number; error: string }[] } => {
  const validas: ClienteActualizacionExcelRow[] = [];
  const errores: { fila: number; error: string }[] = [];

  actualizaciones.forEach((row, index) => {
    const fila = index + 2; // +2 porque la fila 1 es encabezado y el índice es 0

    // Validar que numero_contrato existe
    if (!row.numero_contrato) {
      errores.push({ fila, error: 'numero_contrato es obligatorio' });
      return;
    }

    // Validar que al menos uno de los campos a actualizar existe
    if (!row.nuevo_contrato && !row.cargo) {
      errores.push({ fila, error: 'Debe especificar al menos nuevo_contrato o cargo' });
      return;
    }

    validas.push(row);
  });

  return { validas, errores };
};
