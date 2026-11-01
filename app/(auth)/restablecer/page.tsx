'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RestablecerPage() {
  const router = useRouter()
  const [pass, setPass] = useState('')
  const [repite, setRepite] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (pass.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    if (pass !== repite) return setError('Las contraseñas no coinciden.')
    setLoading(true)
    const { error } = await createClient().auth.updateUser({ password: pass })
    setLoading(false)
    if (error) return setError(error.message)
    router.replace('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen grid place-items-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl border border-borde bg-tarjeta p-7 space-y-5">
        <div>
          <h1 className="font-display text-4xl font-bold leading-none">Nueva contraseña</h1>
          <p className="mt-2 text-sm text-suave">Elige una contraseña de al menos 8 caracteres.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="pass" className="text-sm font-semibold">Nueva contraseña</label>
          <input id="pass" type="password" required value={pass} onChange={(e) => setPass(e.target.value)}
            className="w-full rounded-lg border border-borde bg-fondo px-3 py-3 text-texto outline-none focus:border-acento focus-visible:ring-2 focus-visible:ring-acento" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="repite" className="text-sm font-semibold">Repítela</label>
          <input id="repite" type="password" required value={repite} onChange={(e) => setRepite(e.target.value)}
            className="w-full rounded-lg border border-borde bg-fondo px-3 py-3 text-texto outline-none focus:border-acento focus-visible:ring-2 focus-visible:ring-acento" />
        </div>
        {error && <p className="text-sm text-peligro">{error}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-acento py-3 font-bold text-fondo disabled:opacity-60">
          {loading ? 'Guardando...' : 'Guardar y entrar'}
        </button>
      </form>
    </main>
  )
}