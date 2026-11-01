'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, ExternalLink, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const input =
  'w-full rounded-lg border border-[#17496B] bg-[#061626] px-3 py-2 text-base text-[#F1F5F9] outline-none focus:border-[#FFC107] md:text-sm'
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-[#9FB3C8]'

export default function CompartirCatalogo({
  activoInicial,
  tokenInicial,
  whatsappInicial,
}: {
  activoInicial: boolean
  tokenInicial: string
  whatsappInicial: string
}) {
  const router = useRouter()
  const [activo, setActivo] = useState(activoInicial)
  const [token, setToken] = useState(tokenInicial)
  const [whatsapp, setWhatsapp] = useState(whatsappInicial)
  const [guardando, setGuardando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const enlace = typeof window !== 'undefined' ? `${window.location.origin}/c/${token}` : `/c/${token}`

  async function guardar(nuevoActivo: boolean, regenerar = false) {
    setError('')
    setOk('')
    setGuardando(true)
    const { data, error } = await createClient().rpc('configurar_catalogo', {
      p_activo: nuevoActivo,
      p_whatsapp: whatsapp,
      p_regenerar: regenerar,
    })
    setGuardando(false)
    if (error) return setError(error.message)
    setActivo(nuevoActivo)
    setToken(String(data))
    setOk(regenerar ? 'Enlace nuevo generado. El anterior ya no funciona.' : 'Guardado.')
    router.refresh()
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setError('No se pudo copiar. Selecciona el enlace y cópialo a mano.')
    }
  }

  return (
    <div className="space-y-5 rounded-2xl border border-[#17496B] bg-[#09243B] p-5">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={activo}
          disabled={guardando}
          onChange={(e) => guardar(e.target.checked)}
          className="size-5 accent-[#FFC107]"
        />
        <span className="font-semibold text-[#F1F5F9]">
          Catálogo público {activo ? 'activado' : 'desactivado'}
        </span>
      </label>

      <div>
        <span className={label}>WhatsApp para consultas (el botón «Consultar» del catálogo)</span>
        <div className="flex gap-2">
          <input
            className={input}
            inputMode="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="999 999 999"
          />
          <button
            type="button"
            onClick={() => guardar(activo)}
            disabled={guardando}
            className="shrink-0 rounded-lg bg-[#FFC107] px-4 py-2 text-sm font-bold text-[#061626] disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </div>

      <div className={activo ? '' : 'opacity-50'}>
        <span className={label}>Enlace para compartir</span>
        <div className="flex flex-wrap gap-2">
          <input className={input} readOnly value={enlace} onFocus={(e) => e.currentTarget.select()} />
          <button
            type="button"
            onClick={copiar}
            disabled={!activo}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#17496B] px-4 py-2 text-sm font-semibold text-[#F1F5F9] hover:border-[#FFC107] disabled:opacity-50"
          >
            {copiado ? <Check size={16} /> : <Copy size={16} />} {copiado ? 'Copiado' : 'Copiar'}
          </button>
          <a
            href={enlace}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!activo}
            className={`inline-flex items-center gap-1.5 rounded-lg border border-[#17496B] px-4 py-2 text-sm font-semibold text-[#F1F5F9] hover:border-[#FFC107] ${
              activo ? '' : 'pointer-events-none'
            }`}
          >
            <ExternalLink size={16} /> Abrir
          </a>
        </div>
        {!activo && <p className="mt-1 text-xs text-[#9FB3C8]">Activa el catálogo para poder compartir el enlace.</p>}
      </div>

      <div className="border-t border-[#17496B] pt-4">
        <button
          type="button"
          onClick={() => {
            if (confirm('Se creará un enlace nuevo y el anterior dejará de funcionar. ¿Continuar?'))
              guardar(activo, true)
          }}
          disabled={guardando}
          className="inline-flex items-center gap-1.5 text-sm text-[#9FB3C8] hover:text-[#FF6B5E] disabled:opacity-50"
        >
          <RefreshCw size={14} /> Regenerar enlace
        </button>
        <p className="mt-1 text-xs text-[#9FB3C8]">
          Úsalo si el enlace llegó a alguien que no debía tenerlo.
        </p>
      </div>

      {error && <p className="text-sm text-[#FF6B5E]">{error}</p>}
      {ok && <p className="text-sm text-[#3DDC97]">{ok}</p>}
    </div>
  )
}