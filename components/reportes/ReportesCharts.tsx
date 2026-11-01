'use client'

import { useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

type Mes = { mes: string; ventas: number; compras: number; gastos: number }
type Top = { nombre: string; unidades: number }

const SERIES = [
  { key: 'ventas', nombre: 'Ventas', color: '#3987e5' },
  { key: 'compras', nombre: 'Compras', color: '#d95926' },
  { key: 'gastos', nombre: 'Gastos', color: '#199e70' },
] as const

const card = 'rounded-2xl border border-[#17496B] bg-[#09243B] p-5'
const h2 = 'font-display text-2xl uppercase tracking-wide text-[#F1F5F9]'
const tick = { fill: '#9FB3C8', fontSize: 12 }

const soles = (n: number) =>
  'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function TooltipMeses({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#17496B] bg-[#061626] p-3 text-sm shadow-lg">
      <p className="mb-1 font-semibold text-[#F1F5F9]">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-[#F1F5F9]">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: p.fill }} />
          {p.name}: <b>{soles(p.value)}</b>
        </p>
      ))}
    </div>
  )
}

function TooltipTop({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as Top
  return (
    <div className="rounded-lg border border-[#17496B] bg-[#061626] p-3 text-sm shadow-lg text-[#F1F5F9]">
      <p className="font-semibold">{d.nombre}</p>
      <p>{d.unidades} unidad(es) vendidas</p>
    </div>
  )
}

export default function ReportesCharts({ meses, top }: { meses: Mes[]; top: Top[] }) {
  const [tabla, setTabla] = useState(false)

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {/* Ventas vs compras vs gastos */}
      <section className={card}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className={h2}>Ventas, compras y gastos</h2>
            <p className="text-xs text-[#9FB3C8]">Últimos 6 meses, en soles</p>
          </div>
          <button
            onClick={() => setTabla((t) => !t)}
            className="shrink-0 rounded-lg border border-[#17496B] px-3 py-1.5 text-xs font-semibold text-[#9FB3C8] hover:text-[#FFC107]"
          >
            {tabla ? 'Ver gráfico' : 'Ver tabla'}
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-4">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-2 text-sm text-[#F1F5F9]">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} />
              {s.nombre}
            </span>
          ))}
        </div>

        {tabla ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-[#F1F5F9]">
              <thead className="text-left text-xs uppercase text-[#9FB3C8]">
                <tr>
                  <th className="py-2">Mes</th>
                  {SERIES.map((s) => (
                    <th key={s.key} className="py-2 text-right">{s.nombre}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#17496B]">
                {meses.map((m) => (
                  <tr key={m.mes}>
                    <td className="py-2">{m.mes}</td>
                    {SERIES.map((s) => (
                      <td key={s.key} className="py-2 text-right">{soles(m[s.key])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={meses} barGap={2} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="#17496B" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="mes" tick={tick} axisLine={false} tickLine={false} />
                <YAxis tick={tick} axisLine={false} tickLine={false} width={56} />
                <Tooltip content={<TooltipMeses />} cursor={{ fill: '#FFFFFF', fillOpacity: 0.06 }} />
                {SERIES.map((s) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.nombre}
                    fill={s.color}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={22}
                    stroke="#09243B"
                    strokeWidth={2}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Mayor rotación */}
      <section className={card}>
        <h2 className={h2}>Mayor rotación</h2>
        <p className="mb-3 text-xs text-[#9FB3C8]">
          Unidades vendidas en los últimos 90 días (sin bonificaciones)
        </p>
        {top.length === 0 ? (
          <p className="text-sm text-[#9FB3C8]">Todavía no hay ventas de productos en este período.</p>
        ) : (
          <div style={{ height: Math.max(220, top.length * 44) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#17496B" strokeOpacity={0.5} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={tick} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  width={150}
                  tick={tick}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 21) + '…' : v)}
                />
                <Tooltip content={<TooltipTop />} cursor={{ fill: '#FFFFFF', fillOpacity: 0.06 }} />
                <Bar dataKey="unidades" fill="#FFC107" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}