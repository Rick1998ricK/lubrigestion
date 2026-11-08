'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Download, MessageCircle, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ResumenVenta } from './tipos'
import PanelResultado from './PanelResultado'
import BuscadorCliente from './BuscadorCliente'
import BuscadorProducto from '@/components/productos/BuscadorProducto'
import MedidorEstado from './MedidorEstado'
import FotosVehiculo, { type FotoLocal } from './FotosVehiculo'
import { MEDICIONES, estadoDe, type MedicionResumen } from '@/lib/mediciones'
import { textoAtributos } from '@/lib/campos-producto'
import { filtrarPorVehiculo, parsearVehiculos } from '@/lib/compatibilidad'

export type ProductoVenta = {
  id: number
  nombre: string
  tipo: string
  marca: string | null
  viscosidad_codigo: string | null
  stock: number
  precio_venta: number
  codigo_tienda?: string | null
  ean?: string | null
  codigo?: string | null
  aplicacion?: string | null
  precio_compra?: number | null
  atributos?: Record<string, unknown> | null
}
export type ServicioVenta = { id: number; nombre: string; precio_base: number; categoria?: string | null }

type Linea = {
  key: string
  tipo: 'producto' | 'servicio'
  id: number
  nombre: string
  cantidad: number
  precio: number
  bonificacion: boolean
  stockMax?: number
  costo?: number | null
  prodTipo?: string
  marca?: string | null
  codigo?: string | null
}

type Resultado = {
  total: number
  nombre: string
  celular: string
  modelo: string
  placa: string
  kmProximo: number | null
  resumen: ResumenVenta
}

const NO_CAMBIO = 'NO REALIZÓ CAMBIO'

const FILTROS = [
  { campo: 'filtro_aceite', label: 'Filtro de aceite', tipo: 'filtro_aceite' },
  { campo: 'filtro_aire', label: 'Filtro de aire', tipo: 'filtro_aire' },
  { campo: 'filtro_cabina', label: 'Filtro de cabina', tipo: 'filtro_cabina' },
  { campo: 'filtro_combustible', label: 'Filtro de combustible', tipo: 'filtro_combustible' },
] as const

const MED_VACIO: Record<string, { valor: string; estado: string }> = Object.fromEntries(
  MEDICIONES.map((m) => [m.campo, { valor: '', estado: 'no_revisado' }]),
)

const campo =
  'w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-texto placeholder:text-suave/70 outline-none focus:border-acento focus-visible:ring-2 focus-visible:ring-acento'
const etiqueta = 'text-sm font-semibold'
const soles = (n: number) => `S/ ${n.toFixed(2)}`

function margenLinea(l: { costo?: number | null; precio: number; cantidad: number; bonificacion: boolean }) {
  if (l.costo == null) return null
  const pv = l.bonificacion ? 0 : l.precio
  const unidad = pv - l.costo
  return { total: unidad * l.cantidad, pct: pv > 0 ? (unidad / pv) * 100 : null }
}

function enlaceWhatsApp(r: Resultado) {
  const digitos = r.celular.replace(/\D/g, '')
  if (!digitos) return null
  const numero = digitos.length === 9 ? `51${digitos}` : digitos
  const partes = [
    `Hola ${r.nombre},`,
    `tu ${r.modelo || 'vehículo'}${r.placa ? ` (${r.placa})` : ''} ya está listo.`,
  ]
  if (r.kmProximo) partes.push(`Tu próximo cambio es a los ${r.kmProximo.toLocaleString('es-PE')} km.`)
  partes.push('Gracias por visitarnos.')
  return `https://wa.me/${numero}?text=${encodeURIComponent(partes.join(' '))}`
}

