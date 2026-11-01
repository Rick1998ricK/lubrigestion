import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ServiciosPanel, { type ServicioFila } from '@/components/servicios/ServiciosPanel'

export default async function ServiciosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('usuarios').select('rol').eq('id', user!.id).single()
  if (perfil?.rol !== 'admin') redirect('/')

  const { data } = await supabase
    .from('servicios')
    .select('id, nombre, categoria, descripcion, precio_base, duracion_min, codigo, activo')
    .order('activo', { ascending: false })
    .order('categoria', { ascending: true, nullsFirst: false })
    .order('nombre')

  const servicios: ServicioFila[] = (data ?? []).map((s: any) => ({
    id: s.id,
    nombre: s.nombre,
    categoria: s.categoria ?? null,
    descripcion: s.descripcion ?? null,
    precio_base: Number(s.precio_base),
    duracion_min: s.duracion_min ?? null,
    codigo: s.codigo ?? null,
    activo: !!s.activo,
  }))

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl uppercase tracking-wide text-[#F1F5F9] md:text-5xl">Servicios</h1>
      <p className="text-sm text-[#9FB3C8]">
        Los servicios activos aparecen en Ventas con su precio base. Al vender se puede cambiar el precio de cada línea.
      </p>
      <ServiciosPanel servicios={servicios} />
    </div>
  )
}