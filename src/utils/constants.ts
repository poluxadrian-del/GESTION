/**
 * Constantes de la aplicación
 */

export const ESTADOS_CLIENTE = {
  INICIO: 'inicio',
  ACTIVO: 'activo',
  PAUSA: 'pausa',
  LIQUIDADO: 'liquidado',
} as const;

export const ESTADOS_PAGO = {
  PENDIENTE: 'pendiente',
  PAGADO: 'pagado',
  VENCIDO: 'vencido',
} as const;

export const FRECUENCIAS_PAGO = {
  QUINCENAL: 'quincenal',
  MENSUAL: 'mensual',
} as const;

export const TIPOS_CONTACTO = {
  LLAMADA: 'llamada',
  WHATSAPP: 'whatsapp',
  EMAIL: 'email',
} as const;

export const RESULTADOS_CONTACTO = {
  CONTACTADO: 'contactado',
  NO_CONTESTO: 'no_contesto',
  PROMESA_PAGO: 'promesa_pago',
  NUMERO_INCORRECTO: 'numero_incorrecto',
} as const;

export const ROLES_USUARIO = {
  SOCIO: 'socio',
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
} as const;

/**
 * Mensajes de la aplicación
 */
export const MENSAJES = {
  EXITO: {
    CLIENTE_CREADO: 'Cliente creado exitosamente',
    CLIENTE_ACTUALIZADO: 'Cliente actualizado exitosamente',
    PAGO_REGISTRADO: 'Pago registrado exitosamente',
    GESTOR_CREADO: 'Gestor creado exitosamente',
    SEGUIMIENTO_REGISTRADO: 'Seguimiento registrado exitosamente',
  },
  ERROR: {
    CARGA_CLIENTE: 'Error al cargar cliente',
    CARGA_PAGOS: 'Error al cargar pagos',
    REGISTRO_PAGO: 'Error al registrar pago',
    ACCESO_DENEGADO: 'Acceso denegado',
  },
} as const;

/**
 * Límites y configuración
 */
export const CONFIG = {
  MESES_MIN: 2,
  MESES_MAX: 18,
  PAGINACION_TAMAÑO: 10,
  TIMEOUT_REINTENTOS_MS: 1000,
} as const;
