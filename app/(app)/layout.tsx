import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {children}
        <MobileNav />
      </main>
    </div>
  )
}
