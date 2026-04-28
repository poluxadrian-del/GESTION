/**
 * Tipos principales de la aplicación Formex
 */

// ============ AUTENTICACIÓN ============
export type UserRole = 'socio' | 'admin' | 'supervisor';

export interface Usuario {
  id: string;
  nombre_completo: string;
  email: string;
  rol: UserRole;
  activo: boolean;
  created_at: string;
}

// ============ GESTORES ============
export interface Gestor {
  id: string;
  nombre: string;
  activo: boolean;
  created_at: string;
}

// ============ CLIENTES ============
export type EstadoCliente = 'inicio' | 'activo' | 'pausa' | 'liquidado';
export type FrecuenciaPago = 'quincenal' | 'mensual';

export interface Cliente {
  id: string;
  numero_contrato: string;
  gestor_id: string;
  nombre_completo: string;
  telefono_celular?: string;
  email?: string;
  ubicacion?: string;
  empresa?: string;
  telefono_empresa?: string;
  ref_nombre?: string;
  ref_telefono?: string;
  // Datos del contrato
  fecha_inicio: string;
  precio_venta: number;
  descuento: number;
  total_pagado: number;
  saldo: number;
  meses_pagados: number;
  numero_pagos: number;
  frecuencia_pago: FrecuenciaPago;
  mensualidades: number;
  monto_pago: number;
  dia_pago: number;
  fecha_primer_pago: string;
  // Administrativo
  vendedor?: string;
  factura: boolean;
  comision: boolean;
  estado: EstadoCliente;
  notas?: string;
  created_at: string;
  updated_at: string;
  // Relaciones (joins)
  gestor?: {
    id: string;
    nombre: string;
  };
}

// ============ CALENDARIOS DE PAGOS (Plan de cobro) ============
export type EstadoCalendarioPago = 'pendiente' | 'parcialmente_pagado' | 'pagado';

/**
 * Plan de cobro del cliente
 * Una fila = Una cuota programada
 * Se genera automáticamente al crear el cliente
 */
export interface CalendarioPago {
  id: string;
  cliente_id: string;
  numero_cuota: number;  // 1, 2, 3...
  fecha_programada: string;  // Cuándo se debe cobrar
  monto_programado: number;  // Monto esperado
  estado: EstadoCalendarioPago;  // Estado de pago de esta cuota
  saldo_pendiente: number;  // Lo que falta por pagar
  notas?: string;
  created_at: string;
  updated_at: string;
  // Relaciones (joins)
  cliente?: {
    id: string;
    nombre_completo: string;
    numero_contrato: string;
  };
}

// ============ PAGOS REALIZADOS (Registro de pagos efectuados) ============
/**
 * Registro de TODOS los pagos del cliente
 * Una fila = Un pago realizado (puede ser parcial, total, o exceso)
 */
export interface PagoRealizado {
  id: string;
  cliente_id: string;
  gestor_id?: string;
  fecha_pago: string;  // Cuándo se pagó
  monto_pagado: number;  // Cuánto se pagó (FLEXIBLE - puede ser cualquier monto)
  notas?: string;
  created_at: string;
  // Reversión
  motivo_eliminacion?: string | null;  // Motivo por el que se reversó el pago
  fecha_eliminacion?: string | null;   // Cuándo se reversó
  // Relaciones (joins)
  cliente?: {
    id: string;
    nombre_completo: string;
    numero_contrato: string;
  };
  gestor?: {
    id: string;
    nombre: string;
  };
}

// ============ PAGOS (LEGACY - Compatibilidad hacia atrás) ============
export type EstadoPago = 'pendiente' | 'pagado' | 'vencido';

/**
 * @deprecated Usar CalendarioPago y PagoRealizado en su lugar
 * Esta interfaz se mantiene solo para compatibilidad con código existente
 */
export interface Pago {
  id: string;
  cliente_id: string;
  gestor_id: string;
  numero_pago: number;
  fecha_programada: string;
  fecha_pago?: string;
  monto_programado: number;
  monto_pagado: number;
  dias_atraso: number;
  estado: EstadoPago;
  notas?: string;
  created_at: string;
  // Relaciones (joins)
  cliente?: {
    id: string;
    nombre_completo: string;
    numero_contrato: string;
  };
  gestor?: {
    id: string;
    nombre: string;
  };
}

// ============ SEGUIMIENTOS ============
export type TipoContacto = 'llamada' | 'whatsapp' | 'email';
export type ResultadoContacto = 'contactado' | 'no_contesto' | 'promesa_pago' | 'numero_incorrecto';

export interface Seguimiento {
  id: string;
  cliente_id: string;
  usuario_id: string;
  tipo_contacto: TipoContacto;
  resultado: ResultadoContacto;
  fecha_contacto: string;
  notas?: string;
  created_at: string;
  // Relaciones (joins)
  usuario?: {
    id: string;
    nombre_completo: string;
  };
  cliente?: {
    id: string;
    nombre_completo: string;
  };
}
