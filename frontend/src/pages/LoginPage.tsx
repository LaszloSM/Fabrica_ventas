import React, { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { loginWithGoogle, useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { setUser } = useAuth()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="glass-card p-12 flex flex-col items-center gap-8 w-full max-w-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-primary-container text-white flex items-center justify-center font-bold text-2xl font-display">
            C
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-brand-primary-container leading-none">CoimpactoB</h1>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mt-1 opacity-70">Impact CRM</p>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold text-on-surface">Bienvenido de vuelta</h2>
          <p className="text-sm text-on-surface-variant mt-1">Inicia sesión con tu cuenta corporativa</p>
        </div>

        <GoogleLogin
          onSuccess={async (res) => {
            setError(null)
            if (res.credential) {
              const user = await loginWithGoogle(res.credential)
              if (user) {
                setUser(user)
              } else {
                setError('El sistema de usuarios no está disponible. Intenta nuevamente en unos segundos.')
              }
            }
          }}
          onError={() => setError('No se pudo iniciar sesión con Google. Intenta de nuevo.')}
          useOneTap
        />

        {error && (
          <p className="text-sm text-red-500 text-center leading-snug">
            {error}
          </p>
        )}

        <p className="text-xs text-on-surface-variant text-center">
          Solo cuentas autorizadas de CoimpactoB pueden acceder.
        </p>
      </div>
    </div>
  )
}
