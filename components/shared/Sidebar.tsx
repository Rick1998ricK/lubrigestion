'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Package, Receipt, Truck, LayoutGrid, 
        BarChart3, Wallet, LogOut, Menu, X, Users, 
        Building2, History, ClipboardCheck, Banknote, 
        UserCog, FileSpreadsheet, BookOpen, Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Rol = 'admin' | 'operador'

const items = [
  { href: '/', label: 'Inicio', icon: Home, roles: ['admin', 'operador'] },
  { href: '/inventario', label: 'Inventario', icon: Package, roles: ['admin', 'operador'] },
  { href: '/ventas', label: 'Ventas y mantenimiento', icon: Receipt, roles: ['admin', 'operador'] },
  { href: '/ventas/historial', label: 'Historial de ventas', icon: History, roles: ['admin', 'operador'] },
  { href: '/caja', label: 'Caja diaria', icon: Banknote, roles: ['admin', 'operador'] },
  { href: '/clientes', label: 'Clientes', icon: Users, roles: ['admin', 'operador'] },
  { href: '/compras', label: 'Compras y pedidos', icon: Truck, roles: ['admin'] },
  { href: '/proveedores', label: 'Proveedores', icon: Building2, roles: ['admin'] },
  { href: '/servicios', label: 'Servicios', icon: Wrench, roles: ['admin'] },
  { href: '/catalogo', label: 'Catálogo', icon: LayoutGrid, roles: ['admin', 'operador'] },
  { href: '/reportes', label: 'Reportes', icon: BarChart3, roles: ['admin'] },
  { href: '/exportar', label: 'Exportar a Excel', icon: FileSpreadsheet, roles: ['admin', 'operador'] },
  { href: '/kardex', label: 'Kardex', icon: BookOpen, roles: ['admin'] },
  { href: '/gastos', label: 'Gastos', icon: Wallet, roles: ['admin'] },
  { href: '/usuarios', label: 'Usuarios', icon: UserCog, roles: ['admin'] },
]

export default function Sidebar({ rol, nombre, org }: { rol: Rol; nombre: string; org: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)

  // Cierra el menú al cambiar de página
  useEffect(() => {
    setAbierto(false)
  }, [pathname])

  // Cierra con la tecla Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function cerrarSesion() {
    await createClient().auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <>
      {/* Barra superior: solo en pantallas chicas */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-borde bg-panel px-4 py-2.5 md:hidden">
        <div className="min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt={org} className="h-9 w-auto" />
          <p className="truncate text-xs text-suave">{org}</p>
        </div>
        <button type="button" onClick={() => setAbierto(true)}
          aria-label="Abrir menú" aria-expanded={abierto}
          className="grid size-11 shrink-0 place-items-center rounded-lg border border-borde">
          <Menu size={22} aria-hidden="true" />
        </button>
      </header>

      {/* Fondo oscuro detrás del menú abierto */}
      {abierto && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setAbierto(false)} aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto border-r border-borde bg-panel p-4 transition-[transform,visibility] duration-200 motion-reduce:transition-none md:sticky md:top-0 md:h-screen md:w-64 md:max-w-none md:shrink-0 md:translate-x-0 md:visible ${
          abierto ? 'translate-x-0 visible' : '-translate-x-full invisible'
        }`}
      >
        <div className="flex items-start justify-between gap-2 px-2">
          <div className="min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt={org} className="h-12 w-auto" />
            <p className="mt-1 truncate text-sm text-suave">{org}</p>
          </div>
          <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar menú"
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-borde md:hidden">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Principal" className="flex flex-col gap-1">
          {items.filter((i) => i.roles.includes(rol)).map(({ href, label, icon: Icon }) => {
            const activo = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link key={href} href={href} aria-current={activo ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-sm font-semibold ${
                  activo
                    ? 'border-acento/50 bg-acento/10 text-acento'
                    : 'border-transparent text-suave hover:bg-tarjeta hover:text-texto'
                }`}>
                <Icon size={18} aria-hidden="true" /> {label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto space-y-3 border-t border-borde px-2 pt-4">
          <div>
            <p className="text-sm font-semibold">{nombre}</p>
            <p className="text-xs text-suave">{rol === 'admin' ? 'Administrador' : 'Operador'}</p>
          </div>
          <button type="button" onClick={cerrarSesion}
            className="flex items-center gap-2 py-1 text-sm text-suave hover:text-texto">
            <LogOut size={16} aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}