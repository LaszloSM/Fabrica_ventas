'use client'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Briefcase } from 'lucide-react'
import { TeamSettings } from '@/components/settings/TeamSettings'
import { UserSettings } from '@/components/settings/UserSettings'

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 mt-1">Gestiona usuarios y equipo de ventas</p>
      </div>

      <Tabs defaultValue="team" className="space-y-6">
        <TabsList>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Equipo de Ventas
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Usuarios del Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <TeamSettings />
        </TabsContent>

        <TabsContent value="users">
          <UserSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
