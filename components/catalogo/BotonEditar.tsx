'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { FileText, Pencil, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  configDeTipo,
  EXTRA_VACIO,
  limpiarAtributos,
  type DatosExtra,
} from '@/lib/campos-producto'
import CamposProducto from '@/components/productos/CamposProducto'
import type { TipoProducto } from '@/lib/tipos'

const input =
  'w-full rounded-lg border border-[#17496B] bg-[#061626] px-3 py-2 text-base text-[#F1F5F9] outline-none focus:border-[#FFC107] md:text-sm'
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-[#9FB3C8]'

type Marca = { id: number; nombre: string }

function mensajeCodigos(m: string) {
  if (m.includes('productos_ean_uk')) return 'Ya existe otro producto con ese EAN.'
  if (m.includes('productos_codigo_producto_uk'))
    return 'Ya existe otro producto de esa marca con ese código de producto.'
  if (m.includes('productos_ean_check')) return 'El EAN debe tener entre 8 y 14 dígitos.'
  return m
}

export default function BotonEditar({ id, tipos }: { id: number; tipos: TipoProducto[] }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [montado, setMontado] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [marcas, setMarcas] = useState<Marca[]>([])

  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('lubricante')
  const [marcaId, setMarcaId] = useState('')
  const [viscosidad, setViscosidad] = useState('')
  const [extra, setExtra] = useState<DatosExtra>(EXTRA_VACIO)
  const [compra, setCompra] = useState('')
  const [venta, setVenta] = useState('')
  const [compraOriginal, setCompraOriginal] = useState(0)
  const [codTienda, setCodTienda] = useState('')

  const [orgId, setOrgId] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [aplicacion, setAplicacion] = useState('')
  const [fichaTexto, setFichaTexto] = useState('')
  const [fichaUrl, setFichaUrl] = useState('')
  const [fichaArchivo, setFichaArchivo] = useState<File | null>(null)
  const [enCatalogo, setEnCatalogo] = useState(true)
  const [quitarFicha, setQuitarFicha] = useState(false)

  const cfg = configDeTipo(tipo)

  useEffect(() => setMontado(true), [])

  useEffect(() => {
    if (!abierto) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [abierto])

  async function abrir() {
    setAbierto(true)
    setError('')
    setCargando(true)
    setFichaArchivo(null)
    setQuitarFicha(false)
    const supabase = createClient()
    const [p, m] = await Promise.all([
      supabase
        .from('productos')
        .select(
          'organizacion_id, nombre, tipo, marca_id, viscosidad_codigo, codigo, ean, codigo_tienda, presentacion, stock_minimo, ubicacion, atributos, descripcion, aplicacion, ficha_tecnica_texto, ficha_tecnica_url, en_catalogo, precio_compra, precio_venta',
        )
        .eq('id', id)
        .single(),
      supabase.from('marcas').select('id, nombre').order('nombre'),
    ])
    setCargando(false)
    if (p.error || !p.data) return setError(p.error?.message ?? 'No se pudo cargar el producto')
    const d: any = p.data
    const cfgActual = configDeTipo(d.tipo)
    setOrgId(d.organizacion_id ?? '')
    setNombre(d.nombre)
    setTipo(d.tipo)
    setMarcaId(d.marca_id ? String(d.marca_id) : '')
    setViscosidad(cfgActual.usaViscosidad ? d.viscosidad_codigo ?? '' : '')
    setExtra({
      // En tipos sin viscosidad, el código antiguo estaba en viscosidad_codigo
      codigo: d.codigo ?? (cfgActual.usaViscosidad ? '' : d.viscosidad_codigo ?? ''),
      ean: d.ean ?? '',
      presentacion: d.presentacion ?? '',
      stock_minimo: d.stock_minimo == null ? '' : String(d.stock_minimo),
      ubicacion: d.ubicacion ?? '',
      atributos: Object.fromEntries(
        Object.entries(d.atributos ?? {}).map(([k, v]) => [k, String(v)]),
      ),
    })
    setDescripcion(d.descripcion ?? '')
    setAplicacion(d.aplicacion ?? '')
    setFichaTexto(d.ficha_tecnica_texto ?? '')
    setFichaUrl(d.ficha_tecnica_url ?? '')
    setEnCatalogo(d.en_catalogo ?? true)
    setCodTienda(d.codigo_tienda ?? '')
    setCompra(String(d.precio_compra))
    setVenta(String(d.precio_venta))
    setCompraOriginal(Number(d.precio_compra))
    setMarcas((m.data ?? []) as Marca[])
  }

  function cambiarTipo(nuevo: string) {
    setTipo(nuevo)
    setExtra((e) => ({ ...e, atributos: {} }))
  }

  function elegirPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.type !== 'application/pdf') return setError('La ficha técnica debe ser un archivo PDF.')
    if (f.size > 10 * 1024 * 1024) return setError('El PDF no puede pesar más de 10 MB.')
    setError('')
    setFichaArchivo(f)
    setQuitarFicha(false)
  }

  const pc = Number(compra) || 0
  const pv = Number(venta) || 0
  const margen = pv - pc
  const pct = pv > 0 ? (margen / pv) * 100 : 0

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!nombre.trim()) return setError('El nombre es obligatorio.')
    if (pc < 0 || pv < 0) return setError('Los precios no pueden ser negativos.')
    if (extra.stock_minimo !== '' && Number(extra.stock_minimo) < 0)
      return setError('El stock mínimo no puede ser negativo.')

    setGuardando(true)
    const supabase = createClient()

    // Ficha técnica en PDF: subir la nueva (si hay) o quitar la actual
    const urlAnterior = fichaUrl
    let urlFinal: string | null = quitarFicha ? null : fichaUrl || null
    if (fichaArchivo) {
      const ruta = `${orgId}/${id}-${Date.now()}.pdf`
      const { error: eUp } = await supabase.storage
        .from('fichas')
        .upload(ruta, fichaArchivo, { contentType: 'application/pdf' })
      if (eUp) {
        setGuardando(false)
        return setError('No se pudo subir la ficha técnica: ' + eUp.message)
      }
      urlFinal = supabase.storage.from('fichas').getPublicUrl(ruta).data.publicUrl
    }

    const { error: e1 } = await supabase
      .from('productos')
      .update({
        nombre: nombre.trim(),
        tipo,
        marca_id: marcaId ? Number(marcaId) : null,
        // En tipos sin viscosidad, el código también va a viscosidad_codigo (compatibilidad)
        viscosidad_codigo: (cfg.usaViscosidad ? viscosidad.trim() : extra.codigo.trim()) || null,
        codigo: extra.codigo.trim() || null,
        ean: extra.ean.trim() || null,
        presentacion: extra.presentacion.trim() || null,
        stock_minimo: extra.stock_minimo === '' ? null : Math.round(Number(extra.stock_minimo)),
        ubicacion: extra.ubicacion.trim() || null,
        atributos: limpiarAtributos(extra.atributos),
        descripcion: descripcion.trim() || null,
        aplicacion: aplicacion.trim() || null,
        ficha_tecnica_texto: fichaTexto.trim() || null,
        ficha_tecnica_url: urlFinal,
        en_catalogo: enCatalogo,
        precio_compra: pc,
        precio_venta: pv,
      })
      .eq('id', id)
    if (e1) {
      setGuardando(false)
      return setError(mensajeCodigos(e1.message))
    }

    // Se borra el PDF anterior si fue reemplazado o quitado (si falla, no importa)
    if (urlAnterior && urlAnterior !== urlFinal) {
      const rutaVieja = urlAnterior.split('/fichas/')[1]
      if (rutaVieja) await supabase.storage.from('fichas').remove([decodeURIComponent(rutaVieja)])
    }

    // Si cambió el costo, queda registrado en el historial de precios
    if (pc !== compraOriginal) {
      await supabase.from('historial_precios').insert({ producto_id: id, precio_compra: pc })
    }
    setGuardando(false)
    setAbierto(false)
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-lg bg-[#061626]/90 px-2.5 py-1.5 text-xs font-semibold text-[#9FB3C8] ring-1 ring-[#17496B] hover:text-[#FFC107] hover:ring-[#FFC107]"
      >
        <Pencil size={14} /> Editar
      </button>

      {montado &&
        abierto &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4"
            onClick={() => setAbierto(false)}
          >
            <form
              onSubmit={guardar}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-t-2xl border border-[#17496B] bg-[#09243B] p-5 md:rounded-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl uppercase tracking-wide text-[#FFC107]">
                  Editar producto
                </h2>
                <button type="button" onClick={() => setAbierto(false)} className="p-1 text-[#9FB3C8]" aria-label="Cerrar">
                  <X size={20} />
                </button>
              </div>

              {cargando ? (
                <p className="text-sm text-[#9FB3C8]">Cargando…</p>
              ) : (
                <>
                  <div>
                    <span className={label}>Nombre</span>
                    <input className={input} value={nombre} onChange={(e) => setNombre(e.target.value)} />
                  </div>
                  {codTienda && (
                    <p className="text-sm text-[#9FB3C8]">
                      Código de tienda: <b className="text-[#FFC107]">{codTienda}</b>
                    </p>
                  )}
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <span className={label}>Tipo</span>
                      <select className={input} value={tipo} onChange={(e) => cambiarTipo(e.target.value)}>
                        {tipos
                          .filter((t) => t.activo || t.clave === tipo)
                          .map((t) => (
                            <option key={t.clave} value={t.clave}>{t.nombre}</option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <span className={label}>Marca</span>
                      <select className={input} value={marcaId} onChange={(e) => setMarcaId(e.target.value)}>
                        <option value="">— Sin marca —</option>
                        {marcas.map((m) => (
                          <option key={m.id} value={m.id}>{m.nombre}</option>
                        ))}
                      </select>
                    </div>
                    {cfg.usaViscosidad && (
                      <div>
                        <span className={label}>Viscosidad</span>
                        <input
                          className={input} value={viscosidad}
                          onChange={(e) => setViscosidad(e.target.value)}
                          placeholder="5W-30"
                        />
                      </div>
                    )}
                  </div>

                  <CamposProducto tipo={tipo} valor={extra} onChange={setExtra} />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className={label}>Precio de compra (S/)</span>
                      <input
                        type="number" min={0} step="0.01" inputMode="decimal"
                        className={input} value={compra} onChange={(e) => setCompra(e.target.value)}
                      />
                    </div>
                    <div>
                      <span className={label}>Precio de venta (S/)</span>
                      <input
                        type="number" min={0} step="0.01" inputMode="decimal"
                        className={input} value={venta} onChange={(e) => setVenta(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg bg-[#061626] p-3 text-sm">
                    <span className="text-[#9FB3C8]">Margen por unidad: </span>
                    <b className={margen >= 0 ? 'text-[#3DDC97]' : 'text-[#FF6B5E]'}>
                      S/ {margen.toFixed(2)} ({pct.toFixed(0)}%)
                    </b>
                    {margen < 0 && <p className="mt-1 text-xs text-[#FF6B5E]">Estás vendiendo por debajo del costo.</p>}
                  </div>

                  <div className="space-y-3 rounded-xl border border-[#17496B] p-4">
                    <p className="font-display text-lg uppercase tracking-wide text-[#F1F5F9]">
                      Ficha del producto
                    </p>
                    <div>
                      <label className="mb-3 flex items-center gap-2 text-sm text-[#F1F5F9]">
                        <input
                          type="checkbox"
                          checked={enCatalogo}
                          onChange={(e) => setEnCatalogo(e.target.checked)}
                          className="size-4 accent-[#FFC107]"
                        />
                        Mostrar en el catálogo para compartir
                      </label>
                      <span className={label}>Descripción</span>
                      <textarea
                        className={input} rows={2} value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        placeholder="Qué es y qué ventajas tiene"
                      />
                    </div>
                    <div>
                      <span className={label}>Aplicación (vehículos o usos compatibles)</span>
                      <textarea
                        className={input} rows={2} value={aplicacion}
                        onChange={(e) => setAplicacion(e.target.value)}
                        placeholder="Toyota Hilux 2.4 2016-2022; Hyundai Accent 2012-2018…"
                      />
                    </div>
                    <div>
                      <span className={label}>Ficha técnica (texto)</span>
                      <textarea
                        className={input} rows={3} value={fichaTexto}
                        onChange={(e) => setFichaTexto(e.target.value)}
                        placeholder="Especificaciones, normas, recomendaciones"
                      />
                    </div>
                    <div>
                      <span className={label}>Ficha técnica (PDF, máx. 10 MB)</span>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        {fichaUrl && !quitarFicha && !fichaArchivo && (
                          <>
                            <a
                              href={fichaUrl} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-[#FFC107] hover:underline"
                            >
                              <FileText size={16} /> Ver PDF actual
                            </a>
                            <button
                              type="button" onClick={() => setQuitarFicha(true)}
                              className="text-[#FF6B5E] hover:underline"
                            >
                              Quitar
                            </button>
                          </>
                        )}
                        {quitarFicha && (
                          <span className="text-[#9FB3C8]">
                            El PDF se quitará al guardar.{' '}
                            <button type="button" onClick={() => setQuitarFicha(false)} className="text-[#FFC107] underline">
                              Deshacer
                            </button>
                          </span>
                        )}
                        {fichaArchivo && (
                          <span className="text-[#3DDC97]">
                            Nuevo: {fichaArchivo.name}{' '}
                            <button type="button" onClick={() => setFichaArchivo(null)} className="text-[#FF6B5E] underline">
                              Cancelar
                            </button>
                          </span>
                        )}
                        <label className="cursor-pointer rounded-lg border border-[#17496B] px-3 py-1.5 font-semibold text-[#9FB3C8] hover:border-[#FFC107] hover:text-[#FFC107]">
                          {fichaUrl || fichaArchivo ? 'Reemplazar PDF' : 'Subir PDF'}
                          <input type="file" accept="application/pdf" className="hidden" onChange={elegirPdf} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-[#9FB3C8]">
                    El stock no se edita aquí: sube con Compras, baja con Ventas y se corrige con el conteo
                    físico. Las ventas ya hechas conservan el costo que tenían.
                  </p>
                </>
              )}

              {error && <p className="text-sm text-[#FF6B5E]">{error}</p>}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setAbierto(false)} className="rounded-lg border border-[#17496B] px-4 py-2.5 text-sm text-[#9FB3C8]">
                  Cancelar
                </button>
                <button
                  disabled={guardando || cargando}
                  className="rounded-lg bg-[#FFC107] px-6 py-2.5 font-bold text-[#061626] disabled:opacity-50"
                >
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </>
  )
}