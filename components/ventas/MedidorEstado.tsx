'use client'

import { COLOR_ESTADO, ETIQUETA_ESTADO, type MedicionDef } from '@/lib/mediciones'

export default function MedidorEstado({
  def,
  valor,
  estado,
  onValor,
  onEstado,
}: {
  def: MedicionDef
  valor: string
  estado: string
  onValor: (v: string) => void
  onEstado: (e: string) => void
}) {
  const n = valor === '' ? NaN : Number(valor)
  const pct = Number.isNaN(n)
    ? null
    : Math.min(100, Math.max(0, ((n - def.min) / (def.max - def.min)) * 100))
  const rango = def.max - def.min

  return (
    <div className="space-y-3 rounded-lg border border-borde bg-fondo p-3">
      <input type="hidden" name={def.campo} value={estado} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{def.label}</p>
          <p className="text-xs text-suave">{def.ayuda}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={valor}
            onChange={(e) => onValor(e.target.value)}
            aria-label={`${def.label} (${def.unidad})`}
            className="w-24 rounded-lg border border-borde bg-tarjeta px-2 py-1.5 text-texto outline-none focus-visible:ring-2 focus-visible:ring-acento"
          />
          <span className="text-xs text-suave">{def.unidad}</span>
          <select
            value={estado}
            onChange={(e) => onEstado(e.target.value)}
            aria-label={`Estado de ${def.label}`}
            className="rounded-lg border border-borde bg-tarjeta px-2 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-acento"
            style={{ color: COLOR_ESTADO[estado] }}
          >
            {Object.entries(ETIQUETA_ESTADO).map(([k, v]) => (
              <option key={k} value={k} style={{ color: '#000' }}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative pt-2">
        <div className="flex h-3 overflow-hidden rounded-full">
          {def.zonas.map((z, i) => (
            <div
              key={i}
              style={{
                width: `${((z.hasta - z.desde) / rango) * 100}%`,
                backgroundColor: COLOR_ESTADO[z.estado],
                opacity: 0.85,
              }}
            />
          ))}
        </div>
        {pct !== null && (
          <div
            className="absolute top-0 h-7 w-[3px] -translate-x-1/2 rounded bg-white shadow"
            style={{ left: `${pct}%` }}
            aria-hidden="true"
          />
        )}
        <div className="mt-1 flex justify-between text-[10px] text-suave">
          <span>{def.min}</span>
          <span>{def.max}</span>
        </div>
      </div>

      <p className="text-xs text-suave">{def.leyenda}</p>
    </div>
  )
}