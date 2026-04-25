'use client'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Briefcase, Moon, Sun } from 'lucide-react'
import { TeamSettings } from '@/components/settings/TeamSettings'
import { UserSettings } from '@/components/settings/UserSettings'
import { useTheme } from '@/components/theme/ThemeProvider'
import { Button } from '@/components/ui/button'
import { colors, shadows } from '@/lib/design-system'

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Configuración</h1>
          <p className="text-sm text-[#64748B] mt-1">Gestiona usuarios, equipo y preferencias</p>
        </div>
        <Button
          variant="outline"
          onClick={toggleTheme}
          className="flex items-center gap-2 text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-[#F26522]" />
              Modo claro
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-[#64748B]" />
              Modo oscuro
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="team" className="space-y-6">
        <TabsList className="bg-[#F8FAFC] border border-[#E2E8F0]">
          <TabsTrigger
            value="team"
            className="flex items-center gap-2 text-xs data-[state=active]:bg-white data-[state=active]:text-[#F26522]"
          >
            <Briefcase className="w-4 h-4" />
            Equipo de Ventas
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="flex items-center gap-2 text-xs data-[state=active]:bg-white data-[state=active]:text-[#F26522]"
          >
            <Users className="w-4 h-4" />
            Usuarios del Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <div
            className="rounded-xl border border-[#E2E8F0] bg-white p-6"
            style={{ boxShadow: shadows.card }}
          >
            <TeamSettings />
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div
            className="rounded-xl border border-[#E2E8F0] bg-white p-6"
            style={{ boxShadow: shadows.card }}
          >
            <UserSettings />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
