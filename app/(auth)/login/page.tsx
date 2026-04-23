import { signIn } from '@/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <CardTitle className="text-2xl">Fábrica de Ventas</CardTitle>
          <CardDescription>CoimpactoB — Acceso del equipo</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={async () => { 'use server'; await signIn('google', { redirectTo: '/dashboard' }) }}>
            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
              Entrar con Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
