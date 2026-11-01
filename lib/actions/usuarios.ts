'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { crearClienteAdmin } from '@/lib/supabase/admin'

type Res = { ok: boolean; error?: string }

// Verifica que quien llama sea admin y devuelve su organización
async function exigirAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: perfil } = await supabase
    .from('usuarios').select('rol, organizacion_id').eq('id', user.id).single()
  if (perfil?.rol !== 'admin' || !perfil.organizacion_id)
    throw new Error('Solo el administrador puede gestionar usuarios')
  return { yo: user.id, org: perfil.organizacion_id as string }
}

// El usuario objetivo debe pertenecer a la misma organización
async function exigirMismoOrg(admin: ReturnType<typeof crearClienteAdmin>, id: string, org: string) {
  const { data } = await admin
    .from('usuarios').select('id').eq('id', id).eq('organizacion_id', org).maybeSingle()
  if (!data) throw new Error('Usuario no encontrado')
}

const mensaje = (e: unknown) => (e instanceof Error ? e.message : 'Error inesperado')

export async function crearUsuario(datos: {
  nombre: string
  email: string
  password: string
  rol: string
}): Promise<Res> {
  try {
    const { org } = await exigirAdmin()
    const nombre = datos.nombre.trim()
    const email = datos.email.trim().toLowerCase()
    if (!nombre) return { ok: false, error: 'El nombre es obligatorio.' }
    if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: 'El correo no es válido.' }
    if (datos.password.length < 8) return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' }
    if (datos.rol !== 'admin' && datos.rol !== 'operador') return { ok: false, error: 'Rol no válido.' }

    const admin = crearClienteAdmin()
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: datos.password,
      email_confirm: true,
    })
    if (error || !data.user) {
      const dup = /already|registered|exists/i.test(error?.message ?? '')
      return { ok: false, error: dup ? 'Ya existe una cuenta con ese correo.' : (error?.message ?? 'No se pudo crear') }
    }

    const { error: e2 } = await admin
      .from('usuarios')
      .insert({ id: data.user.id, nombre, rol: datos.rol, organizacion_id: org })
    if (e2) {
      await admin.auth.admin.deleteUser(data.user.id) // deshacer la cuenta si falla el perfil
      return { ok: false, error: e2.message }
    }
    revalidatePath('/usuarios')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: mensaje(e) }
  }
}

export async function cambiarRol(id: string, rol: string): Promise<Res> {
  try {
    const { yo, org } = await exigirAdmin()
    if (id === yo) return { ok: false, error: 'No puedes cambiar tu propio rol.' }
    if (rol !== 'admin' && rol !== 'operador') return { ok: false, error: 'Rol no válido.' }
    const admin = crearClienteAdmin()
    await exigirMismoOrg(admin, id, org)
    const { error } = await admin.from('usuarios').update({ rol }).eq('id', id)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/usuarios')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: mensaje(e) }
  }
}

export async function cambiarEstado(id: string, activo: boolean): Promise<Res> {
  try {
    const { yo, org } = await exigirAdmin()
    if (id === yo) return { ok: false, error: 'No puedes desactivar tu propia cuenta.' }
    const admin = crearClienteAdmin()
    await exigirMismoOrg(admin, id, org)
    const { error } = await admin.auth.admin.updateUserById(id, {
      ban_duration: activo ? 'none' : '876000h',
    })
    if (error) return { ok: false, error: error.message }
    revalidatePath('/usuarios')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: mensaje(e) }
  }
}

export async function cambiarPassword(id: string, password: string): Promise<Res> {
  try {
    const { org } = await exigirAdmin()
    if (password.length < 8) return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' }
    const admin = crearClienteAdmin()
    await exigirMismoOrg(admin, id, org)
    const { error } = await admin.auth.admin.updateUserById(id, { password })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: mensaje(e) }
  }
}