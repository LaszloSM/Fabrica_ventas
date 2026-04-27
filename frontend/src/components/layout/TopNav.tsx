import React, { useState } from 'react'
import { Search, Bell, Settings } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export function TopNav() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')

  return (
    <header className="h-16 border-b border-outline-variant bg-white/80 backdrop-blur-md sticky top-0 z-40 flex justify-between items-center px-8">
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar registros, actividades..."
          className="w-full bg-surface border border-outline-variant rounded-full py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary-container transition-all"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="h-6 w-px bg-outline-variant mx-2" />
        <div className="flex items-center gap-2">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full">
            <Bell size={20} />
          </button>
          <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full">
            <Settings size={20} />
          </button>
          <div className="ml-2 w-8 h-8 rounded-full border border-outline-variant bg-brand-primary-container text-white flex items-center justify-center text-xs font-bold select-none">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
        </div>
      </div>
    </header>
  )
}
