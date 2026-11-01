import {
  Car, Disc, Droplets, Filter, FlaskConical, Fuel, Gauge, Gift, Package,
  Settings, ShoppingBag, Snowflake, SprayCan, Tag, Wrench, Zap,
  type LucideIcon,
} from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

export type TipoProducto = {
  id: number
  clave: string
  nombre: string
  nombre_plural: string
  icono: string
  orden: number
  activo: boolean
  es_base: boolean
}

export const ICONOS: Record<string, LucideIcon> = {
  droplets: Droplets,
  snowflake: Snowflake,
  'flask-conical': FlaskConical,
  filter: Filter,
  zap: Zap,
  wrench: Wrench,
  settings: Settings,
  'spray-can': SprayCan,
  gift: Gift,
  tag: Tag,
  disc: Disc,
  fuel: Fuel,
  gauge: Gauge,
  car: Car,
  'shopping-bag': ShoppingBag,
  package: Package,
}

export const ICONOS_LISTA = [
  { clave: 'droplets', etiqueta: 'Gota (aceites)' },
  { clave: 'snowflake', etiqueta: 'Copo (refrigerante)' },
  { clave: 'flask-conical', etiqueta: 'Frasco (aditivos)' },
  { clave: 'filter', etiqueta: 'Filtro' },
  { clave: 'zap', etiqueta: 'Rayo (eléctrico)' },
  { clave: 'wrench', etiqueta: 'Llave (repuestos)' },
  { clave: 'settings', etiqueta: 'Engranaje (refacciones)' },
  { clave: 'spray-can', etiqueta: 'Aerosol (ambientadores)' },
  { clave: 'gift', etiqueta: 'Regalo (bonificación)' },
  { clave: 'tag', etiqueta: 'Etiqueta' },
  { clave: 'disc', etiqueta: 'Disco (frenos)' },
  { clave: 'fuel', etiqueta: 'Combustible' },
  { clave: 'gauge', etiqueta: 'Medidor' },
  { clave: 'car', etiqueta: 'Auto' },
  { clave: 'shopping-bag', etiqueta: 'Bolsa (accesorios)' },
  { clave: 'package', etiqueta: 'Caja (general)' },
]

export function iconoDe(nombre: string | undefined): LucideIcon {
  return (nombre && ICONOS[nombre]) || Package
}

export function nombreTipo(tipos: TipoProducto[], clave: string) {
  return tipos.find((t) => t.clave === clave)?.nombre ?? clave
}

export async function cargarTipos(supabase: SupabaseClient): Promise<TipoProducto[]> {
  const { data } = await supabase
    .from('tipos_producto')
    .select('id, clave, nombre, nombre_plural, icono, orden, activo, es_base')
    .order('orden')
    .order('nombre')
  return (data ?? []) as TipoProducto[]
}