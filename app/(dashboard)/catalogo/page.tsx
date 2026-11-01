import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CatalogoGrid from '@/components/catalogo/CatalogoGrid'
import { cargarTipos } from '@/lib/tipos'
import { resumenAtributos, textoAtributos } from '@/lib/campos-producto'

export default async function CatalogoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('usuarios').select('rol, organizacion_id').eq('id', user!.id).single()
  const esAdmin = perfil?.rol === 'admin'

  const { data } = await supabase
    .from('productos_publico')
    .select(
      'id, nombre, tipo, marca, viscosidad_codigo, codigo, ean, codigo_tienda, presentacion, aplicacion, stock_minimo, ubicacion, atributos, stock, precio_venta, imagen_url',
    )
    .order('tipo')
    .order('nombre')

  const tipos = await cargarTipos(supabase)

  const productos = (data ?? []).map((p: any) => ({
    id: p.id as number,
    nombre: p.nombre as string,
    tipo: p.tipo as string,
    marca: (p.marca ?? '') as string,
    codigo: (p.viscosidad_codigo ?? '') as string,
    ref: (p.codigo && p.codigo !== p.viscosidad_codigo ? p.codigo : '') as string,
    presentacion: (p.presentacion ?? '') as string,
    ean: (p.ean ?? '') as string,
    codigoTienda: (p.codigo_tienda ?? '') as string,
    minimo: p.stock_minimo == null ? null : Number(p.stock_minimo),
    detalle: resumenAtributos(p.tipo, p.atributos),
    buscable: `${textoAtributos(p.atributos)} ${p.aplicacion ?? ''}`,
    stock: Number(p.stock),
    precio: Number(p.precio_venta),
    imagen: (p.imagen_url ?? null) as string | null,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl uppercase tracking-wide text-[#F1F5F9] md:text-5xl">
          Catálogo
        </h1>
        {esAdmin && (
          <Link href="/catalogo/compartir" className="text-sm font-semibold text-[#FFC107] hover:underline">
            Compartir catálogo →
          </Link>
        )}
      </div>
      <CatalogoGrid
        productos={productos}
        esAdmin={esAdmin}
        tipos={tipos}
        orgId={(perfil?.organizacion_id ?? '') as string}
      />
    </div>
  )
}