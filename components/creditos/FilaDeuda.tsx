'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fechaCorta, hoyLima, soles, type Deuda } from '@/lib/creditos'

const MEDIOS = [
  { v: 'efectivo', t: 'Efectivo' },
  { v: 'yape_plin', t: 'Yape / Plin' },
  { v: 'transferencia', t: 'Transferencia' },
  { v: 'tarjeta', t: 'Tarjeta' },
]

const campo =
  'rounded-lg border border-borde bg-fondo px-3 py-2 text-texto outline-none focus-visible:ring-2 focus-visible:ring-acento'

export default function FilaDeuda({ d, onCobrado }: { d: Deuda; onCobrado: () => void }) {
  const [abierto, setAbierto] = useState(false)
  const [monto, setMonto] = useState(d.saldo.toFixed(2))
  const [medio, setMedio] = useState('efectivo')
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const vencida = !!d.fecha_prometida && d.fecha_prometida < hoyLima()

  async function cobrar() {
    const m = Number(monto)
    if (!Number.isFinite(m) || m <= 0) {
      setError('Escribe un monto válido')
      return
    }
    setGuardando(true)
    setError(null)
    const { error } = await createClient().rpc('cobrar_credito', {
      p_venta_id: d.venta_id,
      p_monto: m,
      p_medio: medio,
      p_nota: nota,
    })
    setGuardando(false)
    if (error) {
      setError(error.message)
      return
    }
    setAbierto(false)
    onCobrado()
  }

  return (
    <li className="space-y-2 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-sm">
          <p className="font-semibold">
            Venta N.º {String(d.venta_id).padStart(5, '0')} · {fechaCorta(d.fecha_venta)}
          </p>
          <p className={vencida ? 'text-peligro' : 'text-suave'}>
            Total {soles(d.total)}
            {d.pagado > 0 ? ` · pagó ${soles(d.pagado)}` : ''}
            {d.fecha_prometida ? ` · promete pagar el ${fechaCorta(d.fecha_prometida)}` : ''}
            {vencida ? ' (vencido)' : ''}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-xl font-bold tabular-nums">{soles(d.saldo)}</p>
          <button
            type="button"
            onClick={() => setAbierto((a) => !a)}
            className="text-sm font-semibold text-acento hover:underline"
          >
            {abierto ? 'Cerrar' : 'Cobrar'}
          </button>
        </div>
      </div>

      {abierto && (
        <div className="grid gap-2 rounded-lg border border-borde bg-fondo p-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-semibold">Monto a cobrar (S/)</span>
            <input
              type="number"
              min={0.01}
              step="0.01"
              value={monto}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setMonto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault() // no enviar el formulario de la venta
                  cobrar()
                }
              }}
              className={`${campo} w-full`}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold">Medio de pago</span>
            <select value={medio} onChange={(e) => setMedio(e.target.value)} className={`${campo} w-full`}>
              {MEDIOS.map((m) => (
                <option key={m.v} value={m.v}>{m.t}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-semibold">Nota (opcional)</span>
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault()
              }}
              placeholder="Ej. dejó a cuenta"
              className={`${campo} w-full`}
            />
          </label>
          {error && <p className="text-sm text-peligro sm:col-span-2">{error}</p>}
          <button
            type="button"
            disabled={guardando}
            onClick={cobrar}
            className="rounded-lg bg-acento py-2.5 text-sm font-bold text-fondo disabled:opacity-60 sm:col-span-2"
          >
            {guardando ? 'Guardando...' : 'Registrar cobro'}
          </button>
        </div>
      )}
    </li>
  )
}