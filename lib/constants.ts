export const TIPOS_PRODUCTO = [
  { value: 'lubricante', label: 'Lubricante' },
  { value: 'filtro_aceite', label: 'Filtro de aceite' },
  { value: 'filtro_aire', label: 'Filtro de aire' },
  { value: 'filtro_combustible', label: 'Filtro de combustible' },
  { value: 'filtro_cabina', label: 'Filtro de cabina' },
  { value: 'aditivo', label: 'Aditivo' },
  { value: 'accesorio_electrico', label: 'Accesorio eléctrico' },
  { value: 'repuesto', label: 'Repuesto' },
] as const

// Alerta de stock: menos de 3 unidades
export const STOCK_BAJO = 3

export function etiquetaTipo(valor: string) {
  return TIPOS_PRODUCTO.find((t) => t.value === valor)?.label ?? valor
}