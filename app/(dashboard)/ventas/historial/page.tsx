import { createClient } from '@/lib/supabase/server'
import HistorialVentas from '@/components/ventas/HistorialVentas'

export default async function HistorialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('usuarios').select('rol').eq('id', user!.id).single()

  const { data } = await supabase
    .from('ventas')
    .select(
      'id, fecha_venta, total, anulada, motivo_anulacion, clientes(nombres_apellidos), mantenimientos(vehiculos(placa, vehiculo_modelo)), detalle_venta(cantidad, precio_venta, es_bonificacion, tipo_item, productos(nombre, viscosidad_codigo, marcas(nombre)), servicios(nombre))',
    )
    .order('fecha_venta', { ascending: false })
    .limit(100)

  const ventas = (data ?? []).map((v: any) => ({
    id: v.id as number,
    fecha: v.fecha_venta as string,
    total: Number(v.total),
    anulada: !!v.anulada,
    motivo: (v.motivo_anulacion ?? null) as string | null,
    cliente: (v.clientes?.nombres_apellidos ?? 'Cliente') as string,
    vehiculo: [v.mantenimientos?.vehiculos?.placa, v.mantenimientos?.vehiculos?.vehiculo_modelo]
      .filter(Boolean)
      .join(' · '),
    items: (v.detalle_venta ?? []).map((d: any) => ({
      nombre:
        d.tipo_item === 'servicio'
          ? (d.servicios?.nombre ?? 'Servicio')
          : [d.productos?.marcas?.nombre, d.productos?.nombre, d.productos?.viscosidad_codigo]
              .filter(Boolean)
              .join(' · '),
      cantidad: Number(d.cantidad),
      subtotal: d.es_bonificacion ? 0 : Number(d.precio_venta) * Number(d.cantidad),
      bonificacion: !!d.es_bonificacion,
    })),
  }))

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl uppercase tracking-wide text-[#F1F5F9] md:text-5xl">
        Historial de ventas
      </h1>
      <HistorialVentas ventas={ventas} esAdmin={perfil?.rol === 'admin'} />
    </div>
  )
}