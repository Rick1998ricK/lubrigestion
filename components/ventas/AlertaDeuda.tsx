'use client'
import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import FilaDeuda from '@/components/creditos/FilaDeuda'
import { aDeuda, diasDesde, hoyLima, soles, type Deuda } from '@/lib/creditos'

export default function AlertaDeuda({ celular }: { celular: string }) {
  const [deudas, setDeudas] = useState<Deuda[]>([])
  const [abierto, setAbierto] = useState(false)
  const [oculto, setOculto] = useState(false)
  const [version, setVersion] = useState(0)
  const cel = celular.trim()

  useEffect(() => {
    setOculto(false)
    setAbierto(false)
  }, [cel])

  useEffect(() => {
    if (cel.length < 6) {
      setDeudas([])
      return
    }
    let vivo = true
    const t = setTimeout(async () => {
      const { data } = await createClient()
        .from('creditos_pendientes')
        .select('*')
        .eq('celular', cel)
        .order('fecha_venta')
      if (vivo) setDeudas((data ?? []).map(aDeuda))
    }, 400)
    return () => {
      vivo = false
      clearTimeout(t)
    }
  }, [cel, version])

  if (deudas.length === 0) return null

  const total = deudas.reduce((s, d) => s + d.saldo, 0)
  const hoy = hoyLima()
  const vencida = deudas.some((d) => d.fecha_prometida && d.fecha_prometida < hoy)
  const masVieja = Math.max(...deudas.map((d) => diasDesde(d.fecha_venta)))
  const color = vencida ? 'border-peligro bg-peligro/10' : 'border-acento bg-acento/10'

  if (oculto) {
    return (
      <button
        type="button"
        onClick={() => setOculto(false)}
        className={`w-full rounded-lg border px-3 py-1.5 text-left text-xs font-semibold ${color}`}
      >
        {deudas[0].nombres_apellidos} debe {soles(total)} · ver
      </button>
    )
  }

  return (
    <div className={`space-y-2 rounded-lg border p-3 ${color}`} role="alert">
      <p className="flex items-start gap-2 text-sm font-semibold">
        <AlertTriangle size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
        <span>
          {deudas[0].nombres_apellidos} debe {soles(total)} ({deudas.length} venta(s), la más antigua hace{' '}
          {masVieja} d){vencida ? ' · hay pagos vencidos' : ''}
        </span>
      </p>
      <p className="text-xs text-suave">Puedes seguir vendiéndole: lo nuevo se suma a su nombre.</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setAbierto((a) => !a)}
          className="rounded-md bg-acento px-3 py-1.5 text-xs font-bold text-fondo"
        >
          {abierto ? 'Ocultar deudas' : 'Cobrar ahora'}
        </button>
        <button
          type="button"
          onClick={() => setOculto(true)}
          className="rounded-md border border-borde px-3 py-1.5 text-xs font-semibold"
        >
          Entendido, seguir
        </button>
      </div>
      {abierto && (
        <ul className="divide-y divide-borde/60">
          {deudas.map((d) => (
            <FilaDeuda key={`${d.venta_id}-${d.saldo}`} d={d} onCobrado={() => setVersion((v) => v + 1)} />
          ))}
        </ul>
      )}
    </div>
  )
}