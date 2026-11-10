export type Deuda = {
  venta_id: number
  cliente_id: number
  nombres_apellidos: string
  celular: string | null
  fecha_venta: string
  fecha_prometida: string | null
  total: number
  pagado: number
  saldo: number
}

export const soles = (n: number) => `S/ ${n.toFixed(2)}`
export const hoyLima = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10)
export const diasDesde = (ts: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 86400e3))
export const fechaCorta = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export function aDeuda(r: any): Deuda {
  return {
    venta_id: Number(r.venta_id),
    cliente_id: Number(r.cliente_id),
    nombres_apellidos: r.nombres_apellidos ?? '',
    celular: r.celular ?? null,
    fecha_venta: r.fecha_venta,
    fecha_prometida: r.fecha_prometida ?? null,
    total: Number(r.total),
    pagado: Number(r.pagado),
    saldo: Number(r.saldo),
  }
}