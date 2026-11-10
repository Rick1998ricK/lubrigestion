'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Resumen = {
  fecha: string
  abierta: boolean
  cerrada: boolean
  inicial: number
  final: number | null
  observaciones: string | null
  ventas_efectivo: number
  ventas_otros: Record<string, number>
  gastos_efectivo: number
  compras_efectivo: number
  ventas_credito?: number
  cobros_efectivo?: number
  cobros_otros?: Record<string, number>
  esperado: number
}
type Hist = {
  id: number
  fecha: string
  inicial: number
  final: number | null
  esperado: number | null
  obs: string | null
}

const OTROS: Record<string, string> = {
  yape_plin: 'Yape / Plin',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
}

const card = 'rounded-2xl border border-[#17496B] bg-[#09243B] p-5'
const input =
  'w-full rounded-lg border border-[#17496B] bg-[#061626] px-3 py-2 text-base text-[#F1F5F9] outline-none focus:border-[#FFC107] md:text-sm'
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-[#9FB3C8]'

const soles = (n: number) =>
  (n < 0 ? '-' : '') +
  'S/ ' + Math.abs(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Linea({ t, v, signo, fuerte }: { t: string; v: number; signo?: '+' | '−'; fuerte?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-2 text-sm ${fuerte ? 'border-t border-[#17496B] pt-3' : ''}`}>
      <span className={fuerte ? 'font-semibold text-[#F1F5F9]' : 'text-[#9FB3C8]'}>
        {signo ? `${signo} ` : ''}{t}
      </span>
      <span className={fuerte ? 'font-display text-2xl text-[#FFC107]' : 'text-[#F1F5F9]'}>{soles(v)}</span>
    </div>
  )
}

export default function CajaPanel({ resumen: r, historial }: { resumen: Resumen; historial: Hist[] }) {
  const router = useRouter()
  const [inicial, setInicial] = useState('')
  const [contado, setContado] = useState('')
  const [obs, setObs] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState('')

  const contadoNum = contado === '' ? null : Number(contado)
  const dif = contadoNum == null ? null : contadoNum - r.esperado
  const otros = Object.entries(r.ventas_otros ?? {})
  const cobrosOtros = Object.entries(r.cobros_otros ?? {})

  async function abrir(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (inicial === '' || Number(inicial) < 0) return setError('Ingresa el efectivo con el que abres (puede ser 0).')
    setTrabajando(true)
    const { error } = await createClient().rpc('abrir_caja', { p_inicial: Number(inicial) })
    setTrabajando(false)
    if (error) return setError(error.message)
    setInicial('')
    router.refresh()
  }

  async function cerrar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (contadoNum == null || contadoNum < 0) return setError('Ingresa el efectivo que contaste en caja.')
    if (!confirm(`Efectivo esperado: ${soles(r.esperado)}\nEfectivo contado: ${soles(contadoNum)}\n\n¿Cerrar la caja de hoy? No se podrá reabrir.`))
      return
    setTrabajando(true)
    const { error } = await createClient().rpc('cerrar_caja', { p_final: contadoNum, p_obs: obs })
    setTrabajando(false)
    if (error) return setError(error.message)
    setContado('')
    setObs('')
    router.refresh()
  }

  return (
    <>
      <p className="text-sm text-[#9FB3C8]">Hoy: {r.fecha}</p>

      {!r.abierta && (
        <form onSubmit={abrir} className={`${card} max-w-md space-y-4`}>
          <h2 className="font-display text-2xl uppercase tracking-wide text-[#FFC107]">Abrir caja</h2>
          <div>
            <span className={label}>Efectivo con el que inicias (S/)</span>
            <input
              type="number" min={0} step="0.01" inputMode="decimal"
              className={input} value={inicial} onChange={(e) => setInicial(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-[#FF6B5E]">{error}</p>}
          <button disabled={trabajando} className="rounded-lg bg-[#FFC107] px-6 py-2.5 font-bold text-[#061626] disabled:opacity-50">
            {trabajando ? 'Abriendo…' : 'Abrir caja'}
          </button>
        </form>
      )}

      {r.abierta && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className={card}>
            <h2 className="mb-2 font-display text-2xl uppercase tracking-wide text-[#F1F5F9]">
              Movimiento del día
            </h2>
            <Linea t="Efectivo inicial" v={r.inicial} />
            <Linea t="Ventas en efectivo" v={r.ventas_efectivo} signo="+" />
            <Linea t="Cobros de créditos en efectivo" v={r.cobros_efectivo ?? 0} signo="+" />
            <Linea t="Gastos pagados en efectivo" v={r.gastos_efectivo} signo="−" />
            <Linea t="Compras pagadas en efectivo" v={r.compras_efectivo} signo="−" />
            <Linea t="Efectivo esperado en caja" v={r.esperado} fuerte />
            {(otros.length > 0 || cobrosOtros.length > 0 || (r.ventas_credito ?? 0) > 0) && (
              <div className="mt-4 space-y-1 rounded-lg bg-[#061626] p-3 text-sm">
                {(otros.length > 0 || cobrosOtros.length > 0) && (
                  <p className="mb-1 text-xs uppercase tracking-wider text-[#9FB3C8]">Cobrado fuera del cajón</p>
                )}
                {otros.map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[#F1F5F9]">
                    <span>{OTROS[k] ?? k}</span>
                    <span>{soles(Number(v))}</span>
                  </div>
                ))}
                {cobrosOtros.map(([k, v]) => (
                  <div key={`c-${k}`} className="flex justify-between text-[#F1F5F9]">
                    <span>{OTROS[k] ?? k} (cobro de crédito)</span>
                    <span>{soles(Number(v))}</span>
                  </div>
                ))}
                {(r.ventas_credito ?? 0) > 0 && (
                  <div className="flex justify-between border-t border-[#17496B] pt-2 text-[#FFC107]">
                    <span>Vendido a crédito hoy (no suma a la caja)</span>
                    <span>{soles(r.ventas_credito ?? 0)}</span>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className={card}>
            {r.cerrada ? (
              <>
                <h2 className="mb-2 font-display text-2xl uppercase tracking-wide text-[#3DDC97]">Caja cerrada</h2>
                <Linea t="Efectivo contado" v={r.final ?? 0} />
                <Linea t="Efectivo esperado" v={r.esperado} />
                <Linea t="Diferencia" v={(r.final ?? 0) - r.esperado} fuerte />
                {r.observaciones && <p className="mt-2 text-sm text-[#9FB3C8]">Obs.: {r.observaciones}</p>}
              </>
            ) : (
              <form onSubmit={cerrar} className="space-y-4">
                <h2 className="font-display text-2xl uppercase tracking-wide text-[#FFC107]">Cerrar caja</h2>
                <div>
                  <span className={label}>Efectivo contado (S/)</span>
                  <input
                    type="number" min={0} step="0.01" inputMode="decimal"
                    className={input} value={contado} onChange={(e) => setContado(e.target.value)}
                  />
                </div>
                {dif != null && (
                  <div className="rounded-lg bg-[#061626] p-3 text-sm">
                    <span className="text-[#9FB3C8]">Diferencia: </span>
                    <b className={Math.abs(dif) < 0.005 ? 'text-[#3DDC97]' : dif > 0 ? 'text-[#FFC107]' : 'text-[#FF6B5E]'}>
                      {Math.abs(dif) < 0.005 ? 'Cuadra exacto' : `${dif > 0 ? 'Sobran' : 'Faltan'} ${soles(Math.abs(dif))}`}
                    </b>
                  </div>
                )}
                <div>
                  <span className={label}>Observaciones {dif != null && Math.abs(dif) >= 0.005 ? '(obligatorio si hay diferencia)' : '(opcional)'}</span>
                  <input className={input} value={obs} onChange={(e) => setObs(e.target.value)} />
                </div>
                {error && <p className="text-sm text-[#FF6B5E]">{error}</p>}
                <button disabled={trabajando} className="rounded-lg bg-[#FFC107] px-6 py-2.5 font-bold text-[#061626] disabled:opacity-50">
                  {trabajando ? 'Cerrando…' : 'Cerrar caja'}
                </button>
              </form>
            )}
          </section>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-2xl uppercase tracking-wide text-[#F1F5F9]">Últimos cierres</h2>
        {historial.length === 0 && <p className="text-sm text-[#9FB3C8]">Aún no hay cajas.</p>}
        {historial.map((h) => {
          const dif = h.final != null && h.esperado != null ? h.final - h.esperado : null
          return (
            <div key={h.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#17496B] bg-[#09243B] p-4">
              <div>
                <p className="font-semibold text-[#F1F5F9]">{h.fecha}</p>
                <p className="text-xs text-[#9FB3C8]">
                  Inicial {soles(h.inicial)}
                  {h.obs ? ` · ${h.obs}` : ''}
                </p>
              </div>
              <div className="text-right text-sm">
                {h.final == null ? (
                  <span className="text-[#FFC107]">Sin cerrar</span>
                ) : (
                  <>
                    <p className="text-[#F1F5F9]">Contado {soles(h.final)}</p>
                    {dif != null && (
                      <p className={Math.abs(dif) < 0.005 ? 'text-[#3DDC97]' : 'text-[#FF6B5E]'}>
                        {Math.abs(dif) < 0.005 ? 'Cuadró' : `Diferencia ${soles(dif)}`}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </section>
    </>
  )
}