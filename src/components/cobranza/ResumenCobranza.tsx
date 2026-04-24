import { DollarSign, AlertCircle, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/utils/formatters'

interface ResumenCobranzaProps {
  resumen: any
}

export default function ResumenCobranza({ resumen }: ResumenCobranzaProps) {
  const cards = [
    {
      title: 'Pagos Pendientes',
      value: resumen?.pagosPendientes || 0,
      icon: DollarSign,
      color: 'blue',
    },
    {
      title: 'Pagos Vencidos',
      value: resumen?.pagosVencidos || 0,
      icon: AlertCircle,
      color: 'red',
    },
    {
      title: 'Monto Vencido',
      value: formatCurrency(resumen?.montoVencido || 0),
      icon: TrendingDown,
      color: 'orange',
      isAmount: true,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        const colors = {
          blue: 'bg-blue-50 text-blue-600 border-blue-200',
          red: 'bg-red-50 text-red-600 border-red-200',
          orange: 'bg-orange-50 text-orange-600 border-orange-200',
        }

        return (
          <div
            key={index}
            className={`${colors[card.color as keyof typeof colors]} border rounded-lg p-6 space-y-3`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{card.title}</h3>
              <Icon size={24} />
            </div>
            <p className={`text-2xl font-bold`}>
              {card.isAmount ? card.value : card.value}
            </p>
          </div>
        )
      })}
    </div>
  )
}
