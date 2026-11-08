export type Compat = {
  original: string
  texto: string
  desde: number | null
  hasta: number | null
}

const ANIO = /^(19[89]\d|20\d{2})$/
export const esAnio = (w: string) => ANIO.test(w)

// "Toyota Hilux 2005-2015" → { texto, desde: 2005, hasta: 2015 }
export function parsearVehiculos(texto: unknown): Compat[] {
  return String(texto ?? '')
    .split(/\r?\n|;/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((original) => {
      const t = original.toLowerCase()
      let desde: number | null = null
      let hasta: number | null = null

      const anios = [...t.matchAll(/\b((?:19[89]|20[0-9])\d)\b/g)].map((m) => Number(m[1]))
      if (anios.length) {
        desde = Math.min(...anios)
        hasta = Math.max(...anios)
      }
      // 2016-22
      const corto = t.match(/\b((?:19[89]|20[0-9])\d)\s*[-–]\s*(\d{2})\b/)
      if (corto) {
        const a = Number(corto[1])
        const b = Math.floor(a / 100) * 100 + Number(corto[2])
        desde = a
        hasta = b >= a ? b : a
      }
      // 2019+  /  2019 en adelante
      const mas = t.match(/\b((?:19[89]|20[0-9])\d)\s*(\+|en adelante)/)
      if (mas) {
        desde = Number(mas[1])
        hasta = 2100
      }
      return { original, texto: t, desde, hasta }
    })
}

export function lineaCumple(v: Compat, w: string) {
  if (v.texto.includes(w)) return true
  if (esAnio(w)) {
    if (v.desde == null || v.hasta == null) return true // línea sin año: sirve para cualquiera
    const a = Number(w)
    return a >= v.desde && a <= v.hasta
  }
  return false
}

// Búsqueda del producto: los datos propios (base) y, si hace falta, UNA línea de vehículo
export function coincideProducto(
  o: { busqueda: string; base?: string; vehiculos?: Compat[] },
  palabras: string[],
): boolean {
  const base = o.base ?? o.busqueda
  const faltan = palabras.filter((p) => !base.includes(p))
  if (faltan.length === 0) return true
  if (!o.vehiculos?.length) return false
  if (palabras.every(esAnio)) return false // solo un año no basta
  return o.vehiculos.some((v) => faltan.every((p) => lineaCumple(v, p)))
}

// Para sugerir filtros a partir del vehículo del cliente
export function filtrarPorVehiculo<T extends { vehiculos?: Compat[] }>(items: T[], consulta: string): T[] {
  const palabras = consulta.toLowerCase().split(/[\s,]+/).filter((w) => w.length >= 2)
  if (palabras.length === 0) return []
  const lineas = items.flatMap((i) => i.vehiculos ?? [])
  // Se ignoran palabras que no aparecen en ningún vehículo (ej. «diésel», «4x4»)
  const relevantes = palabras.filter((w) => esAnio(w) || lineas.some((v) => v.texto.includes(w)))
  if (relevantes.every(esAnio)) return []
  return items.filter((i) => (i.vehiculos ?? []).some((v) => relevantes.every((w) => lineaCumple(v, w))))
}