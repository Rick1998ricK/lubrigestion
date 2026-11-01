import { createClient } from '@/lib/supabase/server'
import CajaPanel from '@/components/caja/CajaPanel'

export default async function CajaPage() {
  const supabase = await createClient()
  const [res, hist] = await Promise.all([
    supabase.rpc('resumen_caja'),
    supabase
      .from('caja_diaria')
      .select('id, fecha, efectivo_inicial, efectivo_final, efectivo_esperado, observaciones')
      .order('fecha', { ascending: false })
      .limit(15),
  ])

  const historial = (hist.data ?? []).map((c: any) => ({
    id: c.id as number,
    fecha: c.fecha as string,
    inicial: Number(c.efectivo_inicial),
    final: c.efectivo_final == null ? null : Number(c.efectivo_final),
    esperado: c.efectivo_esperado == null ? null : Number(c.efectivo_esperado),
    obs: (c.observaciones ?? null) as string | null,
  }))

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl uppercase tracking-wide text-[#F1F5F9] md:text-5xl">
        Caja diaria
      </h1>
      {res.error ? (
        <p className="text-sm text-[#FF6B5E]">{res.error.message}</p>
      ) : (
        <CajaPanel resumen={res.data as any} historial={historial} />
      )}
    </div>
  )
}