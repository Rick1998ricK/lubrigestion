'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Prov = {
  id: number
  razon_social: string
  ruc: string | null
  direccion: string | null
  telefono: string | null
  asesor_comercial: string | null
}

const input =
  'w-full rounded-lg border border-[#17496B] bg-[#061626] px-3 py-2 text-base text-[#F1F5F9] outline-none focus:border-[#FFC107] md:text-sm'
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-[#9FB3C8]'
const vacio = { razon_social: '', ruc: '', direccion: '', telefono: '', asesor_comercial: '' }

export default function ProveedoresPanel({ proveedores }: { proveedores: Prov[] }) {
  const router = useRouter()
  const [editando, setEditando] = useState<number | null>(null)
  const [f, setF] = useState(vacio)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof typeof vacio) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((x) => ({ ...x, [k]: e.target.value }))

  function editar(p: Prov) {
    setEditando(p.id)
    setF({
      razon_social: p.razon_social,
      ruc: p.ruc ?? '',
      direccion: p.direccion ?? '',
      telefono: p.telefono ?? '',
      asesor_comercial: p.asesor_comercial ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelar() {
    setEditando(null)
    setF(vacio)
    setError('')
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!f.razon_social.trim()) return setError('La razón social es obligatoria.')
    if (f.ruc.trim() && !/^\d{11}$/.test(f.ruc.trim())) return setError('El RUC debe tener 11 dígitos.')

    const fila = {
      razon_social: f.razon_social.trim(),
      ruc: f.ruc.trim() || null,
      direccion: f.direccion.trim() || null,
      telefono: f.telefono.trim() || null,
      asesor_comercial: f.asesor_comercial.trim() || null,
    }
    setGuardando(true)
    const supabase = createClient()
    const { error } =
      editando == null
        ? await supabase.from('proveedores').insert(fila)
        : await supabase.from('proveedores').update(fila).eq('id', editando)
    setGuardando(false)
    if (error) return setError(error.message)

    cancelar()
    router.refresh()
  }

  async function eliminar(p: Prov) {
    if (!confirm(`¿Eliminar a ${p.razon_social}?`)) return
    const { error } = await createClient().from('proveedores').delete().eq('id', p.id)
    if (error)
      return setError(
        error.code === '23503'
          ? 'No se puede eliminar: tiene compras o productos asociados.'
          : error.message,
      )
    router.refresh()
  }

  return (
    <>
      <form onSubmit={guardar} className="space-y-4 rounded-2xl border border-[#17496B] bg-[#09243B] p-5">
        <h2 className="font-display text-2xl uppercase tracking-wide text-[#FFC107]">
          {editando == null ? 'Nuevo proveedor' : 'Editar proveedor'}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <span className={label}>Razón social *</span>
            <input className={input} value={f.razon_social} onChange={set('razon_social')} />
          </div>
          <div>
            <span className={label}>RUC</span>
            <input className={input} value={f.ruc} onChange={set('ruc')} inputMode="numeric" maxLength={11} />
          </div>
          <div>
            <span className={label}>Teléfono / WhatsApp</span>
            <input className={input} value={f.telefono} onChange={set('telefono')} inputMode="tel" />
          </div>
          <div className="md:col-span-2">
            <span className={label}>Dirección</span>
            <input className={input} value={f.direccion} onChange={set('direccion')} />
          </div>
          <div className="md:col-span-2">
            <span className={label}>Asesor comercial</span>
            <input className={input} value={f.asesor_comercial} onChange={set('asesor_comercial')} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#FF6B5E]">{error}</p>
          <div className="flex gap-2">
            {editando != null && (
              <button type="button" onClick={cancelar} className="rounded-lg border border-[#17496B] px-4 py-2.5 text-sm text-[#9FB3C8]">
                Cancelar
              </button>
            )}
            <button disabled={guardando} className="rounded-lg bg-[#FFC107] px-6 py-2.5 font-bold text-[#061626] disabled:opacity-50">
              {guardando ? 'Guardando…' : editando == null ? 'Guardar proveedor' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {proveedores.length === 0 && <p className="text-sm text-[#9FB3C8]">Aún no hay proveedores.</p>}
        {proveedores.map((p) => {
          const d = (p.telefono ?? '').replace(/\D/g, '')
          const wa = d ? `https://wa.me/${d.length === 9 ? '51' + d : d}` : null
          return (
            <div key={p.id} className="rounded-xl border border-[#17496B] bg-[#09243B] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#F1F5F9]">{p.razon_social}</p>
                  <p className="text-xs text-[#9FB3C8]">{p.ruc ? `RUC ${p.ruc}` : 'Sin RUC'}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => editar(p)} className="rounded-lg p-2 text-[#9FB3C8] hover:bg-[#061626] hover:text-[#FFC107]" aria-label="Editar">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => eliminar(p)} className="rounded-lg p-2 text-[#FF6B5E] hover:bg-[#061626]" aria-label="Eliminar">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-[#9FB3C8]">{p.direccion || 'Sin dirección'}</p>
              <p className="text-sm text-[#9FB3C8]">Asesor: {p.asesor_comercial || '—'}</p>
              <div className="mt-2 flex items-center gap-3 text-sm">
                <span className="text-[#F1F5F9]">{p.telefono || 'Sin teléfono'}</span>
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#3DDC97]">
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}