import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/shared/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('nombre, rol, organizaciones(nombre)')
    .eq('id', user.id)
    .single()

  if (!perfil) {
    return (
      <main className="min-h-screen grid place-items-center p-6 text-center">
        <p>Tu usuario no tiene un lubricentro asignado. Contacta al administrador.</p>
      </main>
    )
  }

  const org = Array.isArray(perfil.organizaciones) ? perfil.organizaciones[0] : perfil.organizaciones

  return (
    <div className="min-h-screen md:flex">
      <Sidebar rol={perfil.rol} nombre={perfil.nombre} org={org?.nombre ?? ''} />
      <main className="min-w-0 flex-1 p-5 md:p-8">{children}</main>
    </div>
  )
}