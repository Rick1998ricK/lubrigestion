'use client'
import { useMemo, useState } from 'react'
import { nombreTipo, type TipoProducto } from '@/lib/tipos'
import { minimoDe } from '@/lib/campos-producto'

export type FilaStock = {
  id: number
  nombre: string
  tipo: string
  marca: string | null
  viscosidad_codigo: string | null
  stock: number
  precio_venta: number
  precio_compra: number | null
  codigo?: string | null
  ean?: string | null
  codigo_tienda?: string | null
  presentacion?: string | null
  stock_minimo?: number | null
  ubicacion?: string | null
  detalle?: string
  buscable?: string
}

function Varilla({ stock, max, minimo }: { stock: number; max: number; minimo: number }) {
  const pct = Math.min(100, (stock / max) * 100)
  const minPct = Math.min(100, (minimo / max) * 100)
  const bajo = stock < minimo
  return (
    <div role="img" aria-label={`Stock ${stock} de ${max}, mínimo ${minimo}`} className="relative h-5">
      <div className="absolute inset-x-0 bottom-1 top-1 overflow-hidden rounded-sm border border-borde bg-fondo">
        <div className={`h-full ${bajo ? 'bg-peligro' : 'bg-acento'}`} style={{ width: `${pct}%` }} />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, transparent 0, transparent calc(8.3333% - 1px), rgba(6,22,38,.45) calc(8.3333% - 1px), rgba(6,22,38,.45) 8.3333%)',
          }}
        />
      </div>
      <div className="absolute top-0 h-5 w-0.5 bg-texto" style={{ left: `${minPct}%` }} />
    </div>
  )
}

  export default function TablaStock({
    filas,
    esAdmin,
    tipos,
  }: {
    filas: FilaStock[]
    esAdmin: boolean
    tipos: TipoProducto[]
  }) {
  const [tipo, setTipo] = useState('')
  const [q, setQ] = useState('')
  const [soloBajo, setSoloBajo] = useState(false)

  const max = Math.max(24, ...filas.map((f) => f.stock))

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase()
    return filas.filter((p) => {
      if (tipo && p.tipo !== tipo) return false
      if (soloBajo && p.stock >= minimoDe(p.stock_minimo)) return false
      if (!t) return true
      return [p.nombre, p.marca, p.viscosidad_codigo, p.codigo, p.ean, p.codigo_tienda, p.presentacion, p.ubicacion, p.detalle, p.buscable]
        .some((v) => v?.toLowerCase().includes(t))
    })
  }, [filas, tipo, q, soloBajo])

  const control =
    'rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto outline-none focus:border-acento focus-visible:ring-2 focus-visible:ring-acento'

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar por nombre, marca, código o compatibilidad"
          placeholder="Buscar por nombre, marca, código o compatibilidad"
          className={`${control} min-w-56 flex-1`} />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}
          aria-label="Filtrar por tipo" className={control}>
          <option value="">Todos los tipos</option>
            {tipos.map((t) => (
              <option key={t.clave} value={t.clave}>{t.nombre_plural}</option>
            ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={soloBajo} onChange={(e) => setSoloBajo(e.target.checked)}
            className="size-5 accent-acento" />
          Solo stock bajo
        </label>
      </div>

      <ul className="mt-4 border-t border-borde">
        {visibles.length === 0 && (
          <li className="py-8 text-center text-suave">No hay productos para mostrar.</li>
        )}
        {visibles.map((p) => {
          const minimo = minimoDe(p.stock_minimo)
          const agotado = p.stock === 0
          const bajo = p.stock < minimo
          const margen =
            p.precio_compra != null && p.precio_venta > 0 ? p.precio_venta - p.precio_compra : null
          const codigoExtra = p.codigo && p.codigo !== p.viscosidad_codigo ? p.codigo : null
          const linea2 = [
                    p.codigo_tienda,
                    p.ean ? `EAN ${p.ean}` : null,
                    p.detalle,
                    p.ubicacion ? `Ubic. ${p.ubicacion}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-borde/60 py-4">
              <div className="min-w-48 flex-1">
                <p className="font-display text-xl font-semibold leading-tight">{p.nombre}</p>
                <p className="text-sm text-suave">
                  {[p.marca, p.viscosidad_codigo, codigoExtra, p.presentacion, nombreTipo(tipos, p.tipo)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {linea2 && <p className="text-xs text-suave/80">{linea2}</p>}
              </div>
              <div className="min-w-36 flex-1">
                <Varilla stock={p.stock} max={max} minimo={minimo} />
              </div>
              <div className="w-24 text-right">
                <p className="font-display text-3xl font-bold leading-none tabular-nums">{p.stock}</p>
                <p className="min-h-5 text-xs font-bold text-peligro">
                  {agotado ? 'Agotado' : bajo ? 'Bajo el mínimo' : ''}
                </p>
              </div>
              <div className="w-28 text-right tabular-nums">
                <p className="font-semibold">S/ {p.precio_venta.toFixed(2)}</p>
                {esAdmin && (
                  <p className="text-xs text-suave">
                    Margen {margen != null ? `S/ ${margen.toFixed(2)}` : '—'}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-xs text-suave">
        La marca vertical de la varilla indica el stock mínimo de cada producto. Debajo de ella el producto aparece en rojo.
      </p>
    </div>
  )
}