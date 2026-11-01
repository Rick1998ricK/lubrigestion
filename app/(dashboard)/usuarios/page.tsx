import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { crearClienteAdmin } from '@/lib/supabase/admin'
import UsuariosPanel from '@/components/usuarios/UsuariosPanel'

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('usuarios').select('rol, organizacion_id').eq('id', user!.id).single()
  if (perfil?.rol !== 'admin') redirect('/')

  const admin = crearClienteAdmin()
  const [{ data: filas }, { data: lista }] = await Promise.all([
    admin
      .from('usuarios')
      .select('id, nombre, rol, creado_en')
      .eq('organizacion_id', perfil.organizacion_id)
      .order('creado_en'),
    admin.auth.admin.listUsers({ perPage: 200 }),
  ])

  const auth = new Map((lista?.users ?? []).map((u) => [u.id, u]))
  const ahora = Date.now()
  const usuarios = (filas ?? []).map((f: any) => {
    const a = auth.get(f.id)
    const bloqueado = a?.banned_until ? new Date(a.banned_until).getTime() > ahora : false
    return {
      id: f.id as string,
      nombre: f.nombre as string,
      rol: f.rol as string,
      email: a?.email ?? '—',
      activo: !bloqueado,
      soyYo: f.id === user!.id,
    }
  })

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl uppercase tracking-wide text-[#F1F5F9] md:text-5xl">
        Usuarios
      </h1>
      <UsuariosPanel usuarios={usuarios} />
    </div>
  )
}