'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Prod = { id: number; etiqueta: string; stock: number; costo: number }
type Ajuste = {
  id: number
  producto: string
  anterior: number
  nuevo: number
  diferencia: number
  valor: number
  motivo: string
  fecha: string
}

const MOTIVOS = [
  'Conteo físico',
  'Rotura o merma',
  'Uso interno del taller',
  'Pérdida o robo',
  'Corrección de error de registro',
]

const input =
  'w-full rounded-lg border border-[#17496B] bg-[#061626] px-3 py-2 text-base text-[#F1F5F9] outline-none focus:border-[#FFC107] md:text-sm'
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-[#9FB3C8]'

const soles = (n: number) =>
  (n < 0 ? '-' : '') +
  'S/ ' + Math.abs(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function AjusteStock({ productos, ajustes }: { productos: Prod[]; ajustes: Ajuste[] }) {
  const router = useRouter()
  const [productoId, setProductoId] = useState('')
  const [real, setReal] = useState('')
  const [motivo, setMotivo] = useState(MOTIVOS[0])
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const prod = productos.find((p) => String(p.id) === productoId)
  const realNum = real === '' ? null : Number(real)
  const dif = prod && realNum != null ? realNum - prod.stock : null

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setOk('')
    if (!prod) return setError('Elige un producto.')
    if (realNum == null || !Number.isInteger(realNum) || realNum < 0)
      return setError('Ingresa el stock real contado (número entero, 0 o más).')
    if (dif === 0) return setError('El stock real es igual al del sistema.')

    const texto = nota.trim() ? `${motivo}: ${nota.trim()}` : motivo
    if (
      !confirm(
        `${prod.etiqueta}\nSistema: ${prod.stock} → Real: ${realNum} (${dif! > 0 ? '+' : ''}${dif})\nMotivo: ${texto}\n\n¿Confirmar el ajuste?`,
      )
    )
      return

    setGuardando(true)
    const { error } = await createClient().rpc('ajustar_stock', {
      p_producto_id: prod.id,
      p_stock_real: realNum,
      p_motivo: texto,
    })
    setGuardando(false)
    if (error) return setError(error.message)

    setOk('Ajuste registrado.')
    setProductoId('')
    setReal('')
    setNota('')
    router.refresh()
  }

  return (
    <>
      <form onSubmit={guardar} className="space-y-4 rounded-2xl border border-[#17496B] bg-[#09243B] p-5">
        <h2 className="font-display text-2xl uppercase tracking-wide text-[#FFC107]">Nuevo ajuste</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <span className={label}>Producto</span>
            <select className={input} value={productoId} onChange={(e) => setProductoId(e.target.value)}>
              <option value="">Elegir producto…</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.etiqueta} (sistema: {p.stock})
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={label}>Stock real contado</span>
            <input
              type="number" min={0} step={1} inputMode="numeric"
              className={input} value={real} onChange={(e) => setReal(e.target.value)}
            />
          </div>
          <div>
            <span className={label}>Motivo</span>
            <select className={input} value={motivo} onChange={(e) => setMotivo(e.target.value)}>
              {MOTIVOS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <span className={label}>Nota (opcional)</span>
            <input className={input} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: se rompió un envase al descargar" />
          </div>
        </div>

        {prod && dif != null && dif !== 0 && (
          <div className="rounded-lg bg-[#061626] p-3 text-sm">
            <span className="text-[#9FB3C8]">Diferencia: </span>
            <b className={dif > 0 ? 'text-[#3DDC97]' : 'text-[#FF6B5E]'}>
              {dif > 0 ? '+' : ''}{dif} unidad(es) · {soles(dif * prod.costo)} al costo
            </b>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            {error && <p className="text-[#FF6B5E]">{error}</p>}
            {ok && <p className="text-[#3DDC97]">{ok}</p>}
          </div>
          <button disabled={guardando} className="rounded-lg bg-[#FFC107] px-6 py-2.5 font-bold text-[#061626] disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Registrar ajuste'}
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="font-display text-2xl uppercase tracking-wide text-[#F1F5F9]">Historial de ajustes</h2>
        {ajustes.length === 0 && <p className="text-sm text-[#9FB3C8]">Aún no hay ajustes.</p>}
        {ajustes.map((a) => (
          <div
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#17496B] bg-[#09243B] p-4"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-[#F1F5F9]">{a.producto}</p>
              <p className="text-xs text-[#9FB3C8]">
                {new Date(a.fecha).toLocaleString('es-PE', {
                  timeZone: 'America/Lima',
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                · {a.motivo}
              </p>
            </div>
            <div className="text-right">
              <p className={`font-display text-2xl ${a.diferencia > 0 ? 'text-[#3DDC97]' : 'text-[#FF6B5E]'}`}>
                {a.anterior} → {a.nuevo} ({a.diferencia > 0 ? '+' : ''}{a.diferencia})
              </p>
              <p className="text-xs text-[#9FB3C8]">{soles(a.valor)} al costo</p>
            </div>
          </div>
        ))}
      </section>
    </>
  )
}