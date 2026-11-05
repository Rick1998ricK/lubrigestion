'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, PackagePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { TipoProducto } from '@/lib/tipos'
import {
  configDeTipo,
  EXTRA_VACIO,
  limpiarAtributos,
  type DatosExtra,
} from '@/lib/campos-producto'
import CamposProducto from '@/components/productos/CamposProducto'
import BuscadorProducto from '@/components/productos/BuscadorProducto'

type Prov = { id: number; razon_social: string }
type Prod = {
  id: number
  etiqueta: string
  busqueda: string
  precio_compra: number
  precio_venta: number
}
type Linea = { producto_id: number | ''; cantidad: number; precio: number }

const NUEVO_VACIO = {
  nombre: '',
  tipo: 'lubricante',
  marca: '',
  viscosidad: '',
  precioCompra: '',
  precioVenta: '',
}

const input =
  'w-full rounded-lg border border-[#17496B] bg-[#061626] px-3 py-2 text-base text-[#F1F5F9] outline-none focus:border-[#FFC107] md:text-sm'
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-[#9FB3C8]'

function Margen({ compra, venta }: { compra: number; venta: number }) {
  if (!venta) return <span className="text-[#9FB3C8]">Sin precio de venta</span>
  const m = venta - compra
  const pct = (m / venta) * 100
  return (
    <span className={m >= 0 ? 'text-[#3DDC97]' : 'text-[#FF6B5E]'}>
      Venta S/ {venta.toFixed(2)} · Margen S/ {m.toFixed(2)} ({pct.toFixed(0)}%)
    </span>
  )
}

export default function FormCompra({
  proveedores,
  productos,
  marcas,
  tipos,
}: {
  proveedores: Prov[]
  productos: Prod[]
  marcas: string[]
  tipos: TipoProducto[]
}) {
  const router = useRouter()
  const [productosLista, setProductosLista] = useState<Prod[]>(productos)
  const [proveedorId, setProveedorId] = useState<number | ''>('')
  const [condicion, setCondicion] = useState<'contado' | 'credito' | 'contra_entrega'>('contado')
  const [fechaLimite, setFechaLimite] = useState('')
  const [medioPago, setMedioPago] = useState('efectivo')
  const [documento, setDocumento] = useState('')
  const [lineas, setLineas] = useState<Linea[]>([{ producto_id: '', cantidad: 1, precio: 0 }])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const [nuevoAbierto, setNuevoAbierto] = useState(false)
  const [nuevo, setNuevo] = useState(NUEVO_VACIO)
  const [extra, setExtra] = useState<DatosExtra>(EXTRA_VACIO)
  const [creando, setCreando] = useState(false)
  const [errorNuevo, setErrorNuevo] = useState('')

  const total = lineas.reduce((s, l) => s + l.cantidad * l.precio, 0)
  const cfgNuevo = configDeTipo(nuevo.tipo)

  function setLinea(i: number, cambio: Partial<Linea>) {
    setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...cambio } : l)))
  }

  function elegirProducto(i: number, id: number | '') {
    const p = productosLista.find((x) => x.id === id)
    setLinea(i, { producto_id: id, precio: p ? p.precio_compra : 0 })
  }

  function cambiarTipo(tipo: string) {
    setNuevo({ ...nuevo, tipo, viscosidad: '' })
    setExtra({ ...extra, atributos: {}, presentacion: '' })
  }

  async function crearProducto() {
    setErrorNuevo('')
    if (!nuevo.nombre.trim()) return setErrorNuevo('Escribe el nombre del producto.')

    const viscosidad = cfgNuevo.usaViscosidad ? nuevo.viscosidad : ''
    // En tipos sin viscosidad el código también se guarda en viscosidad_codigo
    // (compatibilidad con Ventas y Clientes)
    const viscosidadGuardada = cfgNuevo.usaViscosidad ? viscosidad : extra.codigo

    setCreando(true)
    const { data, error } = await createClient().rpc('crear_producto', {
      p_nombre: nuevo.nombre,
      p_tipo: nuevo.tipo,
      p_marca: nuevo.marca,
      p_viscosidad_codigo: viscosidadGuardada,
      p_precio_compra: Number(nuevo.precioCompra) || 0,
      p_precio_venta: Number(nuevo.precioVenta) || 0,
      p_codigo: extra.codigo,
      p_presentacion: extra.presentacion,
      p_stock_minimo: extra.stock_minimo === '' ? null : Number(extra.stock_minimo),
      p_ubicacion: extra.ubicacion,
      p_ean: extra.ean,
      p_atributos: limpiarAtributos(extra.atributos),
    })
    setCreando(false)
    if (error) return setErrorNuevo(error.message)

    const id = Number(data)
    const { data: reg } = await createClient()
      .from('productos').select('codigo_tienda').eq('id', id).single()
    const codTienda = (reg?.codigo_tienda ?? '') as string
    const existente = productosLista.find((p) => p.id === id)
    const escrito = Number(nuevo.precioCompra) || 0
    const precio = escrito > 0 ? escrito : existente?.precio_compra ?? 0
    const venta = Number(nuevo.precioVenta) || existente?.precio_venta || 0
    const etiqueta = [
      codTienda,
      nuevo.marca.trim().toUpperCase(),
      nuevo.nombre.trim(),
      viscosidad.trim(),
      extra.codigo.trim(),
      extra.presentacion.trim(),
    ]
      .filter(Boolean)
      .join(' · ')
    const busqueda = [etiqueta, extra.ean].filter(Boolean).join(' ').toLowerCase()

    setProductosLista((ps) =>
      ps.some((p) => p.id === id)
        ? ps
        : [...ps, { id, etiqueta, busqueda, precio_compra: precio, precio_venta: venta }],
    )
    setLineas((ls) => {
      const linea: Linea = { producto_id: id, cantidad: 1, precio }
      const vacia = ls.findIndex((l) => l.producto_id === '')
      return vacia >= 0 ? ls.map((l, i) => (i === vacia ? linea : l)) : [...ls, linea]
    })
    setNuevo(NUEVO_VACIO)
    setExtra(EXTRA_VACIO)
    setNuevoAbierto(false)
    setOk(`Producto creado con código de tienda ${codTienda}. Ya está en la compra.`)
    router.refresh()
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setOk('')
    const validas = lineas.filter((l) => l.producto_id !== '' && l.cantidad >= 0)
    if (validas.length === 0) return setError('Agrega al menos un producto.')
    if (condicion === 'credito' && !fechaLimite)
      return setError('Indica la fecha límite de pago del crédito.')

    setCargando(true)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('registrar_compra', {
      p_proveedor_id: proveedorId === '' ? null : proveedorId,
      p_condicion: condicion,
      p_fecha_limite: condicion === 'credito' ? fechaLimite : null,
      p_medio_pago: condicion === 'credito' ? null : medioPago,
      p_documento: documento,
      p_items: validas.map((l) => ({
        producto_id: l.producto_id,
        cantidad: l.cantidad,
        precio_compra: l.precio,
      })),
    })
    setCargando(false)
    if (error) return setError(error.message)

    setOk(`Compra registrada. Total S/ ${Number((data as any).total).toFixed(2)}`)
    setLineas([{ producto_id: '', cantidad: 1, precio: 0 }])
    setDocumento('')
    setFechaLimite('')
    router.refresh()
  }

  return (
    <form
      onSubmit={guardar}
      className="space-y-5 rounded-2xl border border-[#17496B] bg-[#09243B] p-5"
    >
      <h2 className="font-display text-2xl uppercase tracking-wide text-[#FFC107]">
        Registrar compra
      </h2>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <span className={label}>Proveedor</span>
          <select
            className={input}
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">— Sin proveedor —</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>{p.razon_social}</option>
            ))}
          </select>
        </div>
        <div>
          <span className={label}>Condición</span>
          <select className={input} value={condicion} onChange={(e) => setCondicion(e.target.value as any)}>
            <option value="contado">Contado</option>
            <option value="credito">Crédito</option>
            <option value="contra_entrega">Contra entrega</option>
          </select>
        </div>
        <div>
          <span className={label}>Factura / guía</span>
          <input className={input} value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="F001-1234" />
        </div>
        {condicion === 'credito' ? (
          <div>
            <span className={label}>Fecha límite de pago</span>
            <input type="date" className={input} value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} />
          </div>
        ) : (
          <div>
            <span className={label}>Medio de pago</span>
            <select className={input} value={medioPago} onChange={(e) => setMedioPago(e.target.value)}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="yape_plin">Yape / Plin</option>
            </select>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <span className={label}>Productos</span>

        <div className="hidden gap-2 text-xs uppercase tracking-wider text-[#9FB3C8] md:grid md:grid-cols-[1fr_90px_120px_auto]">
          <span>Producto</span>
          <span>Cantidad</span>
          <span>Precio compra</span>
          <span className="w-9" />
        </div>

        {lineas.map((l, i) => {
          const prod = productosLista.find((p) => p.id === l.producto_id)
          return (
            <div key={i} className="space-y-1">
              <div className="grid grid-cols-[1fr_auto] gap-2 md:grid-cols-[1fr_90px_120px_auto]">
                <div className="col-span-2 md:col-span-1">
                  <BuscadorProducto
                    opciones={productosLista}
                    valor={l.producto_id}
                    onChange={(id) => elegirProducto(i, id)}
                    className={input}
                  />
                </div>
                <input
                  type="number" min={0} step={1} className={input} value={l.cantidad}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setLinea(i, { cantidad: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                  aria-label="Cantidad"
                />
                <input
                  type="number" min={0} step="0.01" className={input} value={l.precio}
                  onChange={(e) => setLinea(i, { precio: Number(e.target.value) })}
                  aria-label="Precio de compra"
                />
                <button
                  type="button"
                  onClick={() => setLineas((ls) => (ls.length > 1 ? ls.filter((_, k) => k !== i) : ls))}
                  className="rounded-lg p-2 text-[#FF6B5E] hover:bg-[#061626]"
                  aria-label="Quitar"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              {prod && (
                <p className="text-xs">
                  <Margen compra={l.precio} venta={prod.precio_venta} />
                </p>
              )}
            </div>
          )
        })}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <button
            type="button"
            onClick={() => setLineas((ls) => [...ls, { producto_id: '', cantidad: 1, precio: 0 }])}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#FFC107]"
          >
            <Plus size={16} /> Agregar producto
          </button>
          <button
            type="button"
            onClick={() => setNuevoAbierto((v) => !v)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#FFC107]"
          >
            <PackagePlus size={16} /> {nuevoAbierto ? 'Cerrar producto nuevo' : 'Producto nuevo'}
          </button>
        </div>

        {nuevoAbierto && (
          <div className="space-y-3 rounded-xl border border-[#17496B] bg-[#061626] p-4">
            <p className="text-sm font-semibold text-[#F1F5F9]">
              Crear producto que aún no existe
            </p>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <span className={label}>Tipo</span>
                <select
                  className={input} value={nuevo.tipo}
                  onChange={(e) => cambiarTipo(e.target.value)}
                >
                  {tipos.filter((t) => t.activo).map((t) => (
                    <option key={t.clave} value={t.clave}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <span className={label}>Nombre</span>
                <input
                  className={input} value={nuevo.nombre}
                  onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                  placeholder={cfgNuevo.placeholderNombre}
                />
              </div>
              <div>
                <span className={label}>Marca</span>
                <input
                  className={input} list="compra-marcas" value={nuevo.marca}
                  onChange={(e) => setNuevo({ ...nuevo, marca: e.target.value })}
                  placeholder="ROWE"
                />
                <datalist id="compra-marcas">
                  {marcas.map((m) => <option key={m} value={m} />)}
                </datalist>
              </div>
              {cfgNuevo.usaViscosidad && (
                <div>
                  <span className={label}>Viscosidad</span>
                  <input
                    className={input} value={nuevo.viscosidad}
                    onChange={(e) => setNuevo({ ...nuevo, viscosidad: e.target.value })}
                    placeholder="5W-30"
                  />
                </div>
              )}
            </div>

            <CamposProducto tipo={nuevo.tipo} valor={extra} onChange={setExtra} />

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <span className={label}>Precio de compra (S/)</span>
                <input
                  type="number" min={0} step="0.01" className={input} value={nuevo.precioCompra}
                  onChange={(e) => setNuevo({ ...nuevo, precioCompra: e.target.value })}
                />
              </div>
              <div>
                <span className={label}>Precio de venta (S/)</span>
                <input
                  type="number" min={0} step="0.01" className={input} value={nuevo.precioVenta}
                  onChange={(e) => setNuevo({ ...nuevo, precioVenta: e.target.value })}
                />
              </div>
              <div className="flex items-end pb-2 text-xs">
                <Margen
                  compra={Number(nuevo.precioCompra) || 0}
                  venta={Number(nuevo.precioVenta) || 0}
                />
              </div>
            </div>

            <p className="text-xs text-[#9FB3C8]">
              El código de tienda se asigna solo al crearlo. La descripción, la aplicación y la ficha técnica
              se completan después en Catálogo → Editar.
            </p>

            {errorNuevo && <p className="text-sm text-[#FF6B5E]">{errorNuevo}</p>}
            <button
              type="button"
              onClick={crearProducto}
              disabled={creando}
              className="rounded-lg bg-[#FFC107] px-4 py-2 text-sm font-bold text-[#061626] disabled:opacity-50"
            >
              {creando ? 'Creando…' : 'Crear y agregar a la compra'}
            </button>
          </div>
        )}

        <p className="text-xs text-[#9FB3C8]">
          ¿Mercadería que ya tenías (carga inicial)? Regístrala como compra con
          «Sin proveedor» y deja la factura vacía.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#17496B] pt-4">
        <p className="text-[#F1F5F9]">
          Total: <span className="font-display text-3xl text-[#FFC107]">S/ {total.toFixed(2)}</span>
        </p>
        <button
          disabled={cargando}
          className="rounded-lg bg-[#FFC107] px-6 py-3 font-bold text-[#061626] disabled:opacity-50"
        >
          {cargando ? 'Guardando…' : 'Guardar compra'}
        </button>
      </div>

      {error && <p className="text-sm text-[#FF6B5E]">{error}</p>}
      {ok && <p className="text-sm text-[#3DDC97]">{ok}</p>}
    </form>
  )
}