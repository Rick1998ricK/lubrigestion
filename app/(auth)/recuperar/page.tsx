'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RecuperarPage() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error'))
      setError('El enlace no es válido o ya venció. Pide uno nuevo.')
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback`,
    })
    setLoading(false)
    if (error) {
      setError(
        /rate|limit/i.test(error.message)
          ? 'Se enviaron demasiados correos. Espera unos minutos e inténtalo de nuevo.'
          : 'No se pudo enviar el correo. Inténtalo más tarde.',
      )
      return
    }
    setEnviado(true)
  }

  return (
    <main className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-borde bg-tarjeta p-7 space-y-5">
        <div>
          <h1 className="font-display text-4xl font-bold leading-none">Recuperar acceso</h1>
          <p className="mt-2 text-sm text-suave">Te enviaremos un enlace para elegir una nueva contraseña.</p>
        </div>

        {enviado ? (
          <p className="rounded-lg bg-fondo p-4 text-sm">
            Si el correo está registrado, en unos minutos te llegará un enlace. Revisa también la carpeta de spam.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-semibold">Correo</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-borde bg-fondo px-3 py-3 text-texto outline-none focus:border-acento focus-visible:ring-2 focus-visible:ring-acento" />
            </div>
            {error && <p className="text-sm text-peligro">{error}</p>}
            <button disabled={loading}
              className="w-full rounded-lg bg-acento py-3 font-bold text-fondo disabled:opacity-60">
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </form>
        )}

        <Link href="/login" className="block text-center text-sm text-suave hover:text-acento">
          ← Volver al inicio de sesión
        </Link>
      </div>
    </main>
  )
}