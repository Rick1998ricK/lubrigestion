import Link from 'next/link'
import { Gift, Search, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; premio?: string }>
}) {
  const { q = '', premio = '' } = await searchParams
  const t = q.replace(/[,()%]/g, '').trim()
  const soloPremio = premio === '1'
  const supabase = await createClient()

  let idsPorPlaca: number[] = []
  if (t) {
    const { data } = await supabase.from('vehiculos').select('cliente_id').ilike('placa', `%${t}%`).limit(50)
    idsPorPlaca = (data ?? []).map((v: any) => v.cliente_id)
  }

  let idsPremio: number[] | null = null
  if (soloPremio) {
    const { data } = await supabase
      .from('clientes_fidelidad').select('cliente_id').gt('premios_pendientes', 0)
    idsPremio = (data ?? []).map((r: any) => r.cliente_id)
  }

  let query = supabase
    .from('clientes')
    .select('id, nombres_apellidos, celular, visitas_count, cliente_frecuente, vehiculos(placa, vehiculo_modelo)')
    .order('creado_en', { ascending: false })
    .limit(60)
  if (t) {
    const partes = [`nombres_apellidos.ilike.%${t}%`, `celular.ilike.%${t}%`]
    if (idsPorPlaca.length) partes.push(`id.in.(${idsPorPlaca.join(',')})`)
    query = query.or(partes.join(','))
  }
  if (idsPremio) query = query.in('id', idsPremio.length ? idsPremio : [-1])

  const { data } = await query
  const clientes = (data ?? []) as any[]

  const { data: fid } = clientes.length
    ? await supabase
        .from('clientes_fidelidad')
        .select('cliente_id, premios_pendientes, avance, fidelidad_cada')
        .in('cliente_id', clientes.map((c) => c.id))
    : { data: [] as any[] }
  const fidelidad = new Map<number, any>((fid ?? []).map((f: any) => [f.cliente_id, f]))

  const hrefFiltro = (activar: boolean) => {
    const p = new URLSearchParams()
    if (t) p.set('q', t)
    if (activar) p.set('premio', '1')
    const s = p.toString()
    return s ? `/clientes?${s}` : '/clientes'
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl uppercase tracking-wide text-[#F1F5F9] md:text-5xl">
        Clientes
      </h1>

      <div className="flex flex-wrap items-center gap-3">
        <form className="relative min-w-0 max-w-xl flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9FB3C8]" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre, celular o placa"
            className="w-full rounded-lg border border-[#17496B] bg-[#09243B] py-2.5 pl-9 pr-3 text-base text-[#F1F5F9] outline-none focus:border-[#FFC107] md:text-sm"
          />
          {soloPremio && <input type="hidden" name="premio" value="1" />}
        </form>
        <Link
          href={hrefFiltro(!soloPremio)}
          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold ${
            soloPremio
              ? 'border-[#FFC107] bg-[#FFC107] text-[#061626]'
              : 'border-[#17496B] text-[#9FB3C8] hover:border-[#FFC107] hover:text-[#FFC107]'
          }`}
        >
          <Gift size={16} /> Por premiar
        </Link>
      </div>

      {clientes.length === 0 ? (
        <p className="text-sm text-[#9FB3C8]">
          {soloPremio
            ? 'Ningún cliente tiene premios pendientes.'
            : t
              ? 'No se encontró ningún cliente.'
              : 'Aún no hay clientes. Se crean solos al registrar una venta.'}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {clientes.map((c) => {
            const f = fidelidad.get(c.id)
            return (
              <Link
                key={c.id}
                href={`/clientes/${c.id}`}
                className="rounded-xl border border-[#17496B] bg-[#09243B] p-4 transition hover:border-[#FFC107]"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate font-semibold text-[#F1F5F9]">{c.nombres_apellidos}</p>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {f && f.premios_pendientes > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-[#3DDC97]/15 px-2 py-0.5 text-xs font-semibold text-[#3DDC97]">
                        <Gift size={12} /> Premio
                      </span>
                    )}
                    {c.cliente_frecuente && (
                      <span className="flex items-center gap-1 rounded-full bg-[#FFC107]/15 px-2 py-0.5 text-xs font-semibold text-[#FFC107]">
                        <Star size={12} /> Frecuente
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-sm text-[#9FB3C8]">
                  {c.celular || 'Sin celular'} · {c.visitas_count} visita(s)
                  {f && f.premios_pendientes === 0 && ` · ${f.avance}/${f.fidelidad_cada} al próximo premio`}
                </p>
                <p className="mt-1 truncate text-xs text-[#9FB3C8]">
                  {(c.vehiculos ?? []).map((v: any) => [v.placa, v.vehiculo_modelo].filter(Boolean).join(' ')).join('  |  ') ||
                    'Sin vehículos'}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}