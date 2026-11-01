import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AjusteStock from '@/components/inventario/AjusteStock'

export default async function AjustesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('usuarios').select('rol').eq('id', user!.id).single()
  if (perfil?.rol !== 'admin') redirect('/')

  const [prod, aj] = await Promise.all([
    supabase
      .from('productos')
      .select('id, nombre, viscosidad_codigo, stock, precio_compra, marcas(nombre)')
      .order('nombre'),
    supabase
      .from('ajustes_stock')
      .select('id, stock_anterior, stock_nuevo, diferencia, costo_unitario, motivo, creado_en, productos(nombre, viscosidad_codigo, marcas(nombre))')
      .order('creado_en', { ascending: false })
      .limit(60),
  ])

  const productos = (prod.data ?? []).map((p: any) => ({
    id: p.id as number,
    etiqueta: [p.marcas?.nombre, p.nombre, p.viscosidad_codigo].filter(Boolean).join(' · '),
    stock: Number(p.stock),
    costo: Number(p.precio_compra),
  }))

  const ajustes = (aj.data ?? []).map((a: any) => ({
    id: a.id as number,
    producto: [a.productos?.marcas?.nombre, a.productos?.nombre, a.productos?.viscosidad_codigo]
      .filter(Boolean)
      .join(' · '),
    anterior: Number(a.stock_anterior),
    nuevo: Number(a.stock_nuevo),
    diferencia: Number(a.diferencia),
    valor: Number(a.diferencia) * Number(a.costo_unitario),
    motivo: a.motivo as string,
    fecha: a.creado_en as string,
  }))

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl uppercase tracking-wide text-[#F1F5F9] md:text-5xl">
        Ajustes de inventario
      </h1>
      <AjusteStock productos={productos} ajustes={ajustes} />
    </div>
  )
}