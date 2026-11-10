import { createClient } from '@/lib/supabase/server'
import { aDeuda, hoyLima } from '@/lib/creditos'
import ListaCreditos from '@/components/creditos/ListaCreditos'

export default async function CreditosPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('creditos_pendientes')
    .select('*')
    .order('fecha_venta')

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-5xl font-bold leading-none">Créditos por cobrar</h1>
        <p className="mt-2 text-suave">
          Ventas fiadas. Cada cobro suma a la caja del día en que se registra.
        </p>
      </header>
      {error && <p className="text-sm text-peligro">No se pudo cargar: {error.message}</p>}
      <ListaCreditos deudas={(data ?? []).map(aDeuda)} hoy={hoyLima()} />
    </div>
  )
}