import { TrendingUp } from 'lucide-react'

interface ClientePorGestorData {
  gestorId: string;
  gestor: {
    id: string;
    nombre: string;
  } | null;
  totalClientes: number;
  clientesCobrados: number;
  porcentajeCobrado: number;
}

interface PorcentajeCobranzaPorGestorProps {
  datos: ClientePorGestorData[];
  loading: boolean;
}

export default function PorcentajeCobranzaPorGestor({ datos, loading }: PorcentajeCobranzaPorGestorProps) {
  const getColorPorcentaje = (porcentaje: number): string => {
    if (porcentaje >= 80) return 'bg-green-100 text-green-700 border-green-300';
    if (porcentaje >= 60) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    if (porcentaje >= 40) return 'bg-orange-100 text-orange-700 border-orange-300';
    return 'bg-red-100 text-red-700 border-red-300';
  };

  const getBarColorPorcentaje = (porcentaje: number): string => {
    if (porcentaje >= 80) return 'bg-green-500';
    if (porcentaje >= 60) return 'bg-yellow-500';
    if (porcentaje >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-purple-600" />
          Cobranza por Gestor (%)
        </h3>
        <div className="text-center py-8 text-gray-500">Cargando datos...</div>
      </div>
    )
  }

  if (datos.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-purple-600" />
          Cobranza por Gestor (%)
        </h3>
        <div className="text-center py-8 text-gray-500">No hay datos disponibles</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <TrendingUp size={20} className="text-purple-600" />
        Cobranza por Gestor (%)
      </h3>
      
      <div className="space-y-4">
        {datos.map((item) => (
          <div key={item.gestorId} className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                {item.gestor?.nombre || 'Gestor desconocido'}
              </p>
              <span className={`text-xs font-bold px-2 py-1 rounded border ${getColorPorcentaje(item.porcentajeCobrado)}`}>
                {item.porcentajeCobrado}% ({item.clientesCobrados}/{item.totalClientes})
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getBarColorPorcentaje(item.porcentajeCobrado)}`}
                style={{ width: `${item.porcentajeCobrado}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Leyenda de colores */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs font-semibold text-gray-600 mb-2">Leyenda de Desempeño:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-600">≥80% Excelente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-gray-600">60-79% Bueno</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span className="text-gray-600">40-59% Regular</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-600">&lt;40% Crítico</span>
          </div>
        </div>
      </div>
    </div>
  )
}
