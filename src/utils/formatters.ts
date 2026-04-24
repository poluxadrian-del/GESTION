/**
 * Utilidades para formateo de datos
 */

import { parseDateLocal } from './dateHelpers';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parseDateLocal(date));
}

export function formatDatetime(date: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function calculateDaysOverdue(dueDate: string): number {
  const today = new Date();
  const due = parseDateLocal(dueDate);
  const diff = today.getTime() - due.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getStatusColor(estado: string): string {
  const colors: Record<string, string> = {
    'activo': 'bg-green-100 text-green-800',
    'liquidado': 'bg-blue-100 text-blue-800',
    'pausa': 'bg-yellow-100 text-yellow-800',
    'inicio': 'bg-gray-100 text-gray-800',
    'pagado': 'bg-green-100 text-green-800',
    'vencido': 'bg-red-100 text-red-800',
    'pendiente': 'bg-yellow-100 text-yellow-800',
  };
  return colors[estado] || 'bg-gray-100 text-gray-800';
}

export function getSeverityColor(daysOverdue: number): string {
  if (daysOverdue < 0) return 'bg-green-100 text-green-800'; // Verde - no vencido
  if (daysOverdue <= 7) return 'bg-yellow-100 text-yellow-800'; // Amarillo - próximo a vencer
  if (daysOverdue <= 30) return 'bg-orange-100 text-orange-800'; // Naranja - vencido reciente
  return 'bg-red-100 text-red-800'; // Rojo - muy vencido
}
