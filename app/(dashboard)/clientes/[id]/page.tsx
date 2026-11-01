import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Gift, Lightbulb, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import PremioFidelidad from '@/components/clientes/PremioFidelidad'
import { COLOR_ESTADO, ETIQUETA_ESTADO, MEDICIONES } from '@/lib/mediciones'
import SeguimientoVehiculo from '@/components/clientes/SeguimientoVehiculo'

const card = 'rounded-2xl border border-[#17496B] bg-[#09243B] p-5'
const h2 = 'font-display text-2xl uppercase tracking-wide text-[#F1F5F9]'

const soles = (n: number) =>
  'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fechaLima = (ts: string) =>
  new Date(ts).toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'short', year: 'numeric' })

const diasDesde = (fecha: string) =>
  Math.floor((Date.now() - new Date(fecha + 'T00:00:00').getTime()) / 86400000)

const diasDesdeTs = (ts: string) => Math.floor((Date.now() - new Date(ts).getTime()) / 86400000)

const noCambio = (v: string | null) => !!v && v.toUpperCase().includes('NO REALIZ')

const COMPONENTES: [string, string][] = [
  ['estado_bateria', 'Batería'],
  ['estado_alternador', 'Alternador'],
  ['estado_frenos', 'Frenos'],
  ['estado_refrigerante', 'Refrigerante'],
]
const FILTROS: [string, string][] = [
  ['filtro_aceite', 'filtro de aceite'],
  ['filtro_aire', 'filtro de aire'],
  ['filtro_cabina', 'filtro de cabina'],
  ['filtro_combustible', 'filtro de combustible'],
]

function recomendaciones(veh: any, ultima: any | undefined): string[] {
  const r: string[] = []
  if (veh.kilometraje_actual != null && veh.proximo_cambio_km != null) {
    const falta = veh.proximo_cambio_km - veh.kilometraje_actual
    if (falta <= 0) r.push(`Cambio de aceite vencido por ${Math.abs(falta).toLocaleString('es-PE')} km.`)
    else if (falta <= 500) r.push(`Cambio de aceite próximo: faltan ${falta.toLocaleString('es-PE')} km.`)
  }
  if (!ultima) return r
  FILTROS.forEach(([campo, nombre]) => {
    if (noCambio(ultima[campo]))
      r.push(`Ofrecer ${nombre}: no se cambió en la visita del ${ultima.fecha_mantenimiento}.`)
  })
  COMPONENTES.forEach(([campo, nombre]) => {
    if (ultima[campo] === 'malo') r.push(`${nombre} en mal estado: recomendar revisión o cambio.`)
    else if (ultima[campo] === 'regular') r.push(`${nombre} en estado regular: vigilar en la próxima visita.`)
  })
  const d = diasDesde(ultima.fecha_mantenimiento)
  if (d > 180) r.push(`Hace ${Math.floor(d / 30)} meses de la última visita: invitarlo a un chequeo.`)
  return r
}

