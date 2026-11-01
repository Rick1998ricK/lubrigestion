'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cambiarEstado, cambiarPassword, cambiarRol, crearUsuario } from '@/lib/actions/usuarios'

type U = { id: string; nombre: string; rol: string; email: string; activo: boolean; soyYo: boolean }

const input =
  'w-full rounded-lg border border-[#17496B] bg-[#061626] px-3 py-2 text-base text-[#F1F5F9] outline-none focus:border-[#FFC107] md:text-sm'
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-[#9FB3C8]'
const ROL: Record<string, string> = { admin: 'Administrador', operador: 'Operador' }

export default function UsuariosPanel({ usuarios }: { usuarios: U[] }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('operador')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  function ejecutar(fn: () => Promise<{ ok: boolean; error?: string }>, mensajeOk?: string) {
    setError('')
    setOk('')
    iniciar(async () => {
      const r = await fn()
      if (!r.ok) return setError(r.error ?? 'No se pudo completar la acción.')
      if (mensajeOk) setOk(mensajeOk)
      router.refresh()
    })
  }

  function crear(e: React.FormEvent) {
    e.preventDefault()
    ejecutar(async () => {
      const r = await crearUsuario({ nombre, email, password, rol })
      if (r.ok) {
        setNombre('')
        setEmail('')
        setPassword('')
        setRol('operador')
      }
      return r
    }, 'Usuario creado. Entrégale el correo y la contraseña temporal.')
  }

  function nuevaPassword(u: U) {
    const p = window.prompt(`Nueva contraseña para ${u.nombre} (mínimo 8 caracteres):`)
    if (!p) return
    ejecutar(() => cambiarPassword(u.id, p), `Contraseña de ${u.nombre} actualizada.`)
  }

  return (
    <>
      <form onSubmit={crear} className="space-y-4 rounded-2xl border border-[#17496B] bg-[#09243B] p-5">
        <h2 className="font-display text-2xl uppercase tracking-wide text-[#FFC107]">Nuevo usuario</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <span className={label}>Nombre</span>
            <input className={input} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div>
            <span className={label}>Rol</span>
            <select className={input} value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="operador">Operador (ventas, inventario, clientes, caja)</option>
              <option value="admin">Administrador (acceso total)</option>
            </select>
          </div>
          <div>
            <span className={label}>Correo</span>
            <input type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <span className={label}>Contraseña temporal</span>
            <input type="text" className={input} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            {error && <p className="text-[#FF6B5E]">{error}</p>}
            {ok && <p className="text-[#3DDC97]">{ok}</p>}
          </div>
          <button disabled={pendiente} className="rounded-lg bg-[#FFC107] px-6 py-2.5 font-bold text-[#061626] disabled:opacity-50">
            {pendiente ? 'Procesando…' : 'Crear usuario'}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {usuarios.map((u) => (
          <div
            key={u.id}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-[#09243B] p-4 ${u.activo ? 'border-[#17496B]' : 'border-[#FF6B5E]/40 opacity-70'}`}
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-[#F1F5F9]">
                {u.nombre}
                {u.soyYo && <span className="ml-2 text-xs text-[#FFC107]">(tú)</span>}
                {!u.activo && <span className="ml-2 rounded-full bg-[#FF6B5E]/15 px-2 py-0.5 text-xs text-[#FF6B5E]">Desactivado</span>}
              </p>
              <p className="truncate text-xs text-[#9FB3C8]">{u.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label={`Rol de ${u.nombre}`}
                value={u.rol}
                disabled={u.soyYo || pendiente}
                onChange={(e) => ejecutar(() => cambiarRol(u.id, e.target.value))}
                className="rounded-lg border border-[#17496B] bg-[#061626] px-2 py-1.5 text-sm text-[#F1F5F9] disabled:opacity-50"
              >
                {Object.entries(ROL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <button
                onClick={() => nuevaPassword(u)}
                disabled={pendiente}
                className="rounded-lg border border-[#17496B] px-3 py-1.5 text-sm text-[#9FB3C8] hover:border-[#FFC107] hover:text-[#FFC107] disabled:opacity-50"
              >
                Contraseña
              </button>
              {!u.soyYo && (
                <button
                  onClick={() => ejecutar(() => cambiarEstado(u.id, !u.activo))}
                  disabled={pendiente}
                  className={`rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 ${u.activo ? 'border-[#FF6B5E] text-[#FF6B5E] hover:bg-[#FF6B5E] hover:text-[#061626]' : 'border-[#3DDC97] text-[#3DDC97] hover:bg-[#3DDC97] hover:text-[#061626]'}`}
                >
                  {u.activo ? 'Desactivar' : 'Reactivar'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}