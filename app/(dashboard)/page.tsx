import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { STOCK_BAJO } from '@/lib/constants'
import { minimoDe } from '@/lib/campos-producto'
import { AlertTriangle, Gift, MessageCircle, PackageX, Wallet } from 'lucide-react'

const card = 'rounded-2xl border border-[#17496B] bg-[#09243B] p-5'
const h2 = 'font-display text-2xl uppercase tracking-wide text-[#F1F5F9]'

function soles(n: number) {
  return 'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function waLink(celular: string | null, texto: string) {
  const d = (celular ?? '').replace(/\D/g, '')
  if (!d) return null
  const num = d.length === 9 ? '51' + d : d
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`
}

export default async function InicioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('usuarios').select('nombre, rol').eq('id', user!.id).single()
  const esAdmin = perfil?.rol === 'admin'

  // Fechas en hora de Perú (UTC-5)
  const lima = new Date(Date.now() - 5 * 3600e3)
  const hoy = lima.toISOString().slice(0, 10)
  const inicioHoy = `${hoy}T00:00:00-05:00`
  const inicioMes = `${hoy.slice(0, 8)}01T00:00:00-05:00`
  const limiteCredito = new Date(lima.getTime() + 3 * 86400e3).toISOString().slice(0, 10)

  const [vMes, stock, creditos, vehiculos, recientes] = await Promise.all([
    supabase.from('ventas').select('total, fecha_venta').eq('anulada', false).gte('fecha_venta', inicioMes),
    supabase
      .from('productos_publico')
      .select('id, nombre, marca, viscosidad_codigo, presentacion, stock, stock_minimo')
      .or(`stock.lt.${STOCK_BAJO},stock_minimo.not.is.null`)
      .order('stock')
      .limit(500),
    esAdmin
      ? supabase
          .from('compras')
          .select('id, total, fecha_limite_pago, proveedores(razon_social)')
          .eq('condicion', 'credito')
          .eq('pagado', false)
          .lte('fecha_limite_pago', limiteCredito)
          .order('fecha_limite_pago')
      : Promise.resolve({ data: [] as any[] }),
    supabase
      .from('vehiculos_seguimiento')
      .select('vehiculo_id, placa, vehiculo_modelo, nombres_apellidos, celular, dias_restantes, motivo, km_dia')
      .lte('dias_restantes', 15)
      .order('dias_restantes')
      .limit(8),
    supabase
      .from('ventas')
      .select('id, fecha_venta, total, clientes(nombres_apellidos)')
      .eq('anulada', false)
      .order('fecha_venta', { ascending: false })
      .limit(5),
  ])

  const ventasMes = vMes.data ?? []
  const totalMes = ventasMes.reduce((s, v: any) => s + Number(v.total), 0)
  const ventasHoy = ventasMes.filter((v: any) => v.fecha_venta >= inicioHoy)
  const totalHoy = ventasHoy.reduce((s, v: any) => s + Number(v.total), 0)

  const bajos = ((stock.data ?? []) as any[]).filter((p) => p.stock < minimoDe(p.stock_minimo))
  const agotados = bajos.filter((p: any) => p.stock === 0).length
  const lista = (creditos.data ?? []) as any[]


  // Clientes con premio de fidelidad pendiente
  const { data: pend } = await supabase
    .from('clientes_fidelidad')
    .select('cliente_id, premios_pendientes')
    .gt('premios_pendientes', 0)
    .limit(20)
  const idsPremio = (pend ?? []).map((p: any) => p.cliente_id)
  const { data: cliPremio } = idsPremio.length
    ? await supabase.from('clientes').select('id, nombres_apellidos, celular').in('id', idsPremio)
    : { data: [] as any[] }
  const porPremiar = (cliPremio ?? []) as any[]
  const pendPorId = new Map<number, number>(
    (pend ?? []).map((p: any) => [p.cliente_id, p.premios_pendientes]),
  )

  const porContactar = (vehiculos.data ?? []) as any[]

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-[#9FB3C8]">Hola, {perfil?.nombre}</p>
        <h1 className="font-display text-4xl uppercase tracking-wide text-[#F1F5F9] md:text-5xl">
          Panel principal
        </h1>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className={card}>
          <p className="text-xs uppercase tracking-wider text-[#9FB3C8]">Ventas de hoy</p>
          <p className="mt-1 font-display text-3xl text-[#FFC107]">{soles(totalHoy)}</p>
          <p className="text-xs text-[#9FB3C8]">{ventasHoy.length} servicio(s)</p>
        </div>
        <div className={card}>
          <p className="text-xs uppercase tracking-wider text-[#9FB3C8]">Ventas del mes</p>
          <p className="mt-1 font-display text-3xl text-[#FFC107]">{soles(totalMes)}</p>
          <p className="text-xs text-[#9FB3C8]">{ventasMes.length} servicio(s)</p>
        </div>
        <Link href="/inventario" className={card}>
          <p className="text-xs uppercase tracking-wider text-[#9FB3C8]">Stock bajo</p>
          <p className={`mt-1 font-display text-3xl ${bajos.length ? 'text-[#FF6B5E]' : 'text-[#3DDC97]'}`}>
            {bajos.length}
          </p>
          <p className="text-xs text-[#9FB3C8]">{agotados} agotado(s)</p>
        </Link>
        {esAdmin && (
          <Link href="/compras" className={card}>
            <p className="text-xs uppercase tracking-wider text-[#9FB3C8]">Créditos por pagar</p>
            <p className={`mt-1 font-display text-3xl ${lista.length ? 'text-[#FFC107]' : 'text-[#3DDC97]'}`}>
              {lista.length}
            </p>
            <p className="text-xs text-[#9FB3C8]">vencidos o en 3 días</p>
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stock bajo */}
        <section className={card}>
          <h2 className={`${h2} mb-3 flex items-center gap-2`}>
            <PackageX size={22} className="text-[#FF6B5E]" /> Reponer pronto
          </h2>
          {bajos.length === 0 ? (
            <p className="text-sm text-[#3DDC97]">Todo el stock está en orden.</p>
          ) : (
            <ul className="divide-y divide-[#17496B]">
              {bajos.slice(0, 8).map((p: any) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-[#F1F5F9]">
                    {[p.marca, p.nombre, p.viscosidad_codigo, p.presentacion].filter(Boolean).join(' · ')}
                  </span>
                  <span className={`shrink-0 font-semibold ${p.stock === 0 ? 'text-[#FF6B5E]' : 'text-[#FFC107]'}`}>
                    {p.stock === 0 ? 'Agotado' : `${p.stock} und`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Créditos (solo admin) */}
        {esAdmin && (
          <section className={card}>
            <h2 className={`${h2} mb-3 flex items-center gap-2`}>
              <Wallet size={22} className="text-[#FFC107]" /> Pagos a proveedores
            </h2>
            {lista.length === 0 ? (
              <p className="text-sm text-[#3DDC97]">No hay créditos por vencer.</p>
            ) : (
              <ul className="divide-y divide-[#17496B]">
                {lista.map((c) => {
                  const vencido = c.fecha_limite_pago < hoy
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate text-[#F1F5F9]">
                          {c.proveedores?.razon_social ?? 'Sin proveedor'}
                        </span>
                        <span className={vencido ? 'text-[#FF6B5E]' : 'text-[#FFC107]'}>
                          {vencido ? 'Vencido' : 'Vence'} {c.fecha_limite_pago}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold text-[#F1F5F9]">{soles(Number(c.total))}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}

        {/* Clientes a contactar */}
        <section className={card}>
          <h2 className={`${h2} mb-3 flex items-center gap-2`}>
            <AlertTriangle size={22} className="text-[#FFC107]" /> Clientes a contactar
          </h2>
          {porContactar.length === 0 ? (
            <p className="text-sm text-[#9FB3C8]">Nadie está cerca de su próximo cambio.</p>
          ) : (
            <ul className="divide-y divide-[#17496B]">
              {porContactar.map((v) => {
                const d = Number(v.dias_restantes)
                const cuando = d < 0 ? `vencido hace ${-d} d` : d === 0 ? 'hoy' : `en ${d} d`
                const msg = `Hola ${v.nombres_apellidos ?? ''}, tu ${v.vehiculo_modelo ?? 'vehículo'} (${v.placa ?? ''}) ya está cerca de su próximo cambio de aceite. ¿Te agendamos una cita?`
                const href = waLink(v.celular ?? null, msg)
                return (
                  <li key={v.vehiculo_id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate text-[#F1F5F9]">{v.nombres_apellidos}</span>
                      <span className={d < 0 ? 'text-[#FF6B5E]' : 'text-[#9FB3C8]'}>
                        {v.placa} · {cuando} · por {v.motivo === 'km' ? `km (~${v.km_dia} km/día)` : 'tiempo'}
                      </span>
                    </span>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#3DDC97] px-3 py-1.5 font-semibold text-[#3DDC97] hover:bg-[#3DDC97] hover:text-[#061626]"
                      >
                        <MessageCircle size={16} /> WhatsApp
                      </a>
                    ) : (
                      <span className="text-xs text-[#9FB3C8]">Sin celular</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Clientes por premiar */}
        <section className={card}>
          <h2 className={`${h2} mb-3 flex items-center gap-2`}>
            <Gift size={22} className="text-[#FFC107]" /> Clientes por premiar
          </h2>
          {porPremiar.length === 0 ? (
            <p className="text-sm text-[#9FB3C8]">Nadie tiene premios pendientes.</p>
          ) : (
            <ul className="divide-y divide-[#17496B]">
              {porPremiar.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate text-[#F1F5F9]">{c.nombres_apellidos}</span>
                    <span className="text-[#9FB3C8]">
                      {pendPorId.get(c.id)} premio(s) por entregar
                    </span>
                  </span>
                  <Link
                    href={`/clientes/${c.id}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#FFC107] px-3 py-1.5 font-semibold text-[#FFC107] hover:bg-[#FFC107] hover:text-[#061626]"
                  >
                    <Gift size={16} /> Entregar
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Ventas recientes */}
        <section className={card}>
          <h2 className={`${h2} mb-3`}>Últimas ventas</h2>
          {(recientes.data ?? []).length === 0 ? (
            <p className="text-sm text-[#9FB3C8]">Aún no hay ventas.</p>
          ) : (
            <ul className="divide-y divide-[#17496B]">
              {(recientes.data as any[]).map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate text-[#F1F5F9]">
                      {v.clientes?.nombres_apellidos ?? 'Cliente'}
                    </span>
                    <span className="text-[#9FB3C8]">
                      {new Date(v.fecha_venta).toLocaleString('es-PE', {
                        timeZone: 'America/Lima',
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold text-[#FFC107]">{soles(Number(v.total))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}