export default async function ClienteDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cliente } = await supabase
    .from('clientes')
    .select('id, nombres_apellidos, celular, correo, visitas_count, cliente_frecuente, vehiculos(*)')
    .eq('id', id)
    .maybeSingle()
  if (!cliente) notFound()

  const vehiculos = ((cliente as any).vehiculos ?? []) as any[]
  const vehIds = vehiculos.map((v) => v.id)

  const [mants, ventasRes, fidRes, premiosRes] = await Promise.all([
    vehIds.length
      ? supabase.from('mantenimientos').select('*').in('vehiculo_id', vehIds).order('fecha_mantenimiento', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    supabase
      .from('ventas')
      .select('id, fecha_venta, total, mantenimiento_id, detalle_venta(cantidad, precio_venta, es_bonificacion, tipo_item, productos(nombre, viscosidad_codigo, marcas(nombre)), servicios(nombre))')
      .eq('cliente_id', id)
      .eq('anulada', false)
      .order('fecha_venta', { ascending: false })
      .limit(200),
    supabase.from('clientes_fidelidad').select('*').eq('cliente_id', id).maybeSingle(),
    supabase
      .from('premios_cliente')
      .select('id, descripcion, entregado_en')
      .eq('cliente_id', id)
      .order('entregado_en', { ascending: false })
      .limit(10),
  ])
  const mantenimientos = (mants.data ?? []) as any[]
  const ventas = (ventasRes.data ?? []) as any[]
  const fid = fidRes.data as any | null
  const premios = (premiosRes.data ?? []) as any[]

  // Mediciones y fotos de cada servicio
  const ventaIds = ventas.map((v) => v.id)
  const [medsRes, fotosRes] = await Promise.all([
    ventaIds.length
      ? supabase.from('venta_mediciones').select('venta_id, componente, valor, estado').in('venta_id', ventaIds)
      : Promise.resolve({ data: [] as any[] }),
    ventaIds.length
      ? supabase.from('venta_fotos').select('venta_id, ruta, orden').in('venta_id', ventaIds).order('orden')
      : Promise.resolve({ data: [] as any[] }),
  ])
  const medsPorVenta = new Map<number, any[]>()
  ;((medsRes.data ?? []) as any[]).forEach((m) => {
    medsPorVenta.set(m.venta_id, [...(medsPorVenta.get(m.venta_id) ?? []), m])
  })
  const fotosFilas = (fotosRes.data ?? []) as any[]
  const urlPorRuta = new Map<string, string>()
  if (fotosFilas.length) {
    const { data: firmadas } = await supabase.storage
      .from('fotos-servicio')
      .createSignedUrls(fotosFilas.map((f) => f.ruta), 3600)
    ;(firmadas ?? []).forEach((f: any) => {
      if (f.signedUrl && f.path) urlPorRuta.set(f.path, f.signedUrl)
    })
  }
  const fotosPorVenta = new Map<number, string[]>()
  fotosFilas.forEach((f) => {
    const u = urlPorRuta.get(f.ruta)
    if (u) fotosPorVenta.set(f.venta_id, [...(fotosPorVenta.get(f.venta_id) ?? []), u])
  })

  const mantPorId = new Map<number, any>(mantenimientos.map((m) => [m.id, m]))
  const vehiculoDeVenta = (v: any) => {
    const m = v.mantenimiento_id ? mantPorId.get(v.mantenimiento_id) : null
    const veh = m ? vehiculos.find((x) => x.id === m.vehiculo_id) : null
    return veh ? [veh.placa, veh.vehiculo_modelo].filter(Boolean).join(' · ') : ''
  }

  const nombreItem = (d: any) =>
    d.tipo_item === 'servicio'
      ? d.servicios?.nombre ?? 'Servicio'
      : [d.productos?.marcas?.nombre, d.productos?.nombre, d.productos?.viscosidad_codigo].filter(Boolean).join(' · ')

  // Lo que más compra
  const conteo: Record<string, number> = {}
  ventas.forEach((v) =>
    (v.detalle_venta ?? []).forEach((d: any) => {
      if (d.es_bonificacion) return
      const n = nombreItem(d)
      conteo[n] = (conteo[n] ?? 0) + Number(d.cantidad)
    }),
  )
  const frecuentes = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 6)

  // Resumen de visitas
  const totalGastado = ventas.reduce((s, v) => s + Number(v.total), 0)
  const nVisitas = ventas.length
  const ticket = nVisitas ? totalGastado / nVisitas : 0
  const ultimaVisita = ventas[0]?.fecha_venta as string | undefined
  const primeraVisita = ventas[nVisitas - 1]?.fecha_venta as string | undefined
  const cadaDias =
    nVisitas > 1 && ultimaVisita && primeraVisita
      ? Math.round(
          (new Date(ultimaVisita).getTime() - new Date(primeraVisita).getTime()) / 86400000 / (nVisitas - 1),
        )
      : null
  const visitasPorVehiculo = vehiculos.map((veh) => ({
    veh,
    n: mantenimientos.filter((m) => m.vehiculo_id === veh.id).length,
  }))

  const recs = vehiculos.map((veh) => {
    const ultima = mantenimientos.find((m) => m.vehiculo_id === veh.id)
    return { veh, ultima, lista: recomendaciones(veh, ultima) }
  })

  // Mensaje de WhatsApp con las recomendaciones
  const conRec = recs.filter((r) => r.lista.length)
  const celular = ((cliente as any).celular ?? '').replace(/\D/g, '')
  const numero = celular.length === 9 ? '51' + celular : celular
  const msg = conRec.length
    ? `Hola ${(cliente as any).nombres_apellidos}, te escribimos del lubricentro. Sobre tu ${conRec[0].veh.vehiculo_modelo ?? 'vehículo'} (${conRec[0].veh.placa ?? ''}): ${conRec[0].lista.slice(0, 3).join(' ')} ¿Te agendamos una cita?`
    : `Hola ${(cliente as any).nombres_apellidos}, gracias por tu preferencia. Cuando necesites tu próximo servicio, aquí estamos.`
  const waHref = numero ? `https://wa.me/${numero}?text=${encodeURIComponent(msg)}` : null

  return (
    <div className="space-y-6">
      <Link href="/clientes" className="inline-flex items-center gap-1 text-sm text-[#9FB3C8] hover:text-[#FFC107]">
        <ArrowLeft size={16} /> Clientes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl uppercase tracking-wide text-[#F1F5F9] md:text-5xl">
            {(cliente as any).nombres_apellidos}
          </h1>
          <p className="text-sm text-[#9FB3C8]">
            {(cliente as any).celular || 'Sin celular'}
            {(cliente as any).correo ? ` · ${(cliente as any).correo}` : ''}
          </p>
        </div>
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[#3DDC97] px-4 py-2 text-sm font-semibold text-[#3DDC97] hover:bg-[#3DDC97] hover:text-[#061626]"
          >
            <MessageCircle size={18} /> Escribir por WhatsApp
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className={card}>
          <p className="text-xs uppercase tracking-wider text-[#9FB3C8]">Visitas</p>
          <p className="font-display text-3xl text-[#FFC107]">{nVisitas}</p>
        </div>
        <div className={card}>
          <p className="text-xs uppercase tracking-wider text-[#9FB3C8]">Total comprado</p>
          <p className="font-display text-2xl text-[#FFC107] md:text-3xl">{soles(totalGastado)}</p>
        </div>
        <div className={card}>
          <p className="text-xs uppercase tracking-wider text-[#9FB3C8]">Ticket promedio</p>
          <p className="font-display text-2xl text-[#FFC107] md:text-3xl">{soles(ticket)}</p>
        </div>
        <div className={card}>
          <p className="text-xs uppercase tracking-wider text-[#9FB3C8]">Última visita</p>
          <p className="font-display text-2xl text-[#FFC107] md:text-3xl">
            {ultimaVisita ? `hace ${diasDesdeTs(ultimaVisita)} d` : '—'}
          </p>
        </div>
      </div>

      {/* Reporte de visitas */}
      <section className={card}>
        <h2 className={`${h2} mb-3`}>Reporte de visitas</h2>
        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#9FB3C8]">Primera visita</p>
            <p className="text-[#F1F5F9]">{primeraVisita ? fechaLima(primeraVisita) : '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[#9FB3C8]">Frecuencia</p>
            <p className="text-[#F1F5F9]">{cadaDias != null ? `Viene cada ${cadaDias} días en promedio` : 'Aún sin datos'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[#9FB3C8]">Visitas por vehículo</p>
            {visitasPorVehiculo.length === 0 ? (
              <p className="text-[#F1F5F9]">—</p>
            ) : (
              <ul className="text-[#F1F5F9]">
                {visitasPorVehiculo.map(({ veh, n }) => (
                  <li key={veh.id}>
                    {[veh.placa, veh.vehiculo_modelo].filter(Boolean).join(' · ')}: <b className="text-[#FFC107]">{n}</b>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Fidelidad */}
      {fid && (
        <section className={card}>
          <h2 className={`${h2} mb-3 flex items-center gap-2`}>
            <Gift size={22} className="text-[#FFC107]" /> Programa de fidelidad
          </h2>
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-[#9FB3C8]">Avance al próximo premio</span>
              <span className="font-semibold text-[#F1F5F9]">{fid.avance} / {fid.fidelidad_cada} visitas</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#061626]">
              <div
                className="h-full rounded-full bg-[#FFC107]"
                style={{ width: `${Math.min(100, (fid.avance / fid.fidelidad_cada) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-[#9FB3C8]">
              Premios ganados: {fid.premios_ganados} · entregados: {fid.premios_entregados}
            </p>
          </div>

          {fid.premios_pendientes > 0 && (
            <PremioFidelidad clienteId={Number(id)} pendientes={fid.premios_pendientes} />
          )}

          {premios.length > 0 && (
            <ul className="mt-3 divide-y divide-[#17496B] text-sm">
              {premios.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 py-1.5">
                  <span className="text-[#F1F5F9]">{p.descripcion || 'Premio entregado'}</span>
                  <span className="shrink-0 text-[#9FB3C8]">{fechaLima(p.entregado_en)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Recomendaciones */}
      <section className={card}>
        <h2 className={`${h2} mb-3 flex items-center gap-2`}>
          <Lightbulb size={22} className="text-[#FFC107]" /> Qué recomendarle
        </h2>
        {recs.length === 0 && <p className="text-sm text-[#9FB3C8]">Aún no tiene vehículos registrados.</p>}
        <div className="space-y-4">
          {recs.map(({ veh, ultima, lista }) => (
            <div key={veh.id}>
              <p className="text-sm font-semibold text-[#F1F5F9]">
                {[veh.placa, veh.vehiculo_modelo].filter(Boolean).join(' · ')}
                <span className="font-normal text-[#9FB3C8]">
                  {veh.kilometraje_actual != null && ` — ${veh.kilometraje_actual.toLocaleString('es-PE')} km`}
                  {veh.proximo_cambio_km != null && ` (próximo cambio: ${veh.proximo_cambio_km.toLocaleString('es-PE')} km)`}
                </span>
              </p>
              <SeguimientoVehiculo veh={veh} />
              {lista.length === 0 ? (
                <p className="text-sm text-[#3DDC97]">{ultima ? 'Todo en orden por ahora.' : 'Sin fichas de mantenimiento todavía.'}</p>
              ) : (
                <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-[#FFC107]">
                  {lista.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Qué compra */}
        <section className={card}>
          <h2 className={`${h2} mb-3`}>Lo que más compra</h2>
          {frecuentes.length === 0 ? (
            <p className="text-sm text-[#9FB3C8]">Sin compras todavía.</p>
          ) : (
            <ul className="divide-y divide-[#17496B]">
              {frecuentes.map(([n, c]) => (
                <li key={n} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-[#F1F5F9]">{n}</span>
                  <span className="shrink-0 font-semibold text-[#FFC107]">× {c}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Última ficha */}
        <section className={card}>
          <h2 className={`${h2} mb-3`}>Última ficha de revisión</h2>
          {mantenimientos.length === 0 ? (
            <p className="text-sm text-[#9FB3C8]">Sin fichas todavía.</p>
          ) : (
            (() => {
              const m = mantenimientos[0]
              const fila = (k: string, v: any) => (
                <div className="flex justify-between gap-3 py-1.5 text-sm">
                  <span className="text-[#9FB3C8]">{k}</span>
                  <span className="text-right text-[#F1F5F9]">{v || '—'}</span>
                </div>
              )
              return (
                <div className="divide-y divide-[#17496B]">
                  {fila('Fecha', m.fecha_mantenimiento)}
                  {fila('Aceite', [m.marca_aceite, m.viscosidad].filter(Boolean).join(' '))}
                  {fila('Filtro de aceite', m.filtro_aceite)}
                  {fila('Filtro de aire', m.filtro_aire)}
                  {fila('Filtro de cabina', m.filtro_cabina)}
                  {fila('Filtro de combustible', m.filtro_combustible)}
                  {COMPONENTES.map(([c, n]) => (
                    <div key={c} className="flex justify-between gap-3 py-1.5 text-sm">
                      <span className="text-[#9FB3C8]">{n}</span>
                      <span className="text-right text-[#F1F5F9]">
                        {m[c] === 'no_revisado' ? '—' : m[c] || '—'}
                      </span>
                    </div>
                  ))}
                  {m.comentarios && fila('Comentarios', m.comentarios)}
                </div>
              )
            })()
          )}
        </section>
      </div>

      {/* Historial */}
      <section className={card}>
        <h2 className={`${h2} mb-3`}>Historial de compras</h2>
        {ventas.length === 0 ? (
          <p className="text-sm text-[#9FB3C8]">Sin ventas registradas.</p>
        ) : (
          <div className="space-y-4">
            {ventas.map((v) => {
              const meds = medsPorVenta.get(v.id) ?? []
              const fotos = fotosPorVenta.get(v.id) ?? []
              const veh = vehiculoDeVenta(v)
              return (
                <div key={v.id} className="rounded-xl border border-[#17496B] bg-[#061626] p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm text-[#9FB3C8]">
                      {fechaLima(v.fecha_venta)}
                      {veh && <span className="ml-2 text-[#F1F5F9]">{veh}</span>}
                    </span>
                    <span className="font-display text-xl text-[#FFC107]">{soles(Number(v.total))}</span>
                  </div>
                  <ul className="space-y-1 text-sm text-[#F1F5F9]">
                    {(v.detalle_venta ?? []).map((d: any, i: number) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate">
                          {d.cantidad} × {nombreItem(d)}
                          {d.es_bonificacion && <span className="ml-2 text-xs text-[#3DDC97]">bonificación</span>}
                        </span>
                        <span className="shrink-0 text-[#9FB3C8]">
                          {d.es_bonificacion ? 'S/ 0.00' : soles(Number(d.precio_venta) * Number(d.cantidad))}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {meds.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {meds.map((m) => {
                        const def = MEDICIONES.find((d) => d.campo === m.componente)
                        return (
                          <span
                            key={m.componente}
                            className="rounded-full bg-[#09243B] px-2.5 py-1 text-xs font-semibold"
                            style={{ color: COLOR_ESTADO[m.estado] ?? '#9FB3C8' }}
                          >
                            {def?.label ?? m.componente}
                            {m.valor != null ? ` ${Number(m.valor)} ${def?.unidad ?? ''}` : ''} · {ETIQUETA_ESTADO[m.estado]}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {fotos.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {fotos.map((u, i) => (
                        <a key={i} href={u} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={u} alt="Foto del servicio" className="size-16 rounded-lg object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}