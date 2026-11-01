'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, Search } from 'lucide-react'
import { minimoDe } from '@/lib/campos-producto'
import { createClient } from '@/lib/supabase/client'
import BotonEditar from './BotonEditar'
import { iconoDe, type TipoProducto } from '@/lib/tipos'

type Producto = {
  id: number
  nombre: string
  tipo: string
  marca: string
  codigo: string
  ref: string
  ean: string
  codigoTienda: string
  presentacion: string
  minimo: number | null
  detalle: string
  buscable: string
  stock: number
  precio: number
  imagen: string | null
}

const control =
  'rounded-lg border border-[#17496B] bg-[#09243B] px-3 py-2 text-base text-[#F1F5F9] outline-none focus:border-[#FFC107] md:text-sm'

function Estado({ stock, minimo }: { stock: number; minimo: number }) {
  if (stock <= 0)
    return <span className="rounded-full bg-[#FF6B5E]/15 px-2 py-0.5 text-xs font-semibold text-[#FF6B5E]">Agotado</span>
  if (stock < minimo)
    return <span className="rounded-full bg-[#FFC107]/15 px-2 py-0.5 text-xs font-semibold text-[#FFC107]">Quedan {stock}</span>
  return <span className="rounded-full bg-[#3DDC97]/15 px-2 py-0.5 text-xs font-semibold text-[#3DDC97]">Disponible</span>
}

// Reduce la foto a 800 px máx. y la convierte a JPEG (fondo blanco)
async function reducir(file: File, max = 800): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const esc = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * esc)
  c.height = Math.round(bmp.height * esc)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo procesar la imagen'))), 'image/jpeg', 0.85),
  )
}

export default function CatalogoGrid({
    productos,
    esAdmin,
    orgId,
    tipos,
  }: {
    productos: Producto[]
    esAdmin: boolean
    orgId: string
    tipos: TipoProducto[]
  }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const objetivo = useRef<number | null>(null)

  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState('')
  const [marca, setMarca] = useState('')
  const [soloDisponibles, setSoloDisponibles] = useState(false)
  const [subiendo, setSubiendo] = useState<number | null>(null)
  const [fotos, setFotos] = useState<Record<number, string>>({})
  const [error, setError] = useState('')

  const marcas = useMemo(
    () => Array.from(new Set(productos.map((p) => p.marca).filter(Boolean))).sort(),
    [productos],
  )

  const visibles = productos.filter((p) => {
    if (tipo && p.tipo !== tipo) return false
    if (marca && p.marca !== marca) return false
    if (soloDisponibles && p.stock <= 0) return false
    if (q) {
      const t = q.toLowerCase()
      const campos = [p.nombre, p.marca, p.codigo, p.ref, p.ean, p.codigoTienda, p.presentacion, p.detalle, p.buscable]
      if (!campos.some((x) => x.toLowerCase().includes(t))) return false
    }
    return true
  })

  function elegirFoto(id: number) {
    objetivo.current = id
    inputRef.current?.click()
  }

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const id = objetivo.current
    e.target.value = ''
    if (!file || id == null) return
    if (!file.type.startsWith('image/')) return setError('Elige un archivo de imagen.')

    setError('')
    setSubiendo(id)
    try {
      const blob = await reducir(file)
      const supabase = createClient()
      const ruta = `${orgId}/${id}-${Date.now()}.jpg`
      const { error: e1 } = await supabase.storage
        .from('productos')
        .upload(ruta, blob, { contentType: 'image/jpeg' })
      if (e1) throw e1

      const { data } = supabase.storage.from('productos').getPublicUrl(ruta)
      const { error: e2 } = await supabase.from('productos').update({ imagen_url: data.publicUrl }).eq('id', id)
      if (e2) throw e2

      setFotos((f) => ({ ...f, [id]: data.publicUrl }))
      router.refresh()
    } catch (err: any) {
      setError(err.message ?? 'No se pudo subir la foto.')
    } finally {
      setSubiendo(null)
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={subir} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9FB3C8]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar producto, marca, código o compatibilidad"
            className={`${control} w-full pl-9`}
          />
        </div>
        <select className={control} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
            {tipos.map((t) => (
              <option key={t.clave} value={t.clave}>{t.nombre_plural}</option>
            ))}
        </select>
        <select className={control} value={marca} onChange={(e) => setMarca(e.target.value)}>
          <option value="">Todas las marcas</option>
          {marcas.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-[#9FB3C8]">
          <input
            type="checkbox"
            checked={soloDisponibles}
            onChange={(e) => setSoloDisponibles(e.target.checked)}
            className="h-4 w-4 accent-[#FFC107]"
          />
          Solo con stock
        </label>
      </div>

      <p className="text-sm text-[#9FB3C8]">{visibles.length} producto(s)</p>
      {error && <p className="text-sm text-[#FF6B5E]">{error}</p>}

      {visibles.length === 0 ? (
        <p className="text-sm text-[#9FB3C8]">No hay productos con esos filtros.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {visibles.map((p) => {
            const tipoInfo = tipos.find((t) => t.clave === p.tipo)
            const Icono = iconoDe(tipoInfo?.icono)
            const imagen = fotos[p.id] ?? p.imagen
            const sub = [p.presentacion, p.ref].filter(Boolean).join(' · ')
            return (
              <article
                key={p.id}
                className={`overflow-hidden rounded-2xl border border-[#17496B] bg-[#09243B] ${p.stock <= 0 ? 'opacity-60' : ''}`}
              >
                <div className="relative flex aspect-square items-center justify-center bg-[#061626]">
                  {imagen ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagen} alt={p.nombre} className="h-full w-full object-contain p-3" loading="lazy" />
                  ) : (
                    <Icono size={44} className="text-[#17496B]" />
                  )}
                  {esAdmin && (
                    <button
                      type="button"
                      onClick={() => elegirFoto(p.id)}
                      disabled={subiendo !== null}
                      className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-[#061626]/90 px-2.5 py-1.5 text-xs font-semibold text-[#FFC107] ring-1 ring-[#17496B] hover:ring-[#FFC107] disabled:opacity-50"
                    >
                      {subiendo === p.id ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                      {imagen ? 'Cambiar' : 'Foto'}
                    </button>
                  )}
                  {esAdmin && <BotonEditar id={p.id} tipos={tipos} />}
                </div>
                <div className="space-y-1.5 p-3">
                  <p className="text-xs uppercase tracking-wider text-[#9FB3C8]">
                      {p.marca || tipoInfo?.nombre_plural}
                      {p.codigoTienda ? ` · ${p.codigoTienda}` : ''}
                  </p>
                  <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight text-[#F1F5F9]">
                    {p.nombre}
                    {p.codigo ? ` · ${p.codigo}` : ''}
                  </p>
                  {(sub || p.detalle) && (
                    <p className="line-clamp-2 text-xs text-[#9FB3C8]">
                      {[sub, p.detalle].filter(Boolean).join(' — ')}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="font-display text-2xl text-[#FFC107]">S/ {p.precio.toFixed(2)}</span>
                    <Estado stock={p.stock} minimo={minimoDe(p.minimo)} />
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}