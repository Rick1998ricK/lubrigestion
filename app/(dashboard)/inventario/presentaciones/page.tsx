import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PresentacionesPanel from '@/components/inventario/PresentacionesPanel'

export default async function PresentacionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('usuarios').select('rol').eq('id', user!.id).single()
  if (perfil?.rol !== 'admin') redirect('/')

  const [pres, prod] = await Promise.all([
    supabase.from('presentaciones').select('id, nombre'),
    supabase.from('productos').select('presentacion'),
  ])

  const usos: Record<string, number> = {}
  for (const p of prod.data ?? []) {
    const k = String(p.presentacion ?? '').trim()
    if (k) usos[k] = (usos[k] ?? 0) + 1
  }
  const filas = (pres.data ?? []).map((p: any) => ({
    id: p.id as number,
    nombre: p.nombre as string,
    usos: usos[p.nombre] ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-5xl font-bold leading-none">Presentaciones</h1>
          <p className="mt-2 text-suave">
            Medidas que se ofrecen al registrar lubricantes, refrigerantes y aditivos.
          </p>
        </div>
        <Link href="/inventario" className="text-sm font-semibold text-acento hover:underline">
          ← Volver a inventario
        </Link>
      </div>
      <PresentacionesPanel filas={filas} />
    </div>
  )
}