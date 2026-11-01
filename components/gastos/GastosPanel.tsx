'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Gasto = {
  id: number
  tipo: string
  proveedor_beneficiario: string | null
  ruc: string | null
  documento: string | null
  fecha: string
  monto: number
  medio_pago: string | null
  descripcion: string | null
  anulado?: boolean
}

const TIPOS: Record<string, string> = {
  alquiler: 'Alquiler',
  agua: 'Agua',
  luz: 'Luz',
  flete: 'Flete',
  otro: 'Otro',
}
const MEDIOS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  yape_plin: 'Yape / Plin',
}

const input =
  'w-full rounded-lg border border-[#17496B] bg-[#061626] px-3 py-2 text-base text-[#F1F5F9] outline-none focus:border-[#FFC107] md:text-sm'
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-[#9FB3C8]'

function soles(n: number) {
  return 'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function GastosPanel({ gastos, mes }: { gastos: Gasto[]; mes: string }) {
  const router = useRouter()
  const hoy = new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10)

  const [tipo, setTipo] = useState('alquiler')
  const [fecha, setFecha] = useState(hoy)
  const [monto, setMonto] = useState('')
  const [medio, setMedio] = useState('efectivo')
  const [beneficiario, setBeneficiario] = useState('')
  const [ruc, setRuc] = useState('')
  const [documento, setDocumento] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const delMes = gastos.filter((g) => !g.anulado && g.fecha.startsWith(mes))
  const totalMes = delMes.reduce((s, g) => s + g.monto, 0)
  const porTipo = Object.keys(TIPOS)
    .map((t) => ({ t, total: delMes.filter((g) => g.tipo === t).reduce((s, g) => s + g.monto, 0) }))
    .filter((x) => x.total > 0)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const m = Number(monto)
    if (!(m > 0)) return setError('Ingresa un monto mayor a 0.')

    setCargando(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('gastos').insert({
      tipo,
      fecha,
      monto: m,
      medio_pago: medio,
      proveedor_beneficiario: beneficiario.trim() || null,
      ruc: ruc.trim() || null,
      documento: documento.trim() || null,
      descripcion: descripcion.trim() || null,
      usuario_id: user?.id,
    })
    setCargando(false)
    if (error) return setError(error.message)

    setMonto('')
    setBeneficiario('')
    setRuc('')
    setDocumento('')
    setDescripcion('')
    router.refresh()
  }

  async function cancelar(id: number) {
    if (!confirm('¿Cancelar este gasto? Quedará en el historial pero no se sumará a los totales.')) return
    setError('')
    const supabase = createClient()
    const { data, error } = await supabase
      .from('gastos')
      .update({ anulado: true, anulado_en: new Date().toISOString() })
      .eq('id', id)
      .select('id')
    if (error) return setError(error.message)
    if (!data || data.length === 0)
      return setError('No se pudo cancelar: sin permiso o el gasto no existe.')
    router.refresh()
  }

  return (
    <>
      <div className="rounded-2xl border border-[#17496B] bg-[#09243B] p-5">
        <p className="text-xs uppercase tracking-wider text-[#9FB3C8]">Gastos de {mes}</p>
        <p className="font-display text-4xl text-[#FFC107]">{soles(totalMes)}</p>
        {porTipo.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {porTipo.map((x) => (
              <span key={x.t} className="rounded-full bg-[#061626] px-3 py-1 text-xs text-[#F1F5F9]">
                {TIPOS[x.t]}: <b className="text-[#FFC107]">{soles(x.total)}</b>
              </span>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={guardar}
        className="space-y-4 rounded-2xl border border-[#17496B] bg-[#09243B] p-5"
      >
        <h2 className="font-display text-2xl uppercase tracking-wide text-[#FFC107]">
          Registrar gasto
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <span className={label}>Tipo</span>
            <select className={input} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {Object.entries(TIPOS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <span className={label}>Fecha</span>
            <input type="date" className={input} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div>
            <span className={label}>Monto (S/)</span>
            <input
              type="number" min={0} step="0.01" inputMode="decimal"
              className={input} value={monto} onChange={(e) => setMonto(e.target.value)}
            />
          </div>
          <div>
            <span className={label}>Medio de pago</span>
            <select className={input} value={medio} onChange={(e) => setMedio(e.target.value)}>
              {Object.entries(MEDIOS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <span className={label}>Proveedor / beneficiario</span>
            <input className={input} value={beneficiario} onChange={(e) => setBeneficiario(e.target.value)} placeholder="Sedam, Electrocentro…" />
          </div>
          <div>
            <span className={label}>RUC</span>
            <input className={input} value={ruc} onChange={(e) => setRuc(e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <span className={label}>Documento</span>
            <input className={input} value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="Recibo / factura" />
          </div>
          <div className="md:col-span-4">
            <span className={label}>Descripción</span>
            <input className={input} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[#FF6B5E]">{error}</p>
          <button
            disabled={cargando}
            className="rounded-lg bg-[#FFC107] px-6 py-3 font-bold text-[#061626] disabled:opacity-50"
          >
            {cargando ? 'Guardando…' : 'Guardar gasto'}
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="font-display text-2xl uppercase tracking-wide text-[#F1F5F9]">
          Historial
        </h2>
        {gastos.length === 0 && <p className="text-sm text-[#9FB3C8]">Aún no hay gastos.</p>}
        {gastos.map((g) => (
          <div
            key={g.id}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#17496B] bg-[#09243B] p-4 ${
              g.anulado ? 'opacity-60' : ''
            }`}
          >
            <div className="min-w-0">
              <p className={`truncate font-semibold text-[#F1F5F9] ${g.anulado ? 'line-through' : ''}`}>
                {TIPOS[g.tipo]}
                {g.proveedor_beneficiario ? ` · ${g.proveedor_beneficiario}` : ''}
              </p>
              <p className="text-xs text-[#9FB3C8]">
                {g.fecha}
                {g.medio_pago ? ` · ${MEDIOS[g.medio_pago]}` : ''}
                {g.documento ? ` · ${g.documento}` : ''}
                {g.descripcion ? ` · ${g.descripcion}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`font-display text-2xl ${
                  g.anulado ? 'text-[#9FB3C8] line-through' : 'text-[#FFC107]'
                }`}
              >
                {soles(g.monto)}
              </span>
              {g.anulado ? (
                <span className="rounded-full bg-[#061626] px-3 py-1 text-xs font-semibold text-[#FF6B5E]">
                  Cancelado
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => cancelar(g.id)}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-[#FF6B5E] hover:bg-[#061626]"
                >
                  <Ban size={16} /> Cancelar
                </button>
              )}
            </div>
          </div>
        ))}
      </section>
    </>
  )
}