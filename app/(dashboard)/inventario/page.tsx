import Link from 'next/link'
import { ClipboardCheck, Tags, Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { minimoDe, resumenAtributos, textoAtributos } from '@/lib/campos-producto'
import TablaStock, { type FilaStock } from '@/components/inventario/TablaStock'
import { cargarTipos } from '@/lib/tipos'

export default async function InventarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('usuarios').select('rol').eq('id', user!.id).single()
  const esAdmin = perfil?.rol === 'admin'
  const tipos = await cargarTipos(supabase)

  const stockRes = esAdmin
    ? await supabase.from('productos')
          .select('id, nombre, tipo, viscosidad_codigo, codigo, ean, codigo_tienda, presentacion, aplicacion, stock_minimo, ubicacion, atributos, stock, precio_compra, precio_venta, marcas(nombre)')
        .order('nombre')
    : await supabase.from('productos_publico')
          .select('id, nombre, tipo, marca, viscosidad_codigo, codigo, ean, codigo_tienda, presentacion, aplicacion, stock_minimo, ubicacion, atributos, stock, precio_venta')
        .order('nombre')

  const filas: FilaStock[] = ((stockRes.data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => {
    const m = r.marcas as { nombre: string } | { nombre: string }[] | null | undefined
    const marcaJoin = Array.isArray(m) ? m[0]?.nombre : m?.nombre
    const atributos = r.atributos as Record<string, unknown> | null
    return {
      id: r.id as number,
      nombre: r.nombre as string,
      tipo: r.tipo as string,
      marca: marcaJoin ?? (r.marca as string | null) ?? null,
      viscosidad_codigo: (r.viscosidad_codigo as string | null) ?? null,
      codigo: (r.codigo as string | null) ?? null,
      ean: (r.ean as string | null) ?? null,
      codigo_tienda: (r.codigo_tienda as string | null) ?? null,
      presentacion: (r.presentacion as string | null) ?? null,
      stock_minimo: r.stock_minimo == null ? null : Number(r.stock_minimo),
      ubicacion: (r.ubicacion as string | null) ?? null,
      detalle: resumenAtributos(r.tipo as string, atributos),
      buscable: `${textoAtributos(atributos)} ${(r.aplicacion as string | null) ?? ''}`,
      stock: r.stock as number,
      precio_venta: Number(r.precio_venta),
      precio_compra: esAdmin ? Number(r.precio_compra) : null,
    }
  })

  const agotados = filas.filter((f) => f.stock === 0).length
  const bajos = filas.filter((f) => f.stock > 0 && f.stock < minimoDe(f.stock_minimo)).length

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl font-bold leading-none">Inventario</h1>
          <p className="mt-2 text-suave">
            {filas.length === 0
              ? esAdmin
                ? 'Aún no hay productos. Registra tu primera compra en «Compras y pedidos».'
                : 'Aún no hay productos registrados.'
              : `${bajos} productos bajo el mínimo y ${agotados} agotados.`}
          </p>
        </div>
        {esAdmin && (
          <div className="flex flex-wrap gap-3">
            <Link
              href="/inventario/ajustes"
              className="inline-flex items-center gap-2 rounded-lg border border-borde bg-tarjeta px-4 py-2.5 text-sm font-semibold hover:border-acento"
            >
                <ClipboardCheck size={18} /> Conteo físico
              </Link>
              <Link
                href="/inventario/tipos"
                className="inline-flex items-center gap-2 rounded-lg border border-borde bg-tarjeta px-4 py-2.5 text-sm font-semibold hover:border-acento"
              >
                <Tags size={18} /> Tipos
              </Link>
            <Link
              href="/compras"
              className="inline-flex items-center gap-2 rounded-lg bg-acento px-4 py-2.5 text-sm font-bold text-fondo"
            >
              <Truck size={18} /> Ingresar mercadería
            </Link>
          </div>
        )}
      </header>

      <section className="rounded-xl border border-borde bg-tarjeta p-5">
        <h2 className="mb-4 font-display text-2xl font-semibold">Stock disponible</h2>
        {stockRes.error && (
          <p className="mb-3 text-sm text-peligro">
            No se pudo cargar el stock: {stockRes.error.message}
          </p>
        )}
        <TablaStock filas={filas} esAdmin={esAdmin} tipos={tipos} />
      </section>
    </div>
  )
}