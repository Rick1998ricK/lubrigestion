import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { cargarTipos } from '@/lib/tipos'
import TiposPanel from '@/components/inventario/TiposPanel'

export default async function TiposPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('usuarios').select('rol').eq('id', user!.id).single()
  if (perfil?.rol !== 'admin') redirect('/')

  const tipos = await cargarTipos(supabase)
  const conteos = await Promise.all(
    tipos.map((t) =>
      supabase.from('productos').select('id', { count: 'exact', head: true }).eq('tipo', t.clave),
    ),
  )
  const filas = tipos.map((t, i) => ({ ...t, productos: conteos[i].count ?? 0 }))

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/inventario"
          className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-[#FFC107] hover:underline"
        >
          <ArrowLeft size={16} /> Volver a Inventario
        </Link>
        <h1 className="font-display text-4xl uppercase tracking-wide text-[#F1F5F9] md:text-5xl">
          Tipos de producto
        </h1>
        <p className="mt-2 text-sm text-[#9FB3C8]">
          Las categorías de tu mercadería. Lo que crees aquí aparece en Inventario, Catálogo y Compras.
        </p>
      </div>
      <TiposPanel tipos={filas} />
    </div>
  )
}