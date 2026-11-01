'use client'

import { useState } from 'react'
import { Camera, X } from 'lucide-react'
import { comprimirImagen } from '@/lib/imagen'

export type FotoLocal = { id: string; blob: Blob; dataUrl: string }

const MAX_FOTOS = 4

export default function FotosVehiculo({
  fotos,
  onChange,
}: {
  fotos: FotoLocal[]
  onChange: (f: FotoLocal[]) => void
}) {
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')

  async function agregar(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (archivos.length === 0) return
    setError('')
    setProcesando(true)
    try {
      const libres = MAX_FOTOS - fotos.length
      const nuevas: FotoLocal[] = []
      for (const f of archivos.slice(0, libres)) {
        const { blob, dataUrl } = await comprimirImagen(f)
        nuevas.push({ id: crypto.randomUUID(), blob, dataUrl })
      }
      if (archivos.length > libres) setError(`Máximo ${MAX_FOTOS} fotos por servicio.`)
      onChange([...fotos, ...nuevas])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la foto.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Fotos del vehículo</span>
        <span className="text-xs text-suave">{fotos.length}/{MAX_FOTOS} · se envían al cliente en el PDF</span>
      </div>

      <div className="flex flex-wrap gap-3">
        {fotos.map((f) => (
          <div key={f.id} className="relative size-24 overflow-hidden rounded-lg border border-borde">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.dataUrl} alt="Foto del vehículo" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(fotos.filter((x) => x.id !== f.id))}
              aria-label="Quitar foto"
              className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/70 text-white"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}

        {fotos.length < MAX_FOTOS && (
          <label className="grid size-24 cursor-pointer place-items-center rounded-lg border border-dashed border-borde text-center text-xs text-suave hover:border-acento hover:text-acento">
            <span className="flex flex-col items-center gap-1">
              <Camera size={22} aria-hidden="true" />
              {procesando ? 'Procesando…' : 'Agregar'}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={agregar}
              disabled={procesando}
            />
          </label>
        )}
      </div>

      {error && <p className="text-xs text-peligro">{error}</p>}
    </div>
  )
}