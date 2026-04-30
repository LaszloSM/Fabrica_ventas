import React, { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { Sidebar } from './components/layout/Sidebar'
import { TopNav } from './components/layout/TopNav'
import { DashboardView } from './views/DashboardView'
import { PipelineView } from './views/PipelineView'
import { OpportunitiesView } from './views/OpportunitiesView'
import { OpportunityDetailView } from './views/OpportunityDetailView'
import { AccountsView } from './views/AccountsView'
import { ContactsView } from './views/ContactsView'
import { ActivitiesView } from './views/ActivitiesView'
import { GoalsView } from './views/GoalsView'
import { ReportsView } from './views/ReportsView'
import { SettingsView } from './views/SettingsView'
import { NewOpportunityModal } from './components/modals/NewOpportunityModal'

export type ViewType =
  | 'dashboard' | 'pipeline' | 'opportunities' | 'opportunity-detail'
  | 'accounts' | 'contacts' | 'activities' | 'goals' | 'reports' | 'settings'

const ROUTE_TO_VIEW: Record<string, ViewType> = {
  '/dashboard': 'dashboard',
  '/pipeline': 'pipeline',
  '/oportunidades': 'opportunities',
  '/cuentas': 'accounts',
  '/contactos': 'contacts',
  '/actividades': 'activities',
  '/metas': 'goals',
  '/reportes': 'reports',
  '/configuracion': 'settings',
}

const VIEW_TO_ROUTE: Record<ViewType, string> = {
  dashboard: '/dashboard',
  pipeline: '/pipeline',
  opportunities: '/oportunidades',
  'opportunity-detail': '/oportunidades',
  accounts: '/cuentas',
  contacts: '/contactos',
  activities: '/actividades',
  goals: '/metas',
  reports: '/reportes',
  settings: '/configuracion',
}

function getInitialView(): ViewType {
  return ROUTE_TO_VIEW[window.location.pathname] ?? 'dashboard'
}

function AppShell() {
  const { user, loading } = useAuth()
  const [view, setView] = useState<ViewType>(getInitialView)
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigateTo = useCallback((v: ViewType) => {
    setView(v)
    window.history.pushState({}, '', VIEW_TO_ROUTE[v])
    setSidebarOpen(false)
  }, [])

  useEffect(() => {
    const onPop = () => {
      setView(ROUTE_TO_VIEW[window.location.pathname] ?? 'dashboard')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="text-on-surface-variant text-sm">Cargando...</div>
    </div>
  )

  if (!user) return <LoginPage />

  const goToDetail = (id: string) => {
    setSelectedDealId(id)
    setView('opportunity-detail')
    window.history.pushState({}, '', VIEW_TO_ROUTE['opportunity-detail'])
  }

  const views: Record<ViewType, React.ReactNode> = {
    dashboard: <DashboardView key={refreshKey} onDealClick={goToDetail} />,
    pipeline: <PipelineView key={refreshKey} onDealClick={goToDetail} />,
    opportunities: <OpportunitiesView key={refreshKey} onDealClick={goToDetail} onNewDeal={() => setModalOpen(true)} />,
    'opportunity-detail': <OpportunityDetailView id={selectedDealId!} onBack={() => navigateTo('opportunities')} />,
    accounts: <AccountsView key={refreshKey} onDealClick={goToDetail} />,
    contacts: <ContactsView key={refreshKey} />,
    activities: <ActivitiesView key={refreshKey} />,
    goals: <GoalsView key={refreshKey} />,
    reports: <ReportsView />,
    settings: <SettingsView />,
  }

  return (
    <div className="flex min-h-screen bg-surface">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar currentView={view} onViewChange={navigateTo} onNewOpportunity={() => setModalOpen(true)} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 lg:ml-[240px] flex flex-col min-w-0">
        <TopNav key={view} onMenuClick={() => setSidebarOpen(o => !o)} />
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-8 lg:p-12 max-w-7xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {views[view]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
      <NewOpportunityModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setRefreshKey(k => k + 1) }}
      />
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppShell /></AuthProvider>
}
