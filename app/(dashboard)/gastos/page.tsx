import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GastosPanel from '@/components/gastos/GastosPanel'

export default async function GastosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('usuarios').select('rol').eq('id', user!.id).single()
  if (perfil?.rol !== 'admin') redirect('/')

  const { data } = await supabase
    .from('gastos')
    .select('id, tipo, proveedor_beneficiario, ruc, documento, fecha, monto, medio_pago, descripcion, anulado')
    .order('fecha', { ascending: false })
    .order('id', { ascending: false })
    .limit(200)

  // Mes actual en hora de Perú
  const mes = new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 7)

  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl uppercase tracking-wide text-[#F1F5F9] md:text-5xl">
        Gastos
      </h1>
      <GastosPanel gastos={(data ?? []).map((g: any) => ({ ...g, monto: Number(g.monto) }))} mes={mes} />
    </div>
  )
}