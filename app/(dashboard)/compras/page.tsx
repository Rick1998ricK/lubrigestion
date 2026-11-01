import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FormCompra from '@/components/compras/FormCompra'
import ListaCompras from '@/components/compras/ListaCompras'
import { cargarTipos } from '@/lib/tipos'

export default async function ComprasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('usuarios').select('rol').eq('id', user!.id).single()
  if (perfil?.rol !== 'admin') redirect('/')

  const [prov, prod, comp, org, marcasRes] = await Promise.all([
    supabase.from('proveedores').select('id, razon_social').order('razon_social'),
    supabase
      .from('productos')
      .select(
        'id, nombre, viscosidad_codigo, codigo, codigo_tienda, ean, presentacion, aplicacion, precio_compra, precio_venta, marcas(nombre)',
      )
      .order('nombre'),
    supabase
      .from('compras')
      .select('id, fecha_pedido, condicion, fecha_limite_pago, pagado, total, documento, proveedores(razon_social)')
      .order('fecha_pedido', { ascending: false })
      .order('id', { ascending: false })
      .limit(50),
    supabase.from('organizaciones').select('id, nombre').single(),
    supabase.from('marcas').select('nombre').order('nombre'),
  ])

  const tipos = await cargarTipos(supabase)

  const productos = (prod.data ?? []).map((p: any) => {
    const etiqueta = Array.from(
      new Set(
        [p.codigo_tienda, p.marcas?.nombre, p.nombre, p.viscosidad_codigo, p.codigo, p.presentacion].filter(Boolean),
      ),
    ).join(' · ')
    return {
      id: p.id as number,
      etiqueta,
      busqueda: [etiqueta, p.ean, p.aplicacion].filter(Boolean).join(' ').toLowerCase(),
      precio_compra: Number(p.precio_compra),
      precio_venta: Number(p.precio_venta),
    }
  })
  const compras = (comp.data ?? []).map((c: any) => ({
    id: c.id as number,
    fecha_pedido: c.fecha_pedido as string,
    condicion: c.condicion as string,
    fecha_limite_pago: c.fecha_limite_pago as string | null,
    pagado: c.pagado as boolean,
    total: Number(c.total),
    documento: c.documento as string | null,
    proveedor: c.proveedores?.razon_social ?? 'Sin proveedor',
  }))

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl uppercase tracking-wide text-[#F1F5F9] md:text-5xl">
          Compras y pedidos
        </h1>
        <Link href="/proveedores" className="text-sm font-semibold text-[#FFC107] hover:underline">
          Gestionar proveedores →
        </Link>
      </div>
      <FormCompra
        proveedores={prov.data ?? []}
        productos={productos}
        marcas={(marcasRes.data ?? []).map((m: any) => m.nombre as string)}
        tipos={tipos}
      />
      <ListaCompras
        compras={compras}
        orgId={(org.data?.id ?? '') as string}
        orgNombre={(org.data?.nombre ?? 'Lubricentro') as string}
      />
    </div>
  )
}