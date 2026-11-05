'use client'

import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import BuscadorProducto, { type OpcionProducto } from '@/components/productos/BuscadorProducto'

const input =
  'w-full rounded-lg border border-[#17496B] bg-[#061626] px-3 py-2 text-base text-[#F1F5F9] outline-none focus:border-[#FFC107] md:text-sm'
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-[#9FB3C8]'

export type ProductoKardex = OpcionProducto & { marca: string }

export default function KardexPanel({ productos }: { productos: ProductoKardex[] }) {
  const hoy = new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10)
  const [productoId, setProductoId] = useState<number | ''>('')
  const [desde, setDesde] = useState(hoy.slice(0, 8) + '01')
  const [hasta, setHasta] = useState(hoy)

  const [marca, setMarca] = useState('')
  const marcas = useMemo(
    () => Array.from(new Set(productos.map((p) => p.marca).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [productos],
  )
  const opciones = useMemo(
    () => (marca ? productos.filter((p) => p.marca === marca) : productos),
    [productos, marca],
  )

  const valido = !!desde && !!hasta && desde <= hasta
  const base = `desde=${desde}&hasta=${hasta}`
  const boton =
    'inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-bold disabled:pointer-events-none disabled:opacity-40'

  return (
    <div className="space-y-6">
      <div className="grid max-w-xl gap-4 sm:grid-cols-2">
        <div>
          <span className={label}>Desde</span>
          <input type="date" className={input} value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <span className={label}>Hasta</span>
          <input type="date" className={input} value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
      </div>
      {!valido && <p className="text-sm text-[#FF6B5E]">Revisa las fechas: «Desde» no puede ser posterior a «Hasta».</p>}

      {marcas.length > 1 && (
        <div className="max-w-sm">
          <span className={label}>Marca (filtra el buscador y el kardex general)</span>
          <select
            className={input}
            value={marca}
            onChange={(e) => {
              setMarca(e.target.value)
              setProductoId('')
            }}
          >
            <option value="">Todas las marcas</option>
            {marcas.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      )}

      <section className="space-y-3 rounded-2xl border border-[#17496B] bg-[#09243B] p-5">
        <h2 className="font-display text-2xl uppercase tracking-wide text-[#FFC107]">Kardex de un producto</h2>
        <p className="text-sm text-[#9FB3C8]">
          Entradas, salidas y saldo valorizado, con cada movimiento. Busca por nombre, EAN, código de tienda o
          código de producto.
        </p>
        <BuscadorProducto
          opciones={opciones}
          valor={productoId}
          onChange={setProductoId}
          className={input}
          placeholder="Buscar o escanear producto…"
        />
        <a
          href={productoId === '' || !valido ? undefined : `/api/kardex?producto=${productoId}&${base}`}
          aria-disabled={productoId === '' || !valido}
          className={`${boton} bg-[#FFC107] text-[#061626] ${productoId === '' || !valido ? 'pointer-events-none opacity-40' : ''}`}
        >
          <Download size={18} /> Descargar kardex del producto
        </a>
      </section>

      <section className="space-y-3 rounded-2xl border border-[#17496B] bg-[#09243B] p-5">
        <h2 className="font-display text-2xl uppercase tracking-wide text-[#F1F5F9]">Kardex general valorizado</h2>
        <p className="text-sm text-[#9FB3C8]">
          Todos los productos con saldo inicial, entradas, salidas, saldo final, costo promedio y valor del inventario.
          Incluye una hoja con todos los movimientos. Es información interna: incluye precios de venta y márgenes.
        </p>
        <a
          href={valido ? `/api/kardex?${base}${marca ? `&marca=${encodeURIComponent(marca)}` : ''}` : undefined}
          aria-disabled={!valido}
          className={`${boton} border border-[#17496B] text-[#F1F5F9] hover:border-[#FFC107] ${valido ? '' : 'pointer-events-none opacity-40'}`}
        >
          <FileSpreadsheet size={18} /> Descargar kardex general
        </a>
      </section>
    </div>
  )
}