async function descargarPdf(r: ResumenVenta) {
  const [{ pdf }, { default: ComprobantePDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./ComprobantePDF'),
  ])
  const blob = await pdf(<ComprobantePDF r={r} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `constancia-${String(r.ventaId).padStart(5, '0')}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

function Seccion({
  titulo,
  resumen,
  abierto,
  onToggle,
  children,
}: {
  titulo: string
  resumen?: string
  abierto: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-borde bg-tarjeta">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
      >
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-semibold">{titulo}</h2>
          {!abierto && resumen && <p className="mt-0.5 truncate text-sm text-suave">{resumen}</p>}
        </div>
        <ChevronDown
          size={22}
          aria-hidden="true"
          className={`shrink-0 text-suave transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={abierto ? 'px-5 pb-5' : 'hidden'}>{children}</div>
    </section>
  )
}

export default function FormVenta({
  productos,
  servicios,
  orgNombre,
  orgId,
}: {
  productos: ProductoVenta[]
  servicios: ServicioVenta[]
  orgNombre: string
  orgId: string
}) {
  const router = useRouter()
  const [fecha, setFecha] = useState('')
  const [lineas, setLineas] = useState<Linea[]>([])
  const [seleccion, setSeleccion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [med, setMed] = useState(MED_VACIO)
  const [fotos, setFotos] = useState<FotoLocal[]>([])

  const formRef = useRef<HTMLFormElement>(null)
  const [abierto, setAbierto] = useState({ cliente: true, ficha: false })
  const [resCliente, setResCliente] = useState('')
  const [veh, setVeh] = useState('')

  function alternar(s: 'cliente' | 'ficha') {
    if (s === 'cliente' && formRef.current) {
      const d = new FormData(formRef.current)
      const t = (n: string) => String(d.get(n) ?? '').trim()
      setResCliente([t('nombres'), t('placa').toUpperCase(), t('modelo')].filter(Boolean).join(' · '))
    }
    setAbierto((a) => ({ ...a, [s]: !a[s] }))
  }

  useEffect(() => {
    setFecha(new Date().toLocaleDateString('en-CA'))
  }, [])

  const total = lineas.reduce((s, l) => s + (l.bonificacion ? 0 : l.precio) * l.cantidad, 0)

  const conCosto = lineas.filter((l) => l.costo != null)
  const margenTotal = conCosto.reduce((s, l) => s + (margenLinea(l)?.total ?? 0), 0)
  const ventaConCosto = conCosto.reduce((s, l) => s + (l.bonificacion ? 0 : l.precio) * l.cantidad, 0)

  // Valores que se guardan en la ficha si el campo se deja vacío
  const lubricante = lineas.find((l) => l.prodTipo === 'lubricante')
  const derivadoFiltro = (tipo: string) => {
    const l = lineas.find((x) => x.prodTipo === tipo)
    return l ? [l.marca, l.codigo].filter(Boolean).join(' ') : ''
  }

  const nMed = MEDICIONES.filter((d) => med[d.campo].estado !== 'no_revisado').length
  const resFicha =
    [
      lubricante ? `Aceite: ${[lubricante.marca, lubricante.codigo].filter(Boolean).join(' ')}` : '',
      nMed ? `${nMed} medición(es)` : '',
      fotos.length ? `${fotos.length} foto(s)` : '',
    ]
      .filter(Boolean)
      .join(' · ') || 'Opcional · se completa sola con los productos de la venta'

  function agregarProducto(id: number | '') {
    if (id === '') return
    const p = productos.find((x) => x.id === id)
    if (!p) return
    setLineas((prev) => {
      const existe = prev.find((l) => l.tipo === 'producto' && l.id === id)
      if (existe) {
        return prev.map((l) =>
          l === existe ? { ...l, cantidad: Math.min(l.cantidad + 1, p.stock) } : l
        )
      }
      return [
        ...prev,
        {
          key: `p-${id}`, tipo: 'producto', id, nombre: p.nombre, cantidad: 1,
          precio: p.precio_venta, bonificacion: false, stockMax: p.stock,
            prodTipo: p.tipo, marca: p.marca, codigo: p.viscosidad_codigo,
            costo: p.precio_compra ?? null,
        },
      ]
    })
  }

  function agregarServicio() {
    if (!seleccion) return
    const id = Number(seleccion)
    const s = servicios.find((x) => x.id === id)
    if (!s) return
    setLineas((prev) => {
      const existe = prev.find((l) => l.tipo === 'servicio' && l.id === id)
      if (existe) {
        return prev.map((l) => (l === existe ? { ...l, cantidad: l.cantidad + 1 } : l))
      }
      return [
        ...prev,
        {
          key: `s-${id}`, tipo: 'servicio', id, nombre: s.nombre, cantidad: 1,
          precio: s.precio_base, bonificacion: false,
        },
      ]
    })
    setSeleccion('')
  }

  const opcionesProducto = useMemo(
    () =>
      productos.map((p) => {
        const etiqueta = [
          p.codigo_tienda,
          p.marca,
          p.nombre,
          p.viscosidad_codigo,
          `${p.stock} uds`,
          soles(p.precio_venta),
        ]
          .filter(Boolean)
          .join(' · ')
        const vehiculos = parsearVehiculos(p.atributos?.vehiculos)
        const base = [etiqueta, p.ean, p.codigo, p.aplicacion, textoAtributos(p.atributos, false)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return {
          id: p.id,
          etiqueta,
          base,
          busqueda: [base, ...vehiculos.map((v) => v.texto)].join(' '),
          vehiculos,
          detalle: vehiculos.map((v) => v.original).join(' · '),
        }
      }),
    [productos],
  )  

  const sugeridos = useMemo(
    () => filtrarPorVehiculo(opcionesProducto.filter((o) => o.vehiculos.length > 0), veh),
    [opcionesProducto, veh],
  )

  function cambiar(key: string, patch: Partial<Linea>) {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    const val = (n: string) => String(f.get(n) ?? '').trim()
    const num = (n: string) => (val(n) === '' ? null : Number(val(n)))

    if (lineas.length === 0) {
      setError('Agrega al menos un producto o servicio')
      return
    }

    setGuardando(true)
    setError(null)
    setResultado(null)

    const filtro = (nombre: string, tipo: string) => val(nombre) || derivadoFiltro(tipo) || NO_CAMBIO

    const { data, error } = await createClient().rpc('registrar_venta', {
      p_cliente: { nombres: val('nombres'), celular: val('celular'), correo: val('correo') },
      p_vehiculo: {
        modelo: val('modelo'), placa: val('placa'),
        km_actual: num('km_actual'), km_proximo: num('km_proximo'),
      },
      p_ficha: {
        fecha: val('fecha'),
        marca_aceite: val('marca_aceite') || lubricante?.marca || '',
        viscosidad: val('viscosidad') || lubricante?.codigo || '',
        filtro_aceite: filtro('filtro_aceite', 'filtro_aceite'),
        filtro_aire: filtro('filtro_aire', 'filtro_aire'),
        filtro_cabina: filtro('filtro_cabina', 'filtro_cabina'),
        filtro_combustible: filtro('filtro_combustible', 'filtro_combustible'),
        bateria: val('bateria'), alternador: val('alternador'),
        frenos: val('frenos'), refrigerante: val('refrigerante'),
        comentarios: val('comentarios'),
        medio_pago: val('medio_pago'),
      },
      p_items: lineas.map((l) => ({
        tipo: l.tipo, id: l.id, cantidad: l.cantidad, precio: l.precio, bonificacion: l.bonificacion,
      })),
    })

    setGuardando(false)
    if (error) {
      setError(error.message)
      return
    }

    const ventaId = Number((data as { venta_id: number }).venta_id)
    const totalVenta = Number((data as { total: number }).total)


    if (fotos.length > 0) {
      const supabase = createClient()
      let fallos = 0
      for (let i = 0; i < fotos.length; i++) {
        const ruta = `${orgId}/${ventaId}/${i + 1}-${crypto.randomUUID()}.jpg`
        const { error: eUp } = await supabase.storage
          .from('fotos-servicio')
          .upload(ruta, fotos[i].blob, { contentType: 'image/jpeg' })
        if (eUp) {
          fallos++
          continue
        }
        const { error: eFila } = await supabase
          .from('venta_fotos')
          .insert({ venta_id: ventaId, ruta, orden: i + 1 })
        if (eFila) fallos++
      }
      if (fallos > 0) setError(`La venta se registró, pero ${fallos} foto(s) no se guardaron.`)
    }

    const medResumen: MedicionResumen[] = MEDICIONES.map((d) => {
      const m = med[d.campo]
      return {
        label: d.label,
        valor: m.valor === '' ? null : Number(m.valor),
        unidad: d.unidad,
        min: d.min,
        max: d.max,
        zonas: d.zonas,
        estado: m.estado as MedicionResumen['estado'],
      }
    })
    const filasMed = MEDICIONES.filter((d) => med[d.campo].estado !== 'no_revisado').map((d) => ({
      venta_id: ventaId,
      componente: d.campo,
      valor: med[d.campo].valor === '' ? null : Number(med[d.campo].valor),
      estado: med[d.campo].estado,
    }))
    if (filasMed.length > 0) {
      const { error: errMed } = await createClient().from('venta_mediciones').insert(filasMed)
      if (errMed) setError(`La venta se registró, pero no se guardaron las mediciones: ${errMed.message}`)
    }

    setResultado({
      total: totalVenta,
      nombre: val('nombres'),
      celular: val('celular'),
      modelo: val('modelo'),
      placa: val('placa').toUpperCase(),
      kmProximo: num('km_proximo'),
      resumen: {
        ventaId,
        org: orgNombre,
        logo: `${window.location.origin}/logo.png`,
        fecha: val('fecha'),
        total: totalVenta,
        cliente: { nombre: val('nombres'), celular: val('celular'), correo: val('correo') },
        vehiculo: {
          modelo: val('modelo'),
          placa: val('placa').toUpperCase(),
          kmActual: num('km_actual'),
          kmProximo: num('km_proximo'),
        },
        ficha: {
          marcaAceite: val('marca_aceite') || lubricante?.marca || '',
          viscosidad: val('viscosidad') || lubricante?.codigo || '',
          filtros: FILTROS.map((fl) => ({ label: fl.label, valor: filtro(fl.campo, fl.tipo) })),
          estados: [],
          mediciones: medResumen,
          comentarios: val('comentarios'),
        },
        fotos: fotos.map((f) => f.dataUrl),
        lineas: lineas.map((l) => ({
          nombre: l.nombre,
          tipo: l.tipo,
          cantidad: l.cantidad,
          precio: l.precio,
          bonificacion: l.bonificacion,
        })),
      },
    })
    form.reset()
    setMed(MED_VACIO)
    setAbierto({ cliente: true, ficha: false })
    setResCliente('')
    setVeh('')
    setFotos([])
    setLineas([])
    setFecha(new Date().toLocaleDateString('en-CA'))
    router.refresh()
  }

  const wa = resultado ? enlaceWhatsApp(resultado) : null

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onInput={(e) => {
        const t = e.target as HTMLInputElement
        if (t.name === 'modelo') setVeh(t.value)
      }}
      onInvalidCapture={() => setAbierto((a) => ({ ...a, cliente: true }))}
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start"
    >
      <div className="space-y-4">
        <Seccion
          titulo="Cliente y vehículo"
          resumen={resCliente || 'Datos del cliente, placa y kilometraje'}
          abierto={abierto.cliente}
          onToggle={() => alternar('cliente')}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <BuscadorCliente />
            <div className="space-y-1.5">
              <label htmlFor="nombres" className={etiqueta}>Nombres y apellidos</label>
              <input id="nombres" name="nombres" required className={campo} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="celular" className={etiqueta}>Celular</label>
              <input id="celular" name="celular" inputMode="tel" placeholder="999 999 999" className={campo} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="correo" className={etiqueta}>Correo</label>
              <input id="correo" name="correo" type="email" placeholder="cliente@correo.com" className={campo} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="fecha" className={etiqueta}>Fecha de mantenimiento</label>
              <input id="fecha" name="fecha" type="date" required value={fecha}
                onChange={(e) => setFecha(e.target.value)} className={campo} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="modelo" className={etiqueta}>Vehículo y modelo</label>
              <input id="modelo" name="modelo" placeholder="Toyota Hilux 2022" className={campo} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="placa" className={etiqueta}>Placa</label>
              <input id="placa" name="placa" placeholder="ABC-123 (opcional)" className={`${campo} uppercase`} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="km_actual" className={etiqueta}>Kilometraje actual</label>
              <input id="km_actual" name="km_actual" type="number" min={0} className={campo} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="km_proximo" className={etiqueta}>Próximo cambio (km)</label>
              <input id="km_proximo" name="km_proximo" type="number" min={0} className={campo} />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={() => alternar('cliente')}
              className="text-sm font-semibold text-acento hover:underline">
              Listo, continuar →
            </button>
          </div>
        </Seccion>

        <Seccion
          titulo="Ficha de mantenimiento"
          resumen={resFicha}
          abierto={abierto.ficha}
          onToggle={() => alternar('ficha')}
        >
          <p className="mb-4 text-sm text-suave">
            Si dejas un campo vacío se guarda lo que ves en gris: el producto que agregaste a la venta, o «{NO_CAMBIO}».
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="marca_aceite" className={etiqueta}>Marca de aceite</label>
              <input id="marca_aceite" name="marca_aceite" placeholder={lubricante?.marca ?? NO_CAMBIO} className={campo} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="viscosidad" className={etiqueta}>Viscosidad</label>
              <input id="viscosidad" name="viscosidad" placeholder={lubricante?.codigo ?? NO_CAMBIO} className={campo} />
            </div>
            {FILTROS.map((fl) => (
              <div key={fl.campo} className="space-y-1.5">
                <label htmlFor={fl.campo} className={etiqueta}>{fl.label}</label>
                <input id={fl.campo} name={fl.campo} placeholder={derivadoFiltro(fl.tipo) || NO_CAMBIO} className={campo} />
              </div>
            ))}
            {MEDICIONES.map((d) => (
              <div key={d.campo} className="sm:col-span-2">
                <MedidorEstado
                  def={d}
                  valor={med[d.campo].valor}
                  estado={med[d.campo].estado}
                  onValor={(v) =>
                    setMed((p) => ({
                      ...p,
                      [d.campo]: {
                        valor: v,
                        estado: v === '' ? p[d.campo].estado : estadoDe(d, Number(v)),
                      },
                    }))
                  }
                  onEstado={(e) =>
                    setMed((p) => ({ ...p, [d.campo]: { ...p[d.campo], estado: e } }))
                  }
                />
              </div>
            ))}
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="comentarios" className={etiqueta}>Comentarios y recomendaciones</label>
              <textarea id="comentarios" name="comentarios" rows={3} className={campo} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <FotosVehiculo fotos={fotos} onChange={setFotos} />
            </div>
          </div>
        </Seccion>
      </div>

      <aside className="space-y-4 rounded-xl border border-borde bg-tarjeta p-5 xl:sticky xl:top-6">
        <h2 className="font-display text-2xl font-semibold">Detalle de la venta</h2>

        {sugeridos.length > 0 && (
          <div className="space-y-2 rounded-lg border border-acento/40 bg-fondo p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-suave">
              Compatibles con «{veh.trim()}»
            </p>
            <ul className="space-y-1.5">
              {sugeridos.slice(0, 8).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{s.etiqueta}</span>
                  <button
                    type="button"
                    onClick={() => agregarProducto(s.id)}
                    className="shrink-0 rounded-md bg-acento px-2 py-1 text-xs font-bold text-fondo"
                  >
                    + Agregar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-suave">
              Producto (nombre, EAN o código)
            </span>
            <BuscadorProducto
              opciones={opcionesProducto}
              valor=""
              onChange={agregarProducto}
              className={campo}
              placeholder="Buscar o escanear producto…"
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-suave">
              Servicio
            </span>
            <div className="flex gap-2">
              <select aria-label="Servicio" value={seleccion}
                onChange={(e) => setSeleccion(e.target.value)} className={campo}>
                <option value="">Elegir servicio</option>
                {servicios.map((s) => (
                  <option key={s.id} value={s.id}>{s.categoria ? `${s.categoria} · ` : ''}{s.nombre} · {soles(s.precio_base)}</option>
                ))}
              </select>
              <button type="button" onClick={agregarServicio} aria-label="Agregar servicio"
                className="grid size-11 shrink-0 place-items-center rounded-lg bg-acento text-fondo">
                <Plus size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {lineas.length === 0 ? (
          <p className="py-4 text-center text-sm text-suave">
            Aún no hay nada en la venta. Busca un producto o elige un servicio y toca el botón amarillo.
          </p>
        ) : (
          <ul className="divide-y divide-borde/60">
            {lineas.map((l) => (
              <li key={l.key} className="space-y-2 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-tight">{l.nombre}</p>
                  <button type="button" onClick={() => setLineas((p) => p.filter((x) => x.key !== l.key))}
                    aria-label={`Quitar ${l.nombre}`} className="text-suave hover:text-peligro">
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-suave">
                    Cant.
                    <input type="number" min={1} max={l.stockMax} value={l.cantidad}
                      onChange={(e) => {
                        const n = Math.max(1, Number(e.target.value) || 1)
                        cambiar(l.key, { cantidad: l.stockMax ? Math.min(n, l.stockMax) : n })
                      }}
                      className="w-16 rounded-lg border border-borde bg-fondo px-2 py-1.5 text-texto outline-none focus-visible:ring-2 focus-visible:ring-acento" />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-suave">
                    S/
                    <input type="number" min={0} step="0.01" value={l.precio} disabled={l.bonificacion}
                      onChange={(e) => cambiar(l.key, { precio: Number(e.target.value) || 0 })}
                      className="w-24 rounded-lg border border-borde bg-fondo px-2 py-1.5 text-texto outline-none focus-visible:ring-2 focus-visible:ring-acento disabled:opacity-50" />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={l.bonificacion}
                      onChange={(e) => cambiar(l.key, { bonificacion: e.target.checked })}
                      className="size-4 accent-acento" />
                    Bonificación
                  </label>
                </div>
                {l.stockMax !== undefined && (
                  <>
                    <p className="text-xs text-suave">Stock disponible: {l.stockMax}</p>
                    {(() => {
                      const m = margenLinea(l)
                      if (!m) return null
                      return (
                        <p className={`text-xs font-semibold ${m.total >= 0 ? 'text-ok' : 'text-peligro'}`}>
                          Costo {soles(l.costo as number)} · Margen {soles(m.total)}
                          {m.pct !== null ? ` (${m.pct.toFixed(0)}%)` : ' (bonificación)'}
                        </p>
                      )
                    })()}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-end justify-between border-t border-borde pt-4">
          <span className="text-suave">Total</span>
          <span className="font-display text-4xl font-bold tabular-nums">{soles(total)}</span>
        </div>
        {conCosto.length > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-fondo px-3 py-2 text-sm">
            <span className="text-suave">Margen de productos</span>
            <span className={`font-bold ${margenTotal >= 0 ? 'text-ok' : 'text-peligro'}`}>
              {soles(margenTotal)}
              {ventaConCosto > 0 ? ` (${((margenTotal / ventaConCosto) * 100).toFixed(0)}%)` : ''}
            </span>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="medio_pago" className={etiqueta}>Medio de pago</label>
          <select id="medio_pago" name="medio_pago" defaultValue="efectivo" className={campo}>
            <option value="efectivo">Efectivo</option>
            <option value="yape_plin">Yape / Plin</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta</option>
          </select>
        </div>

        {error && <p className="text-sm text-peligro">{error}</p>}

        <button disabled={guardando}
          className="w-full rounded-lg bg-acento py-3 text-base font-bold text-fondo disabled:opacity-60">
          {guardando ? 'Guardando...' : 'Registrar venta'}
        </button>

        {resultado && <PanelResultado r={resultado.resumen} orgId={orgId} />}
      </aside>
    </form>
  )
}