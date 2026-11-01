'use client'

import { useMemo, useState } from 'react'
import { FileText, MessageCircle, Package, Search } from 'lucide-react'

export type ProductoPublico = {
  id: number
  nombre: string
  tipo: string
  tipo_nombre: string | null
  marca: string | null
  viscosidad: string | null
  codigo: string | null
  presentacion: string | null
  codigo_tienda: string | null
  ean: string | null
  descripcion: string | null
  aplicacion: string | null
  ficha_texto: string | null
  ficha_url: string | null
  imagen: string | null
  disponible: boolean
}

function titulo(p: ProductoPublico) {
  return [p.marca, p.nombre, p.viscosidad].filter(Boolean).join(' ')
}

export default function CatalogoPublico({
  org,
  productos,
  whatsapp,
}: {
  org: string
  productos: ProductoPublico[]
  whatsapp: string
}) {
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState('')

  const tipos = useMemo(
    () => Array.from(new Set(productos.map((p) => p.tipo_nombre ?? p.tipo))),
    [productos],
  )

  const lista = useMemo(() => {
    const palabras = q.toLowerCase().split(/\s+/).filter(Boolean)
    return productos.filter((p) => {
      if (tipo && (p.tipo_nombre ?? p.tipo) !== tipo) return false
      if (palabras.length === 0) return true
      const texto = [
        p.nombre, p.marca, p.viscosidad, p.codigo, p.presentacion,
        p.codigo_tienda, p.ean, p.descripcion, p.aplicacion,
      ].filter(Boolean).join(' ').toLowerCase()
      return palabras.every((w) => texto.includes(w))
    })
  }, [productos, q, tipo])

  const chip = (activo: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-semibold ${
      activo
        ? 'border-[#FFC107] bg-[#FFC107] text-[#061626]'
        : 'border-[#17496B] text-[#9FB3C8] hover:border-[#FFC107] hover:text-[#FFC107]'
    }`

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt={org} className="mb-3 h-14 w-auto" />
        <p className="text-xs uppercase tracking-widest text-[#9FB3C8]">Catálogo de productos</p>
        <h1 className="font-display text-4xl uppercase tracking-wide text-[#F1F5F9] md:text-5xl">{org}</h1>
      </header>

      <div className="relative max-w-xl">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9FB3C8]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, marca, código o vehículo"
          className="w-full rounded-lg border border-[#17496B] bg-[#09243B] py-2.5 pl-9 pr-3 text-base text-[#F1F5F9] outline-none focus:border-[#FFC107] md:text-sm"
        />
      </div>

      {tipos.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(tipo === '')} onClick={() => setTipo('')}>Todos</button>
          {tipos.map((t) => (
            <button key={t} type="button" className={chip(tipo === t)} onClick={() => setTipo(t)}>{t}</button>
          ))}
        </div>
      )}

      {lista.length === 0 ? (
        <p className="text-sm text-[#9FB3C8]">No encontramos productos con esa búsqueda.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((p) => {
            const msg = `Hola, me interesa: ${titulo(p)}${p.codigo_tienda ? ` (${p.codigo_tienda})` : ''}. ¿Me das información?`
            const hayMas = p.descripcion || p.aplicacion || p.ficha_texto
            return (
              <article key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-[#17496B] bg-[#09243B]">
                <div className="grid aspect-square place-items-center bg-[#061626]">
                  {p.imagen ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imagen} alt={titulo(p)} loading="lazy" className="size-full object-contain" />
                  ) : (
                    <Package size={48} className="text-[#17496B]" aria-hidden="true" />
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#9FB3C8]">
                      {p.tipo_nombre ?? p.tipo}
                      {p.presentacion ? ` · ${p.presentacion}` : ''}
                    </p>
                    <h2 className="font-semibold leading-tight text-[#F1F5F9]">{titulo(p)}</h2>
                    <p className="mt-1 text-xs text-[#9FB3C8]">
                      {[p.codigo_tienda, p.codigo].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      p.disponible ? 'bg-[#3DDC97]/15 text-[#3DDC97]' : 'bg-[#FF6B5E]/15 text-[#FF6B5E]'
                    }`}
                  >
                    {p.disponible ? 'Disponible' : 'Consultar disponibilidad'}
                  </span>

                  {hayMas && (
                    <details className="text-sm text-[#F1F5F9]">
                      <summary className="cursor-pointer font-semibold text-[#FFC107]">Ver detalles</summary>
                      <div className="mt-2 space-y-2">
                        {p.descripcion && <p>{p.descripcion}</p>}
                        {p.aplicacion && (
                          <p>
                            <b className="text-[#9FB3C8]">Aplicación: </b>
                            {p.aplicacion}
                          </p>
                        )}
                        {p.ficha_texto && (
                          <p className="whitespace-pre-line">
                            <b className="text-[#9FB3C8]">Ficha técnica: </b>
                            {p.ficha_texto}
                          </p>
                        )}
                      </div>
                    </details>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    {p.ficha_url && (
                      <a
                        href={p.ficha_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#17496B] px-3 py-2 text-sm font-semibold text-[#9FB3C8] hover:border-[#FFC107] hover:text-[#FFC107]"
                      >
                        <FileText size={16} /> Ficha técnica
                      </a>
                    )}
                    {whatsapp && (
                      <a
                        href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#3DDC97] px-3 py-2 text-sm font-bold text-[#061626]"
                      >
                        <MessageCircle size={16} /> Consultar
                      </a>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <p className="pt-4 text-center text-xs text-[#9FB3C8]">
        Precios y disponibilidad sujetos a consulta.
      </p>
    </div>
  )
}