'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ICONOS_LISTA, iconoDe, type TipoProducto } from '@/lib/tipos'

type Fila = TipoProducto & { productos: number }

const input =
  'w-full rounded-lg border border-[#17496B] bg-[#061626] px-3 py-2 text-base text-[#F1F5F9] outline-none focus:border-[#FFC107] md:text-sm'
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-[#9FB3C8]'

function slug(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function mensaje(e: { code?: string; message: string }) {
  if (e.code === '23505') return 'Ya existe un tipo con ese nombre.'
  if (e.code === '23503') return 'Este tipo tiene productos. Desactívalo en lugar de borrarlo.'
  return e.message
}

export default function TiposPanel({ tipos }: { tipos: Fila[] }) {
  const router = useRouter()
  const [filas, setFilas] = useState<Fila[]>(tipos)
  const [sucios, setSucios] = useState<number[]>([])
  const [ocupado, setOcupado] = useState<number | 'nuevo' | null>(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [nuevo, setNuevo] = useState({ nombre: '', plural: '', icono: 'package' })

  useEffect(() => {
    setFilas(tipos)
    setSucios([])
  }, [tipos])

  function cambiar(id: number, parcial: Partial<Fila>) {
    setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, ...parcial } : f)))
    setSucios((s) => (s.includes(id) ? s : [...s, id]))
  }

  async function guardar(f: Fila) {
    setError('')
    setOk('')
    if (!f.nombre.trim() || !f.nombre_plural.trim()) return setError('El nombre y el plural son obligatorios.')
    setOcupado(f.id)
    const { error: e } = await createClient()
      .from('tipos_producto')
      .update({
        nombre: f.nombre.trim(),
        nombre_plural: f.nombre_plural.trim(),
        icono: f.icono,
        activo: f.activo,
      })
      .eq('id', f.id)
    setOcupado(null)
    if (e) return setError(mensaje(e))
    setSucios((s) => s.filter((x) => x !== f.id))
    setOk('Cambios guardados.')
    router.refresh()
  }

  async function mover(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= filas.length) return
    const a = filas[i]
    const b = filas[j]
    setError('')
    setOk('')
    setOcupado(a.id)
    const supabase = createClient()
    const r1 = await supabase.from('tipos_producto').update({ orden: b.orden }).eq('id', a.id)
    const r2 = await supabase.from('tipos_producto').update({ orden: a.orden }).eq('id', b.id)
    setOcupado(null)
    if (r1.error || r2.error) return setError(mensaje((r1.error ?? r2.error)!))
    router.refresh()
  }

  async function eliminar(f: Fila) {
    if (!window.confirm(`¿Eliminar el tipo «${f.nombre}»?`)) return
    setError('')
    setOk('')
    setOcupado(f.id)
    const { error: e } = await createClient().from('tipos_producto').delete().eq('id', f.id)
    setOcupado(null)
    if (e) return setError(mensaje(e))
    setOk('Tipo eliminado.')
    router.refresh()
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setOk('')
    const clave = slug(nuevo.nombre)
    if (!clave) return setError('Escribe el nombre del tipo.')
    setOcupado('nuevo')
    const orden = Math.max(0, ...filas.map((f) => f.orden)) + 1
    const { error: err } = await createClient().from('tipos_producto').insert({
      clave,
      nombre: nuevo.nombre.trim(),
      nombre_plural: (nuevo.plural || nuevo.nombre).trim(),
      icono: nuevo.icono,
      orden,
    })
    setOcupado(null)
    if (err) return setError(mensaje(err))
    setNuevo({ nombre: '', plural: '', icono: 'package' })
    setOk('Tipo creado.')
    router.refresh()
  }

  const IconoNuevo = iconoDe(nuevo.icono)

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-[#FF6B5E]">{error}</p>}
      {ok && <p className="text-sm text-[#3DDC97]">{ok}</p>}

      <section className="space-y-3 rounded-2xl border border-[#17496B] bg-[#09243B] p-5">
        <h2 className="font-display text-2xl uppercase tracking-wide text-[#FFC107]">Tipos actuales</h2>
        <ul className="space-y-3">
          {filas.map((f, i) => {
            const Icono = iconoDe(f.icono)
            const sucio = sucios.includes(f.id)
            return (
              <li
                key={f.id}
                className={`rounded-xl border border-[#17496B] bg-[#061626] p-3 ${f.activo ? '' : 'opacity-60'}`}
              >
                <div className="grid gap-3 md:grid-cols-[auto_1fr_1fr_190px] md:items-end">
                  <Icono size={28} className="hidden text-[#FFC107] md:block md:mb-2" />
                  <div>
                    <span className={label}>Nombre</span>
                    <input className={input} value={f.nombre}
                      onChange={(e) => cambiar(f.id, { nombre: e.target.value })} />
                  </div>
                  <div>
                    <span className={label}>En plural (catálogo)</span>
                    <input className={input} value={f.nombre_plural}
                      onChange={(e) => cambiar(f.id, { nombre_plural: e.target.value })} />
                  </div>
                  <div>
                    <span className={label}>Icono</span>
                    <select className={input} value={f.icono}
                      onChange={(e) => cambiar(f.id, { icono: e.target.value })}>
                      {ICONOS_LISTA.map((ic) => (
                        <option key={ic.clave} value={ic.clave}>{ic.etiqueta}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <label className="flex items-center gap-2 text-[#9FB3C8]">
                    <input type="checkbox" checked={f.activo}
                      onChange={(e) => cambiar(f.id, { activo: e.target.checked })}
                      className="h-4 w-4 accent-[#FFC107]" />
                    Activo
                  </label>
                  <span className="text-[#9FB3C8]">
                    {f.productos} producto(s){f.es_base ? ' · tipo base' : ''}
                  </span>
                  <span className="ml-auto flex items-center gap-1">
                    <button type="button" onClick={() => mover(i, -1)} disabled={i === 0 || ocupado !== null}
                      className="rounded-lg p-2 text-[#9FB3C8] hover:bg-[#09243B] disabled:opacity-30" aria-label="Subir">
                      <ArrowUp size={16} />
                    </button>
                    <button type="button" onClick={() => mover(i, 1)} disabled={i === filas.length - 1 || ocupado !== null}
                      className="rounded-lg p-2 text-[#9FB3C8] hover:bg-[#09243B] disabled:opacity-30" aria-label="Bajar">
                      <ArrowDown size={16} />
                    </button>
                    {!f.es_base && (
                      <button type="button" onClick={() => eliminar(f)} disabled={f.productos > 0 || ocupado !== null}
                        title={f.productos > 0 ? 'Tiene productos: desactívalo' : 'Eliminar'}
                        className="rounded-lg p-2 text-[#FF6B5E] hover:bg-[#09243B] disabled:opacity-30" aria-label="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    )}
                    {sucio && (
                      <button type="button" onClick={() => guardar(f)} disabled={ocupado !== null}
                        className="ml-2 rounded-lg bg-[#FFC107] px-4 py-2 text-sm font-bold text-[#061626] disabled:opacity-50">
                        {ocupado === f.id ? 'Guardando…' : 'Guardar'}
                      </button>
                    )}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <form onSubmit={crear} className="space-y-3 rounded-2xl border border-[#17496B] bg-[#09243B] p-5">
        <h2 className="font-display text-2xl uppercase tracking-wide text-[#FFC107]">Nuevo tipo</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_190px]">
          <div>
            <span className={label}>Nombre</span>
            <input className={input} value={nuevo.nombre} placeholder="Ej. Ambientador"
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
          </div>
          <div>
            <span className={label}>En plural (catálogo)</span>
            <input className={input} value={nuevo.plural} placeholder="Ej. Ambientadores"
              onChange={(e) => setNuevo({ ...nuevo, plural: e.target.value })} />
          </div>
          <div>
            <span className={label}>Icono</span>
            <div className="flex items-center gap-2">
              <IconoNuevo size={22} className="shrink-0 text-[#FFC107]" />
              <select className={input} value={nuevo.icono}
                onChange={(e) => setNuevo({ ...nuevo, icono: e.target.value })}>
                {ICONOS_LISTA.map((ic) => (
                  <option key={ic.clave} value={ic.clave}>{ic.etiqueta}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <button
          disabled={ocupado !== null}
          className="inline-flex items-center gap-2 rounded-lg bg-[#FFC107] px-5 py-2.5 font-bold text-[#061626] disabled:opacity-50"
        >
          <Plus size={18} /> {ocupado === 'nuevo' ? 'Creando…' : 'Crear tipo'}
        </button>
        <p className="text-xs text-[#9FB3C8]">
          Los tipos nuevos usan los campos generales (código, presentación, ubicación, stock mínimo). Un tipo
          con productos no se puede eliminar: desactívalo y deja de aparecer al crear productos.
        </p>
      </form>
    </div>
  )
}