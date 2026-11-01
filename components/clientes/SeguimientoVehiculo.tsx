'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const sel =
  'rounded-lg border border-[#17496B] bg-[#061626] px-2 py-1.5 text-sm text-[#F1F5F9] outline-none focus:border-[#FFC107]'

export default function SeguimientoVehiculo({ veh }: { veh: any }) {
  const router = useRouter()
  const [uso, setUso] = useState<string>(veh.tipo_uso ?? 'particular')
  const [criterio, setCriterio] = useState<string>(veh.criterio ?? 'ambos')
  const [kmDia, setKmDia] = useState(veh.km_diario == null ? '' : String(veh.km_diario))
  const [meses, setMeses] = useState(veh.intervalo_meses == null ? '' : String(veh.intervalo_meses))
  const [estado, setEstado] = useState('')

  async function guardar() {
    setEstado('Guardando…')
    const { error } = await createClient().rpc('guardar_seguimiento', {
      p_vehiculo_id: veh.id,
      p_tipo_uso: uso,
      p_criterio: criterio,
      p_km_diario: kmDia === '' ? null : Number(kmDia),
      p_intervalo: meses === '' ? null : Number(meses),
    })
    if (error) return setEstado(error.message)
    setEstado('Guardado')
    router.refresh()
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 text-xs text-[#9FB3C8]">
      <label className="grid gap-1">Uso
        <select className={sel} value={uso} onChange={(e) => setUso(e.target.value)}>
          <option value="particular">Particular</option>
          <option value="taxi">Taxi / app</option>
          <option value="carga">Carga / reparto</option>
          <option value="moto">Moto</option>
        </select>
      </label>
      <label className="grid gap-1">Recordar por
        <select className={sel} value={criterio} onChange={(e) => setCriterio(e.target.value)}>
          <option value="ambos">Lo que ocurra primero</option>
          <option value="km">Solo kilometraje</option>
          <option value="tiempo">Solo tiempo</option>
        </select>
      </label>
      <label className="grid gap-1">Km por día
        <input className={`${sel} w-24`} type="number" min={1} value={kmDia}
          onChange={(e) => setKmDia(e.target.value)} placeholder="auto" />
      </label>
      <label className="grid gap-1">Cada (meses)
        <input className={`${sel} w-20`} type="number" min={1} value={meses}
          onChange={(e) => setMeses(e.target.value)} placeholder="6" />
      </label>
      <button type="button" onClick={guardar}
        className="rounded-lg border border-[#FFC107] px-3 py-1.5 font-semibold text-[#FFC107]">
        Guardar
      </button>
      {estado && <span>{estado}</span>}
    </div>
  )
}