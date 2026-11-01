'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Resultado = {
  key: string
  nombres: string
  celular: string
  correo: string
  modelo: string
  placa: string
  km: number | null
  kmProximo: number | null
}

function llenar(id: string, valor: string) {
  const el = document.getElementById(id) as HTMLInputElement | null
  if (el) el.value = valor
}

export default function BuscadorCliente() {
  const [q, setQ] = useState('')
  const [res, setRes] = useState<Resultado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [elegido, setElegido] = useState<Resultado | null>(null)

  useEffect(() => {
    const t = q.replace(/[,()%]/g, '').trim()
    if (t.length < 3) {
      setRes([])
      return
    }
    const timer = setTimeout(async () => {
      setBuscando(true)
      const supabase = createClient()
      const [porPlaca, porCliente] = await Promise.all([
        supabase
          .from('vehiculos')
          .select('id, placa, vehiculo_modelo, kilometraje_actual, proximo_cambio_km, clientes(nombres_apellidos, celular, correo)')
          .ilike('placa', `%${t}%`)
          .limit(5),
        supabase
          .from('clientes')
          .select('id, nombres_apellidos, celular, correo, vehiculos(id, placa, vehiculo_modelo, kilometraje_actual, proximo_cambio_km)')
          .or(`celular.ilike.%${t}%,nombres_apellidos.ilike.%${t}%`)
          .limit(5),
      ])

      const out: Resultado[] = []
      ;(porPlaca.data ?? []).forEach((v: any) =>
        out.push({
          key: `v${v.id}`,
          nombres: v.clientes?.nombres_apellidos ?? '',
          celular: v.clientes?.celular ?? '',
          correo: v.clientes?.correo ?? '',
          modelo: v.vehiculo_modelo ?? '',
          placa: v.placa ?? '',
          km: v.kilometraje_actual,
          kmProximo: v.proximo_cambio_km,
        }),
      )
      ;(porCliente.data ?? []).forEach((c: any) => {
        const base = {
          nombres: c.nombres_apellidos ?? '',
          celular: c.celular ?? '',
          correo: c.correo ?? '',
        }
        const vs: any[] = c.vehiculos?.length ? c.vehiculos : [null]
        vs.forEach((v) => {
          const key = `c${c.id}-${v?.id ?? 'x'}`
          if (out.some((o) => o.key === `v${v?.id}`)) return // ya salió por placa
          out.push({
            key,
            ...base,
            modelo: v?.vehiculo_modelo ?? '',
            placa: v?.placa ?? '',
            km: v?.kilometraje_actual ?? null,
            kmProximo: v?.proximo_cambio_km ?? null,
          })
        })
      })
      setRes(out.slice(0, 8))
      setBuscando(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [q])

  function elegir(r: Resultado) {
    llenar('nombres', r.nombres)
    llenar('celular', r.celular)
    llenar('correo', r.correo)
    llenar('modelo', r.modelo)
    llenar('placa', r.placa)
    llenar('km_actual', '')
    llenar('km_proximo', '')
    setElegido(r)
    setQ('')
    setRes([])
    document.getElementById('km_actual')?.focus()
  }

  return (
    <div className="relative mb-5">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#9FB3C8]">
        Buscar cliente existente (placa, celular o nombre)
      </label>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9FB3C8]" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault() // no enviar el formulario
          }}
          placeholder="Ej: ABC-123 o 999888777"
          className="w-full rounded-lg border border-[#17496B] bg-[#061626] py-2 pl-9 pr-3 text-base text-[#F1F5F9] outline-none focus:border-[#FFC107] md:text-sm"
        />
      </div>

      {(res.length > 0 || buscando) && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-[#17496B] bg-[#03111F] shadow-xl">
          {buscando && res.length === 0 && (
            <li className="px-3 py-2 text-sm text-[#9FB3C8]">Buscando…</li>
          )}
          {res.map((r) => (
            <li key={r.key}>
              <button
                type="button"
                onClick={() => elegir(r)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-[#09243B]"
              >
                <span className="block font-semibold text-[#F1F5F9]">{r.nombres}</span>
                <span className="text-[#9FB3C8]">
                  {[r.placa, r.modelo, r.celular].filter(Boolean).join(' · ') || 'Sin vehículo registrado'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {elegido && (
        <p className="mt-2 text-xs text-[#3DDC97]">
          Datos cargados de {elegido.nombres}.
          {elegido.km != null && ` Último km registrado: ${elegido.km.toLocaleString('es-PE')}.`}
          {elegido.kmProximo != null && ` Próximo cambio previsto: ${elegido.kmProximo.toLocaleString('es-PE')} km.`}{' '}
          Ingresa el kilometraje de hoy.
        </p>
      )}
    </div>
  )
}