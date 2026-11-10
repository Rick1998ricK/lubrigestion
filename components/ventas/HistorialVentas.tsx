'use client'

import { fechaHoraLima } from '@/lib/fechas'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Item = { nombre: string; cantidad: number; subtotal: number; bonificacion: boolean }
type Venta = {
  id: number
  fecha: string
  total: number
  anulada: boolean
  motivo: string | null
  cliente: string
  vehiculo: string
  items: Item[]
}

const soles = (n: number) =>
  'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function HistorialVentas({ ventas, esAdmin }: { ventas: Venta[]; esAdmin: boolean }) {
  const router = useRouter()
  const [trabajando, setTrabajando] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [verAnuladas, setVerAnuladas] = useState(true)

  async function anular(v: Venta) {
    const motivo = window.prompt(
      `Anular la venta de ${v.cliente} por ${soles(v.total)}.\n\nEl stock de los productos volverá al inventario.\nMotivo de la anulación (obligatorio):`,
    )
    if (!motivo || !motivo.trim()) return

    setTrabajando(v.id)
    setError('')
    const { error } = await createClient().rpc('anular_venta', {
      p_venta_id: v.id,
      p_motivo: motivo,
    })
    setTrabajando(null)
    if (error) return setError(error.message)
    router.refresh()
  }

  const lista = verAnuladas ? ventas : ventas.filter((v) => !v.anulada)

  return (
    <>
      <label className="flex items-center gap-2 text-sm text-[#9FB3C8]">
        <input
          type="checkbox"
          checked={verAnuladas}
          onChange={(e) => setVerAnuladas(e.target.checked)}
          className="h-4 w-4 accent-[#FFC107]"
        />
        Mostrar ventas anuladas
      </label>
      {error && <p className="text-sm text-[#FF6B5E]">{error}</p>}
      {lista.length === 0 && <p className="text-sm text-[#9FB3C8]">No hay ventas para mostrar.</p>}

      <div className="space-y-3">
        {lista.map((v) => (
          <div
            key={v.id}
            className={`rounded-xl border bg-[#09243B] p-4 ${v.anulada ? 'border-[#FF6B5E]/40' : 'border-[#17496B]'}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`truncate font-semibold ${v.anulada ? 'text-[#9FB3C8] line-through' : 'text-[#F1F5F9]'}`}>
                  {v.cliente}
                </p>
                <p className="text-xs text-[#9FB3C8]">
                  N° {String(v.id).padStart(5, '0')} ·{' '}
                  {fechaHoraLima(v.fecha)}
                  {v.vehiculo ? ` · ${v.vehiculo}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {v.anulada && (
                  <span className="rounded-full bg-[#FF6B5E]/15 px-2 py-0.5 text-xs font-semibold text-[#FF6B5E]">
                    Anulada
                  </span>
                )}
                <span className={`font-display text-2xl ${v.anulada ? 'text-[#9FB3C8] line-through' : 'text-[#FFC107]'}`}>
                  {soles(v.total)}
                </span>
              </div>
            </div>

            <ul className="mt-2 space-y-0.5 text-sm text-[#F1F5F9]">
              {v.items.map((it, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {it.cantidad} × {it.nombre}
                    {it.bonificacion && <span className="ml-2 text-xs text-[#3DDC97]">bonificación</span>}
                  </span>
                  <span className="shrink-0 text-[#9FB3C8]">{soles(it.subtotal)}</span>
                </li>
              ))}
            </ul>

            {v.anulada && v.motivo && (
              <p className="mt-2 text-xs text-[#FF6B5E]">Motivo: {v.motivo}</p>
            )}

            {esAdmin && !v.anulada && (
              <button
                onClick={() => anular(v)}
                disabled={trabajando === v.id}
                className="mt-3 inline-flex items-center gap-1 rounded-lg border border-[#FF6B5E] px-3 py-1.5 text-sm font-semibold text-[#FF6B5E] hover:bg-[#FF6B5E] hover:text-[#061626] disabled:opacity-50"
              >
                <Ban size={15} /> {trabajando === v.id ? 'Anulando…' : 'Anular venta'}
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  )
}