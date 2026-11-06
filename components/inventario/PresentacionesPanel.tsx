'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { limpiarCachePresentaciones, ordenarPresentaciones } from '@/lib/presentaciones'

type Fila = { id: number; nombre: string; usos: number }

export default function PresentacionesPanel({ filas }: { filas: Fila[] }) {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const orden = ordenarPresentaciones(filas.map((f) => f.nombre))
  const lista = orden.map((n) => filas.find((f) => f.nombre === n)!)

  async function agregar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const n = nombre.trim().replace(/\s+/g, ' ')
    if (!n) return
    if (filas.some((f) => f.nombre.toLowerCase() === n.toLowerCase()))
      return setError('Esa presentación ya existe.')
    setOcupado(true)
    const { error } = await createClient().from('presentaciones').insert({ nombre: n })
    setOcupado(false)
    if (error) return setError(error.message)
    limpiarCachePresentaciones()
    setNombre('')
    router.refresh()
  }

  async function quitar(f: Fila) {
    const aviso =
      f.usos > 0
        ? `«${f.nombre}» la usan ${f.usos} producto(s). Ellos la conservan; solo dejará de ofrecerse en la lista. ¿Quitarla?`
        : `¿Quitar «${f.nombre}»?`
    if (!confirm(aviso)) return
    setError('')
    setOcupado(true)
    const { error } = await createClient().from('presentaciones').delete().eq('id', f.id)
    setOcupado(false)
    if (error) return setError(error.message)
    limpiarCachePresentaciones()
    router.refresh()
  }

  const campo =
    'rounded-lg border border-borde bg-fondo px-3 py-2.5 text-texto outline-none focus:border-acento focus-visible:ring-2 focus-visible:ring-acento'

  return (
    <div className="space-y-5">
      <form onSubmit={agregar} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="pres" className="text-sm font-semibold">Nueva presentación</label>
          <input
            id="pres" value={nombre} onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. 237 ml, 946 ml, 1.1 L" className={`${campo} w-64`}
          />
        </div>
        <button
          disabled={ocupado}
          className="inline-flex items-center gap-2 rounded-lg bg-acento px-4 py-2.5 font-bold text-fondo disabled:opacity-60"
        >
          <Plus size={18} /> Agregar
        </button>
      </form>
      <p className="text-xs text-suave">
        Escribe número y unidad (ml, L). Se ordenan solas de menor a mayor volumen.
      </p>
      {error && <p className="text-sm text-peligro">{error}</p>}

      {lista.length === 0 ? (
        <p className="text-sm text-suave">Aún no hay presentaciones propias.</p>
      ) : (
        <ul className="divide-y divide-borde/60 rounded-xl border border-borde bg-tarjeta">
          {lista.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-semibold">{f.nombre}</p>
                <p className="text-xs text-suave">
                  {f.usos === 0 ? 'Sin productos' : `${f.usos} producto(s)`}
                </p>
              </div>
              <button
                type="button" onClick={() => quitar(f)} disabled={ocupado}
                aria-label={`Quitar ${f.nombre}`}
                className="text-suave hover:text-peligro disabled:opacity-50"
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}