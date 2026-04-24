import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import { useGestores } from '@/hooks/useGestores'
import type { Gestor } from '@/types'
import GestoresTable from '@/components/gestores/GestoresTable'
import GestorForm from '@/components/gestores/GestorForm'

export default function GestoresPage() {
  const { obtenerGestores, crearGestor, actualizarGestor, eliminarGestor, loading } = useGestores()
  const [gestores, setGestores] = useState<Gestor[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingGestor, setEditingGestor] = useState<Gestor | null>(null)

  useEffect(() => {
    loadGestores()
  }, [])

  const loadGestores = async () => {
    const data = await obtenerGestores(false)
    setGestores(data)
  }

  const filteredGestores = gestores.filter(gestor =>
    gestor.nombre.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreateGestor = async (nombre: string) => {
    const newGestor = await crearGestor({ nombre })
    if (newGestor) {
      setGestores([newGestor, ...gestores])
      setShowForm(false)
    }
  }

  const handleUpdateGestor = async (nombre: string) => {
    if (!editingGestor) return
    const updated = await actualizarGestor(editingGestor.id, { nombre })
    if (updated) {
      setGestores(gestores.map(g => g.id === updated.id ? updated : g))
      setEditingGestor(null)
      setShowForm(false)
    }
  }

  const handleDeleteGestor = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este gestor?')) {
      const success = await eliminarGestor(id)
      if (success) {
        setGestores(gestores.filter(g => g.id !== id))
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gestores</h1>
        <button
          onClick={() => {
            setEditingGestor(null)
            setShowForm(!showForm)
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Nuevo Gestor
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        {showForm ? (
          <GestorForm
            gestor={editingGestor}
            onSubmit={editingGestor ? handleUpdateGestor : handleCreateGestor}
            onCancel={() => {
              setShowForm(false)
              setEditingGestor(null)
            }}
            loading={loading}
          />
        ) : (
          <>
            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar gestores..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <GestoresTable
              gestores={filteredGestores}
              loading={loading}
              onEditGestor={(gestor) => {
                setEditingGestor(gestor)
                setShowForm(true)
              }}
              onDeleteGestor={handleDeleteGestor}
            />
          </>
        )}
      </div>
    </div>
  )
}
