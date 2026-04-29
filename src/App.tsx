import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ClientesPage from './pages/ClientesPage'
import GestoresPage from './pages/GestoresPage'
import CobranzaPage from './pages/CobranzaPage'
import ReportesPage from './pages/ReportesPage'
import ComisionesPage from './pages/ComisionesPage'
import RootLayout from './components/layout/RootLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'

function App() {
  const { loading, getCurrentUser } = useAuthStore()

  useEffect(() => {
    getCurrentUser()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando aplicación...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RootLayout>
                  <DashboardPage />
                </RootLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RootLayout>
                  <DashboardPage />
                </RootLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/clientes"
            element={
              <ProtectedRoute>
                <RootLayout>
                  <ClientesPage />
                </RootLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/gestores"
            element={
              <ProtectedRoute>
                <RootLayout>
                  <GestoresPage />
                </RootLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/cobranza"
            element={
              <ProtectedRoute>
                <RootLayout>
                  <CobranzaPage />
                </RootLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/reportes"
            element={
              <ProtectedRoute>
                <RootLayout>
                  <ReportesPage />
                </RootLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/comisiones"
            element={
              <ProtectedRoute>
                <RootLayout>
                  <ComisionesPage />
                </RootLayout>
              </ProtectedRoute>
            }
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </>
  )
}

export default App
