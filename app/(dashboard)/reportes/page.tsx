import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReportesCharts from '@/components/reportes/ReportesCharts'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// timestamptz -> 'YYYY-MM' en hora de Perú
const mesLima = (ts: string) => new Date(new Date(ts).getTime() - 5 * 3600e3).toISOString().slice(0, 7)

const soles = (n: number) =>
  'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default async function ReportesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('usuarios').select('rol').eq('id', user!.id).single()
  if (perfil?.rol !== 'admin') redirect('/')

  const lima = new Date(Date.now() - 5 * 3600e3)
  const y = lima.getUTCFullYear()
  const m = lima.getUTCMonth()
  const keys = Array.from({ length: 6 }, (_, i) =>
    new Date(Date.UTC(y, m - 5 + i, 1)).toISOString().slice(0, 7),
  )
  const desde = `${keys[0]}-01`
  const desdeTs = `${desde}T00:00:00-05:00`
  const inicioMes = `${keys[5]}-01T00:00:00-05:00`
  const desde90 = new Date(lima.getTime() - 90 * 86400e3).toISOString().slice(0, 10) + 'T00:00:00-05:00'

  const [ventas, compras, gastos, detalle, costoMes, agotados] = await Promise.all([
    supabase.from('ventas').select('total, fecha_venta').eq('anulada', false).gte('fecha_venta', desdeTs),
    supabase.from('compras').select('total, fecha_pedido').gte('fecha_pedido', desde),
    supabase.from('gastos').select('monto, fecha').eq('anulado', false).gte('fecha', desde),
    supabase
      .from('detalle_venta')
      .select('cantidad, es_bonificacion, productos(nombre, viscosidad_codigo, marcas(nombre)), ventas!inner(fecha_venta)')
      .eq('tipo_item', 'producto')
      .eq('ventas.anulada', false)
      .gte('ventas.fecha_venta', desde90)
      .limit(5000),
    supabase
      .from('detalle_venta')
      .select('cantidad, costo_unitario, ventas!inner(fecha_venta)')
      .eq('tipo_item', 'producto')
      .eq('ventas.anulada', false)
      .gte('ventas.fecha_venta', inicioMes)
      .limit(5000),
    supabase.from('productos_publico').select('id', { count: 'exact', head: true }).eq('stock', 0),
  ])

  const base = Object.fromEntries(keys.map((k) => [k, { ventas: 0, compras: 0, gastos: 0 }]))
  ;(ventas.data ?? []).forEach((v: any) => {
    const k = mesLima(v.fecha_venta); if (base[k]) base[k].ventas += Number(v.total)
  })
  ;(compras.data ?? []).forEach((c: any) => {
    const k = String(c.fecha_pedido).slice(0, 7); if (base[k]) base[k].compras += Number(c.total)
  })
  ;(gastos.data ?? []).forEach((g: any) => {
    const k = String(g.fecha).slice(0, 7); if (base[k]) base[k].gastos += Number(g.monto)
  })

  const meses = keys.map((k) => ({
    mes: `${MESES[Number(k.slice(5)) - 1]} ${k.slice(2, 4)}`,
    ventas: Math.round(base[k].ventas * 100) / 100,
    compras: Math.round(base[k].compras * 100) / 100,
    gastos: Math.round(base[k].gastos * 100) / 100,
  }))

  const conteo: Record<string, number> = {}
  ;(detalle.data ?? []).forEach((d: any) => {
    if (d.es_bonificacion || !d.productos) return
    const p = d.productos
    const nombre = [p.marcas?.nombre, p.nombre, p.viscosidad_codigo].filter(Boolean).join(' · ')
    conteo[nombre] = (conteo[nombre] ?? 0) + Number(d.cantidad)
  })
  const top = Object.entries(conteo)
    .map(([nombre, unidades]) => ({ nombre, unidades }))
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 8)

  // Mes actual
  const actual = meses[meses.length - 1]
  const costoVendido = (costoMes.data ?? []).reduce(
    (s: number, d: any) => s + Number(d.cantidad) * Number(d.costo_unitario ?? 0),
    0,
  )
  const gananciaBruta = actual.ventas - costoVendido
  const gananciaNeta = gananciaBruta - actual.gastos
  const margen = actual.ventas > 0 ? (gananciaNeta / actual.ventas) * 100 : 0
  const flujo = actual.ventas - actual.compras - actual.gastos

  const tarjetas: [string, number, string, string?][] = [
    ['Ventas del mes', actual.ventas, 'text-[#FFC107]'],
    ['Costo de lo vendido', costoVendido, 'text-[#F1F5F9]'],
    ['Gastos del mes', actual.gastos, 'text-[#F1F5F9]'],
    [
      'Ganancia neta',
      gananciaNeta,
      gananciaNeta >= 0 ? 'text-[#3DDC97]' : 'text-[#FF6B5E]',
      `Margen ${margen.toFixed(1)}%`,
    ],
  ]

  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl uppercase tracking-wide text-[#F1F5F9] md:text-5xl">
        Reportes
      </h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tarjetas.map(([t, v, cls, sub]) => (
          <div key={t} className="rounded-2xl border border-[#17496B] bg-[#09243B] p-5">
            <p className="text-xs uppercase tracking-wider text-[#9FB3C8]">{t}</p>
            <p className={`mt-1 font-display text-3xl ${cls}`}>{soles(v)}</p>
            {sub && <p className="text-xs text-[#9FB3C8]">{sub}</p>}
          </div>
        ))}
      </div>
      <p className="-mt-4 text-xs leading-relaxed text-[#9FB3C8]">
        <b className="text-[#F1F5F9]">Ganancia neta</b> = ventas − costo de los productos vendidos − gastos del mes
        (ganancia bruta del mes: {soles(gananciaBruta)}). Aparte, el{' '}
        <b className="text-[#F1F5F9]">flujo de caja</b> (ventas − compras − gastos) es {soles(flujo)}: baja cuando
        repones mercadería, aunque esa mercadería siga siendo tuya. Productos agotados ahora:{' '}
        <b className="text-[#F1F5F9]">{agotados.count ?? 0}</b>.
      </p>

      <ReportesCharts meses={meses} top={top} />
    </div>
  )
}