import { createClient } from '@/lib/supabase/server'
import ExportarPanel from '@/components/exportar/ExportarPanel'

export default async function ExportarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('usuarios').select('rol').eq('id', user!.id).single()

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl uppercase tracking-wide text-[#F1F5F9] md:text-5xl">
        Exportar a Excel
      </h1>
      <ExportarPanel esAdmin={perfil?.rol === 'admin'} />
    </div>
  )
}