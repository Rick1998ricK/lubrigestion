import type { MedicionResumen } from '@/lib/mediciones'

export type ResumenVenta = {
  ventaId: number
  org: string
  logo?: string
  fecha: string
  total: number
  cliente: { nombre: string; celular: string; correo: string }
  vehiculo: { modelo: string; placa: string; kmActual: number | null; kmProximo: number | null }
  ficha: {
    marcaAceite: string
    viscosidad: string
    filtros: { label: string; valor: string }[]
    estados: { label: string; valor: string }[]
    comentarios: string
    mediciones?: MedicionResumen[]
  }
  fotos?: string[]
  lineas: {
    nombre: string
    detalle?: string
    tipo: 'producto' | 'servicio'
    cantidad: number
    precio: number
    bonificacion: boolean
  }[]
}