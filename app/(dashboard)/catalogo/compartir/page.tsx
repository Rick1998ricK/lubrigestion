import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import CompartirCatalogo from '@/components/catalogo/CompartirCatalogo'

export default async function CompartirCatalogoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('usuarios').select('rol').eq('id', user!.id).single()
  if (perfil?.rol !== 'admin') redirect('/')

  const { data: org } = await supabase
    .from('organizaciones')
    .select('catalogo_token, catalogo_activo, whatsapp_catalogo')
    .single()

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/catalogo" className="inline-flex items-center gap-1 text-sm text-[#9FB3C8] hover:text-[#FFC107]">
        <ArrowLeft size={16} /> Catálogo
      </Link>
      <h1 className="font-display text-4xl uppercase tracking-wide text-[#F1F5F9] md:text-5xl">
        Compartir catálogo
      </h1>
      <p className="text-sm text-[#9FB3C8]">
        Genera un enlace para que tus clientes vean los productos con foto, descripción, aplicación y ficha
        técnica. No muestra precios ni cantidades de stock.
      </p>
      <CompartirCatalogo
        activoInicial={!!org?.catalogo_activo}
        tokenInicial={String(org?.catalogo_token ?? '')}
        whatsappInicial={org?.whatsapp_catalogo ?? ''}
      />
    </div>
  )
}