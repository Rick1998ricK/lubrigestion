'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gift } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function PremioFidelidad({
  clienteId,
  pendientes,
}: {
  clienteId: number
  pendientes: number
}) {
  const router = useRouter()
  const [descripcion, setDescripcion] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function entregar() {
    setError('')
    setCargando(true)
    const { error } = await createClient().rpc('entregar_premio', {
      p_cliente_id: clienteId,
      p_descripcion: descripcion,
    })
    setCargando(false)
    if (error) return setError(error.message)
    setDescripcion('')
    router.refresh()
  }

  return (
    <div className="space-y-3 rounded-xl border border-[#FFC107] bg-[#FFC107]/10 p-4">
      <p className="flex items-center gap-2 font-semibold text-[#FFC107]">
        <Gift size={18} /> Tiene {pendientes} premio{pendientes > 1 ? 's' : ''} por entregar
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="¿Qué se le entregó? (ej. lavado gratis, ambientador)"
          className="min-w-0 flex-1 rounded-lg border border-[#17496B] bg-[#061626] px-3 py-2 text-base text-[#F1F5F9] outline-none focus:border-[#FFC107] md:text-sm"
        />
        <button
          type="button"
          onClick={entregar}
          disabled={cargando}
          className="rounded-lg bg-[#FFC107] px-4 py-2 text-sm font-bold text-[#061626] disabled:opacity-50"
        >
          {cargando ? 'Guardando…' : 'Marcar entregado'}
        </button>
      </div>
      {error && <p className="text-sm text-[#FF6B5E]">{error}</p>}
    </div>
  )
}