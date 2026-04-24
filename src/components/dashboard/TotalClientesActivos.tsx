import { AlertCircle } from 'lucide-react'

interface TotalClientesActivosProps {
  total: number;
  loading: boolean;
}

export default function TotalClientesActivos({ total, loading }: TotalClientesActivosProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">Clientes con Pagos Vencidos</p>
          <p className="text-4xl font-bold text-red-600 mt-2">
            {loading ? '...' : total}
          </p>
          <p className="text-xs text-gray-500 mt-2">Pendiente de cobro</p>
        </div>
        <div className="bg-red-100 rounded-full p-4">
          <AlertCircle className="text-red-600" size={32} />
        </div>
      </div>
    </div>
  )
}
