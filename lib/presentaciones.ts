import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

let cache: string[] | null = null

// Llamar después de agregar o quitar presentaciones
export function limpiarCachePresentaciones() {
  cache = null
}

// Convierte "237 ml", "1.1 L", "3.78 L" a mililitros para ordenar
export function volumenMl(texto: string): number {
  const m = texto.toLowerCase().replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(ml|l|lt|lts|litros?|gal|gl)\b/)
  if (!m) return Infinity
  const n = Number(m[1])
  if (m[2] === 'ml') return n
  if (m[2] === 'gal' || m[2] === 'gl') return n * 3785
  return n * 1000
}

export function ordenarPresentaciones(lista: string[]) {
  return [...lista].sort((a, b) => {
    const va = volumenMl(a)
    const vb = volumenMl(b)
    if (va !== vb) return va < vb ? -1 : 1
    return a.localeCompare(b)
  })
}

export function usePresentaciones(): string[] {
  const [lista, setLista] = useState<string[]>(cache ?? [])
  useEffect(() => {
    if (cache) {
      setLista(cache)
      return
    }
    let vivo = true
    createClient()
      .from('presentaciones')
      .select('nombre')
      .then(({ data, error }) => {
        if (error) {
          console.error('presentaciones:', error.message)
          return // no se guarda en caché: se reintenta la próxima vez
        }
        cache = (data ?? []).map((r: { nombre: string }) => r.nombre)
        if (vivo) setLista(cache)
      })
    return () => {
      vivo = false
    }
  }, [])
  return lista
}