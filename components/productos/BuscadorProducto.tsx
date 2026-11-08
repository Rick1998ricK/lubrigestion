'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { coincideProducto, type Compat } from '@/lib/compatibilidad'

export type OpcionProducto = {
  id: number
  etiqueta: string
  busqueda: string
  base?: string // búsqueda sin los vehículos (para comparar línea por línea)
  vehiculos?: Compat[]
  detalle?: string // vehículos compatibles, para mostrar bajo el nombre
}

export default function BuscadorProducto({
  opciones,
  valor,
  onChange,
  className,
  placeholder = 'Buscar por nombre, EAN o código…',
}: {
  opciones: OpcionProducto[]
  valor: number | ''
  onChange: (id: number | '') => void
  className: string
  placeholder?: string
}) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)

  const seleccionado = opciones.find((o) => o.id === valor)

  const resultados = useMemo(() => {
    const palabras = texto.toLowerCase().split(/\s+/).filter(Boolean)
    const base = palabras.length
      ? opciones.filter((o) =>
          o.vehiculos?.length
            ? coincideProducto(o, palabras)
            : palabras.every((p) => o.busqueda.includes(p)),
        )
      : opciones
    return base.slice(0, 10)
  }, [texto, opciones])

  function elegir(o: OpcionProducto) {
    onChange(o.id)
    setTexto('')
    setAbierto(false)
  }

  return (
    <div className="relative">
      <Search
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9FB3C8]"
      />
      <input
        className={`${className} pl-8`}
        value={abierto ? texto : seleccionado?.etiqueta ?? ''}
        placeholder={placeholder}
        onFocus={() => {
          setAbierto(true)
          setTexto('')
          setActivo(0)
        }}
        onBlur={() => setAbierto(false)}
        onChange={(e) => {
          setTexto(e.target.value)
          setAbierto(true)
          setActivo(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActivo((a) => Math.min(a + 1, resultados.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActivo((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            const o = resultados[activo]
            if (o) elegir(o)
          } else if (e.key === 'Escape') {
            setAbierto(false)
          }
        }}
      />
      {abierto && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-[#17496B] bg-[#09243B] shadow-lg">
          {resultados.length === 0 && (
            <li className="px-3 py-2 text-sm text-[#9FB3C8]">Sin resultados</li>
          )}
          {resultados.map((o, i) => (
            <li key={o.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  elegir(o)
                }}
                className={`block w-full px-3 py-2 text-left text-sm text-[#F1F5F9] hover:bg-[#17496B] ${
                  i === activo ? 'bg-[#17496B]' : ''
                }`}
              >
                {o.etiqueta}
                {o.detalle && (
                  <span className="mt-0.5 block truncate text-xs text-[#9FB3C8]">Sirve para: {o.detalle}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}