'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home, Package, Receipt, Truck, LayoutGrid, BarChart3, Wallet, LogOut, Menu, X,
  Users, Building2, History, Banknote, UserCog, FileSpreadsheet, BookOpen, Wrench,
  ChevronDown, CreditCard, type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Rol = 'admin' | 'operador'
type Item = { href: string; label: string; icon: LucideIcon; roles: Rol[] }
type Grupo = { label: string; icon: LucideIcon; items: Item[] }

const AMBOS: Rol[] = ['admin', 'operador']
const ADMIN: Rol[] = ['admin']

const menu: (Item | Grupo)[] = [
  { href: '/', label: 'Inicio', icon: Home, roles: AMBOS },
  {
    label: 'Ventas', icon: Receipt,
    items: [
      { href: '/ventas', label: 'Nueva venta', icon: Receipt, roles: AMBOS },
      { href: '/ventas/historial', label: 'Historial de ventas', icon: History, roles: AMBOS },
      { href: '/caja', label: 'Caja diaria', icon: Banknote, roles: AMBOS },
      { href: '/creditos', label: 'Créditos por cobrar', icon: CreditCard, roles: AMBOS },
      { href: '/servicios', label: 'Servicios', icon: Wrench, roles: ADMIN },
    ],
  },
  { href: '/clientes', label: 'Clientes', icon: Users, roles: AMBOS },
  {
    label: 'Almacén', icon: Package,
    items: [
      { href: '/inventario', label: 'Inventario', icon: Package, roles: AMBOS },
      { href: '/catalogo', label: 'Catálogo', icon: LayoutGrid, roles: AMBOS },
      { href: '/kardex', label: 'Kardex', icon: BookOpen, roles: ADMIN },
    ],
  },
  {
    label: 'Compras y gastos', icon: Truck,
    items: [
      { href: '/compras', label: 'Compras y pedidos', icon: Truck, roles: ADMIN },
      { href: '/proveedores', label: 'Proveedores', icon: Building2, roles: ADMIN },
      { href: '/gastos', label: 'Gastos', icon: Wallet, roles: ADMIN },
    ],
  },
  {
    label: 'Informes', icon: BarChart3,
    items: [
      { href: '/reportes', label: 'Reportes', icon: BarChart3, roles: ADMIN },
      { href: '/exportar', label: 'Exportar a Excel', icon: FileSpreadsheet, roles: AMBOS },
    ],
  },
  { href: '/usuarios', label: 'Usuarios', icon: UserCog, roles: ADMIN },
]

const esGrupo = (e: Item | Grupo): e is Grupo => 'items' in e

export default function Sidebar({ rol, nombre, org }: { rol: Rol; nombre: string; org: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [grupos, setGrupos] = useState<Record<string, boolean>>({})

  // Solo lo que este rol puede ver; los grupos vacíos se ocultan
  const visibles = menu
    .map((e) => (esGrupo(e) ? { ...e, items: e.items.filter((i) => i.roles.includes(rol)) } : e))
    .filter((e) => (esGrupo(e) ? e.items.length > 0 : e.roles.includes(rol)))

  // Una sola opción activa: la ruta más específica que coincida
  const todos = visibles.flatMap((e) => (esGrupo(e) ? e.items : [e]))
  const activoHref = todos
    .filter((i) => (i.href === '/' ? pathname === '/' : pathname === i.href || pathname.startsWith(i.href + '/')))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  // Cierra el menú móvil y abre el grupo de la página actual
  useEffect(() => {
    setAbierto(false)
    const g = visibles.find((e) => esGrupo(e) && e.items.some((i) => i.href === activoHref))
    if (g && esGrupo(g)) setGrupos((p) => ({ ...p, [g.label]: true }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

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

  const base = 'flex items-center gap-3 rounded-lg border px-3 py-3 text-sm font-semibold'
  const claseLink = (activo: boolean) =>
    `${base} ${
      activo
        ? 'border-acento/50 bg-acento/10 text-acento'
        : 'border-transparent text-suave hover:bg-tarjeta hover:text-texto'
    }`

  return (
    <>
      {/* Barra superior: solo en pantallas chicas */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-borde bg-panel px-4 py-2.5 md:hidden">
        <div className="min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt={org} className="h-auto w-36" />
        </div>
        <button type="button" onClick={() => setAbierto(true)}
          aria-label="Abrir menú" aria-expanded={abierto}
          className="grid size-11 shrink-0 place-items-center rounded-lg border border-borde">
          <Menu size={22} aria-hidden="true" />
        </button>
      </header>

      {abierto && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setAbierto(false)} aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-5 overflow-y-auto border-r border-borde bg-panel p-4 transition-[transform,visibility] duration-200 motion-reduce:transition-none md:sticky md:top-0 md:h-screen md:w-64 md:max-w-none md:shrink-0 md:translate-x-0 md:visible ${
          abierto ? 'translate-x-0 visible' : '-translate-x-full invisible'
        }`}
      >
        <div className="flex items-start justify-between gap-2 px-1">
          <div className="min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt={org} className="h-auto w-48 max-w-full" />
          </div>
          <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar menú"
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-borde md:hidden">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Principal" className="flex flex-col gap-1">
          {visibles.map((e) => {
            if (!esGrupo(e)) {
              const Icon = e.icon
              return (
                <Link key={e.href} href={e.href} aria-current={e.href === activoHref ? 'page' : undefined}
                  className={claseLink(e.href === activoHref)}>
                  <Icon size={18} aria-hidden="true" /> {e.label}
                </Link>
              )
            }
            const Icon = e.icon
            const abiertoG = !!grupos[e.label]
            const contieneActivo = e.items.some((i) => i.href === activoHref)
            return (
              <div key={e.label}>
                <button type="button"
                  onClick={() => setGrupos((p) => ({ ...p, [e.label]: !abiertoG }))}
                  aria-expanded={abiertoG}
                  className={`${base} w-full border-transparent hover:bg-tarjeta ${
                    contieneActivo && !abiertoG ? 'text-acento' : 'text-suave hover:text-texto'
                  }`}>
                  <Icon size={18} aria-hidden="true" />
                  <span className="flex-1 text-left">{e.label}</span>
                  <ChevronDown size={16} aria-hidden="true"
                    className={`transition-transform ${abiertoG ? 'rotate-180' : ''}`} />
                </button>
                {abiertoG && (
                  <div className="ml-5 mt-1 flex flex-col gap-1 border-l border-borde pl-2">
                    {e.items.map(({ href, label, icon: SubIcon }) => (
                      <Link key={href} href={href} aria-current={href === activoHref ? 'page' : undefined}
                        className={`${claseLink(href === activoHref)} py-2.5`}>
                        <SubIcon size={16} aria-hidden="true" /> {label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
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