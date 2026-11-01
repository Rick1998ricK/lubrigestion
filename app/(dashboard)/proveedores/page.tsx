import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProveedoresPanel from '@/components/proveedores/ProveedoresPanel'

export default async function ProveedoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('usuarios').select('rol').eq('id', user!.id).single()
  if (perfil?.rol !== 'admin') redirect('/')

  const { data } = await supabase
    .from('proveedores')
    .select('id, razon_social, ruc, direccion, telefono, asesor_comercial')
    .order('razon_social')

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl uppercase tracking-wide text-[#F1F5F9] md:text-5xl">
        Proveedores
      </h1>
      <ProveedoresPanel proveedores={(data ?? []) as any[]} />
    </div>
  )
}