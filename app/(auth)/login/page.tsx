'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }
    router.replace('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen grid place-items-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl border border-borde bg-tarjeta p-7 space-y-5">
        <div>
          <h1 className="font-display text-4xl font-bold leading-none">LubriGestión</h1>
          <p className="mt-2 text-sm text-suave">Inicia sesión para continuar</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-semibold">Correo</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-borde bg-fondo px-3 py-3 text-texto outline-none focus:border-acento focus-visible:ring-2 focus-visible:ring-acento" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-semibold">Contraseña</label>
          <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-borde bg-fondo px-3 py-3 text-texto outline-none focus:border-acento focus-visible:ring-2 focus-visible:ring-acento" />
        </div>
        {error && <p className="text-sm text-peligro">{error}</p>}
        <button disabled={loading}
          className="w-full rounded-lg bg-acento py-3 font-bold text-fondo disabled:opacity-60">
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
        <Link href="/recuperar" className="block text-center text-sm text-suave hover:text-acento">
          ¿Olvidaste tu contraseña?
        </Link>
      </form>
    </main>
  )
}