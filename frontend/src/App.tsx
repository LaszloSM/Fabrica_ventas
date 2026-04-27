import React, { useState } from 'react'
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

function AppShell() {
  const { user, loading } = useAuth()
  const [view, setView] = useState<ViewType>('dashboard')
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="text-on-surface-variant text-sm">Cargando...</div>
    </div>
  )

  if (!user) return <LoginPage />

  const goToDetail = (id: string) => { setSelectedDealId(id); setView('opportunity-detail') }

  const views: Record<ViewType, React.ReactNode> = {
    dashboard: <DashboardView key={refreshKey} onDealClick={goToDetail} />,
    pipeline: <PipelineView key={refreshKey} onDealClick={goToDetail} />,
    opportunities: <OpportunitiesView key={refreshKey} onDealClick={goToDetail} onNewDeal={() => setModalOpen(true)} />,
    'opportunity-detail': <OpportunityDetailView id={selectedDealId!} onBack={() => setView('opportunities')} />,
    accounts: <AccountsView key={refreshKey} />,
    contacts: <ContactsView key={refreshKey} />,
    activities: <ActivitiesView key={refreshKey} />,
    goals: <GoalsView key={refreshKey} />,
    reports: <ReportsView />,
    settings: <SettingsView />,
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar currentView={view} onViewChange={setView} onNewOpportunity={() => setModalOpen(true)} />
      <main className="flex-1 ml-[240px] flex flex-col min-w-0">
        <TopNav />
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
