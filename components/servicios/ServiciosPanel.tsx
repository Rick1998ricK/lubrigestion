'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Power } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export type ServicioFila = {
  id: number
  nombre: string
  categoria: string | null
  descripcion: string | null
  precio_base: number
  duracion_min: number | null
  codigo: string | null
  activo: boolean
}

const input =
  'w-full rounded-lg border border-[#17496B] bg-[#061626] px-3 py-2 text-base text-[#F1F5F9] outline-none focus:border-[#FFC107] md:text-sm'
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-[#9FB3C8]'
const soles = (n: number) => 'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const CATEGORIAS = ['Mantenimiento', 'Lavado', 'Revisión', 'Frenos', 'Suspensión', 'Otros']

const VACIO = { id: null as number | null, nombre: '', categoria: '', descripcion: '', precio: '', duracion: '', codigo: '' }

export default function ServiciosPanel({ servicios }: { servicios: ServicioFila[] }) {
  const router = useRouter()
  const [f, setF] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const sugerencias = Array.from(
    new Set([...CATEGORIAS, ...servicios.map((s) => s.categoria).filter(Boolean) as string[]]),
  )

  const grupos = servicios.reduce<Record<string, ServicioFila[]>>((acc, s) => {
    const k = s.categoria || 'Sin categoría'
    ;(acc[k] ??= []).push(s)
    return acc
  }, {})

  async function enviar(datos: typeof VACIO, activo: boolean) {
    setError('')
    setOk('')
    setGuardando(true)
    const { error } = await createClient().rpc('guardar_servicio', {
      p_id: datos.id,
      p_nombre: datos.nombre,
      p_categoria: datos.categoria,
      p_descripcion: datos.descripcion,
      p_precio: Number(datos.precio),
      p_duracion: datos.duracion === '' ? null : Number(datos.duracion),
      p_codigo: datos.codigo,
      p_activo: activo,
    })
    setGuardando(false)
    if (error) return setError(error.message)
    return true
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (f.precio === '' || Number(f.precio) < 0) return setError('Indica un precio válido.')
    const actual = servicios.find((s) => s.id === f.id)
    const exito = await enviar(f, actual ? actual.activo : true)
    if (!exito) return
    setOk(f.id ? 'Servicio actualizado.' : 'Servicio creado.')
    setF(VACIO)
    router.refresh()
  }

  async function cambiarEstado(s: ServicioFila) {
    const exito = await enviar(
      {
        id: s.id,
        nombre: s.nombre,
        categoria: s.categoria ?? '',
        descripcion: s.descripcion ?? '',
        precio: String(s.precio_base),
        duracion: s.duracion_min == null ? '' : String(s.duracion_min),
        codigo: s.codigo ?? '',
      },
      !s.activo,
    )
    if (exito) router.refresh()
  }

  function editar(s: ServicioFila) {
    setOk('')
    setError('')
    setF({
      id: s.id,
      nombre: s.nombre,
      categoria: s.categoria ?? '',
      descripcion: s.descripcion ?? '',
      precio: String(s.precio_base),
      duracion: s.duracion_min == null ? '' : String(s.duracion_min),
      codigo: s.codigo ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-8">
      <form onSubmit={guardar} className="space-y-4 rounded-2xl border border-[#17496B] bg-[#09243B] p-5">
        <h2 className="font-display text-2xl uppercase tracking-wide text-[#FFC107]">
          {f.id ? 'Editar servicio' : 'Nuevo servicio'}
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <span className={label}>Nombre</span>
            <input className={input} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })}
              placeholder="Cambio de aceite y filtro" />
          </div>
          <div>
            <span className={label}>Categoría</span>
            <input className={input} list="cat-serv" value={f.categoria}
              onChange={(e) => setF({ ...f, categoria: e.target.value })} placeholder="Mantenimiento" />
            <datalist id="cat-serv">{sugerencias.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div>
            <span className={label}>Código (opcional)</span>
            <input className={input} value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })}
              placeholder="SV-001" />
          </div>
          <div>
            <span className={label}>Precio base (S/)</span>
            <input type="number" min={0} step="0.01" inputMode="decimal" className={input} value={f.precio}
              onChange={(e) => setF({ ...f, precio: e.target.value })} />
          </div>
          <div>
            <span className={label}>Duración (min)</span>
            <input type="number" min={1} inputMode="numeric" className={input} value={f.duracion}
              onChange={(e) => setF({ ...f, duracion: e.target.value })} placeholder="30" />
          </div>
          <div className="md:col-span-4">
            <span className={label}>Descripción: qué incluye</span>
            <textarea className={input} rows={2} value={f.descripcion}
              onChange={(e) => setF({ ...f, descripcion: e.target.value })}
              placeholder="Mano de obra, drenado, ajuste de nivel y revisión de fugas" />
          </div>
        </div>
        {error && <p className="text-sm text-[#FF6B5E]">{error}</p>}
        {ok && <p className="text-sm text-[#3DDC97]">{ok}</p>}
        <div className="flex gap-2">
          <button disabled={guardando}
            className="rounded-lg bg-[#FFC107] px-6 py-2.5 font-bold text-[#061626] disabled:opacity-50">
            {guardando ? 'Guardando…' : f.id ? 'Guardar cambios' : 'Crear servicio'}
          </button>
          {f.id && (
            <button type="button" onClick={() => setF(VACIO)}
              className="rounded-lg border border-[#17496B] px-4 py-2.5 text-sm text-[#9FB3C8]">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <section className="space-y-6">
        {servicios.length === 0 && <p className="text-sm text-[#9FB3C8]">Aún no hay servicios registrados.</p>}
        {Object.entries(grupos).map(([cat, lista]) => (
          <div key={cat} className="space-y-2">
            <h3 className="font-display text-xl uppercase tracking-wide text-[#F1F5F9]">{cat}</h3>
            {lista.map((s) => (
              <div key={s.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#17496B] bg-[#09243B] p-4 ${s.activo ? '' : 'opacity-60'}`}>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#F1F5F9]">
                    {s.nombre}
                    {s.codigo && <span className="ml-2 text-xs text-[#9FB3C8]">{s.codigo}</span>}
                    {!s.activo && <span className="ml-2 text-xs text-[#FF6B5E]">Desactivado</span>}
                  </p>
                  <p className="text-xs text-[#9FB3C8]">
                    {s.duracion_min ? `${s.duracion_min} min` : 'Sin duración'}
                    {s.descripcion ? ` · ${s.descripcion}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-2xl text-[#FFC107]">{soles(s.precio_base)}</span>
                  <button type="button" onClick={() => editar(s)} aria-label={`Editar ${s.nombre}`}
                    className="rounded-lg p-2 text-[#9FB3C8] hover:bg-[#061626] hover:text-[#FFC107]">
                    <Pencil size={18} />
                  </button>
                  <button type="button" onClick={() => cambiarEstado(s)}
                    aria-label={s.activo ? `Desactivar ${s.nombre}` : `Activar ${s.nombre}`}
                    className={`rounded-lg p-2 hover:bg-[#061626] ${s.activo ? 'text-[#FF6B5E]' : 'text-[#3DDC97]'}`}>
                    <Power size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  )
}