'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'

const ITEMS = [
  { tipo: 'ventas', titulo: 'Ventas', texto: 'Una hoja por venta y otra con cada producto o servicio. Marca las anuladas.', fechas: true, admin: false },
  { tipo: 'compras', titulo: 'Compras', texto: 'Pedidos a proveedores con condición, vencimiento y estado de pago.', fechas: true, admin: true },
  { tipo: 'gastos', titulo: 'Gastos', texto: 'Alquiler, luz, agua, fletes y otros, con documento y medio de pago.', fechas: true, admin: true },
  { tipo: 'resumen', titulo: 'Resumen del período', texto: 'Ventas, costo, gastos, ganancia neta, flujo de caja y productos de mayor rotación.', fechas: true, admin: true },
  { tipo: 'inventario', titulo: 'Inventario', texto: 'Stock actual por producto. Foto de hoy, no usa fechas.', fechas: false, admin: false },
  { tipo: 'clientes', titulo: 'Clientes', texto: 'Clientes con sus vehículos, visitas y próximo cambio.', fechas: false, admin: false },
]

const iso = (d: Date) => d.toISOString().slice(0, 10)
const limaHoy = () => new Date(Date.now() - 5 * 3600e3)

function rango(p: 'mes' | 'anterior' | 'anio'): [string, string] {
  const h = limaHoy()
  const y = h.getUTCFullYear()
  const m = h.getUTCMonth()
  if (p === 'mes') return [iso(new Date(Date.UTC(y, m, 1))), iso(h)]
  if (p === 'anterior') return [iso(new Date(Date.UTC(y, m - 1, 1))), iso(new Date(Date.UTC(y, m, 0)))]
  return [iso(new Date(Date.UTC(y, 0, 1))), iso(h)]
}

const input =
  'rounded-lg border border-[#17496B] bg-[#061626] px-3 py-2 text-base text-[#F1F5F9] outline-none focus:border-[#FFC107] md:text-sm'

export default function ExportarPanel({ esAdmin }: { esAdmin: boolean }) {
  const [desde, setDesde] = useState(() => rango('mes')[0])
  const [hasta, setHasta] = useState(() => rango('mes')[1])
  const [cargando, setCargando] = useState<string | null>(null)
  const [error, setError] = useState('')

  function preset(p: 'mes' | 'anterior' | 'anio') {
    const [d, h] = rango(p)
    setDesde(d)
    setHasta(h)
  }

  async function descargar(tipo: string, usaFechas: boolean) {
    setError('')
    if (usaFechas && desde > hasta) return setError('La fecha inicial no puede ser mayor que la final.')
    setCargando(tipo)
    try {
      const res = await fetch(`/api/exportar/${tipo}${usaFechas ? `?desde=${desde}&hasta=${hasta}` : ''}`)
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error ?? 'No se pudo generar el archivo.')
      }
      const blob = await res.blob()
      const nombre = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? `${tipo}.xlsx`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nombre
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCargando(null)
    }
  }

  return (
    <>
      <section className="space-y-3 rounded-2xl border border-[#17496B] bg-[#09243B] p-5">
        <h2 className="font-display text-2xl uppercase tracking-wide text-[#FFC107]">Período</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#9FB3C8]">
            Desde
            <input type="date" className={`${input} mt-1 block`} value={desde} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#9FB3C8]">
            Hasta
            <input type="date" className={`${input} mt-1 block`} value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            {([['mes', 'Este mes'], ['anterior', 'Mes anterior'], ['anio', 'Este año']] as const).map(([k, t]) => (
              <button
                key={k}
                type="button"
                onClick={() => preset(k)}
                className="rounded-lg border border-[#17496B] px-3 py-2 text-sm text-[#9FB3C8] hover:border-[#FFC107] hover:text-[#FFC107]"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-[#9FB3C8]">Las fechas aplican a Ventas, Compras, Gastos y Resumen.</p>
      </section>

      {error && <p className="text-sm text-[#FF6B5E]">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {ITEMS.filter((i) => esAdmin || !i.admin).map((i) => (
          <div key={i.tipo} className="flex flex-col justify-between gap-4 rounded-2xl border border-[#17496B] bg-[#09243B] p-5">
            <div>
              <h3 className="font-display text-2xl uppercase tracking-wide text-[#F1F5F9]">{i.titulo}</h3>
              <p className="mt-1 text-sm text-[#9FB3C8]">{i.texto}</p>
            </div>
            <button
              onClick={() => descargar(i.tipo, i.fechas)}
              disabled={cargando !== null}
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-[#FFC107] px-5 py-2.5 font-bold text-[#061626] disabled:opacity-50"
            >
              <Download size={18} /> {cargando === i.tipo ? 'Generando…' : 'Descargar Excel'}
            </button>
          </div>
        ))}
      </div>
    </>
  )
}