import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import KardexPanel from '@/components/kardex/KardexPanel'

export default async function KardexPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('usuarios').select('rol').eq('id', user!.id).single()
  if (perfil?.rol !== 'admin') redirect('/')

  const { data } = await supabase
    .from('productos')
    .select('id, nombre, viscosidad_codigo, codigo, codigo_tienda, ean, presentacion, marcas(nombre)')
    .order('nombre')

  const productos = (data ?? []).map((p: any) => {
    const etiqueta = Array.from(
      new Set([p.codigo_tienda, p.marcas?.nombre, p.nombre, p.viscosidad_codigo, p.codigo, p.presentacion].filter(Boolean)),
    ).join(' · ')
    return {
      id: p.id as number,
      etiqueta,
      busqueda: [etiqueta, p.ean].filter(Boolean).join(' ').toLowerCase(),
      marca: (p.marcas?.nombre ?? '') as string,
    }
  })

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl uppercase tracking-wide text-[#F1F5F9] md:text-5xl">Kardex</h1>
      <KardexPanel productos={productos} />
    </div>
  )
}