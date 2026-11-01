import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CatalogoPublico, { type ProductoPublico } from '@/components/catalogo/CatalogoPublico'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function cargar(token: string) {
  if (!UUID.test(token)) return null
  const supabase = await createClient()
  const { data } = await supabase.rpc('catalogo_publico', { p_token: token })
  return data as { org: { nombre: string; whatsapp: string | null }; productos: ProductoPublico[] } | null
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const data = await cargar(token)
  return {
    title: data ? `Catálogo · ${data.org.nombre}` : 'Catálogo',
    robots: { index: false, follow: false },
  }
}

export default async function CatalogoPublicoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await cargar(token)
  if (!data) notFound()

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const productos = data.productos.map((p) => ({
    ...p,
    // imagen_url puede ser una URL completa o una ruta dentro del bucket «productos»
    imagen: p.imagen
      ? p.imagen.startsWith('http')
        ? p.imagen
        : `${base}/storage/v1/object/public/productos/${p.imagen}`
      : null,
  }))

  const w = (data.org.whatsapp ?? '').replace(/\D/g, '')
  const whatsapp = w.length === 9 ? `51${w}` : w

  return (
    <main className="min-h-screen bg-[#061626]">
      <CatalogoPublico org={data.org.nombre} productos={productos} whatsapp={whatsapp} />
    </main>
  )
}