import { signIn } from '@/auth'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-[#f26522] to-[#d5551a] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Fábrica de Ventas</h1>
          <p className="text-white/50 mt-1">CoimpactoB — Acceso del equipo</p>
        </div>
        <form action={async () => { 'use server'; await signIn('google', { redirectTo: '/dashboard' }) }} className="mt-6">
          <Button type="submit" className="w-full bg-gradient-to-r from-[#f26522] to-[#d5551a] hover:from-[#d5551a] hover:to-[#b54514] text-white border-0">
            Entrar con Google
          </Button>
        </form>
      </div>
    </div>
  )
}
