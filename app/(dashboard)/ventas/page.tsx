import { createClient } from '@/lib/supabase/server'
import FormVenta, { type ProductoVenta, type ServicioVenta } from '@/components/ventas/FormVenta'

export default async function VentasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('usuarios').select('rol').eq('id', user!.id).single()
  const esAdmin = perfil?.rol === 'admin'
  const { data: org } = await supabase.from('organizaciones').select('id, nombre').single()

  const [prodRes, servRes] = await Promise.all([
    supabase
      .from('productos_publico')
      .select('id, nombre, tipo, marca, viscosidad_codigo, stock, precio_venta, ean, codigo_tienda, codigo, aplicacion')
      .gt('stock', 0)
      .order('nombre'),
    supabase
      .from('servicios')
      .select('id, nombre, precio_base, categoria')
      .eq('activo', true)
      .order('nombre'),
      .select('id, nombre, tipo, marca, viscosidad_codigo, stock, precio_venta, ean, codigo_tienda, codigo, aplicacion, atributos')
  ])

  // Solo el administrador recibe los costos
  const costos = new Map<number, number>()
  if (esAdmin && (prodRes.data ?? []).length > 0) {
    const { data: filas } = await supabase
      .from('productos')
      .select('id, precio_compra')
      .in('id', (prodRes.data ?? []).map((p) => p.id))
    for (const f of filas ?? []) costos.set(f.id, Number(f.precio_compra))
  }

  const productos: ProductoVenta[] = (prodRes.data ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    tipo: p.tipo,
    marca: p.marca ?? null,
    viscosidad_codigo: p.viscosidad_codigo ?? null,
    stock: p.stock,
    precio_venta: Number(p.precio_venta),
    precio_compra: esAdmin ? costos.get(p.id) ?? null : null,
    ean: p.ean ?? null,
    codigo_tienda: p.codigo_tienda ?? null,
    codigo: p.codigo ?? null,
    aplicacion: p.aplicacion ?? null,
    atributos: (p.atributos ?? null) as Record<string, unknown> | null,
  }))

  const servicios: ServicioVenta[] = (servRes.data ?? []).map((s) => ({
    id: s.id,
    nombre: s.nombre,
    precio_base: Number(s.precio_base),
    categoria: s.categoria ?? null,
  }))

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-5xl font-bold leading-none">Ventas y mantenimiento</h1>
        <p className="mt-2 text-suave">
          Registra al cliente, su vehículo, la revisión y lo que se vendió. El stock se descuenta al guardar.
        </p>
      </header>
      {(prodRes.error || servRes.error) && (
        <p className="text-sm text-peligro">
          No se pudo cargar el catálogo: {prodRes.error?.message ?? servRes.error?.message}
        </p>
      )}
        <FormVenta productos={productos} servicios={servicios} orgNombre={org?.nombre ?? ''} orgId={org?.id ?? ''} />
    </div>
  )
}