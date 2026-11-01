'use client'
import { useState } from 'react'
import { Download, Eye, FileText, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ResumenVenta } from './tipos'

const soles = (n: number) => `S/ ${n.toFixed(2)}`

async function generarPdf(r: ResumenVenta): Promise<Blob> {
  const [{ pdf }, { default: ComprobantePDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./ComprobantePDF'),
  ])
  return pdf(<ComprobantePDF r={r} />).toBlob()
}

export default function PanelResultado({ r, orgId }: { r: ResumenVenta; orgId: string }) {
  const [trabajando, setTrabajando] = useState<'ver' | 'bajar' | 'wa' | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enlace, setEnlace] = useState<string | null>(null)

  const numero = String(r.ventaId).padStart(5, '0')
  const archivo = `constancia-${numero}.pdf`
  const digitos = r.cliente.celular.replace(/\D/g, '')
  const numeroWa = digitos.length === 9 ? `51${digitos}` : digitos

  async function ver() {
    const w = window.open('', '_blank') // se abre antes para que no lo bloquee el navegador
    setTrabajando('ver')
    setAviso(null)
    try {
      const url = URL.createObjectURL(await generarPdf(r))
      if (w) w.location.href = url
      else setAviso('El navegador bloqueó la ventana. Usa Descargar.')
    } catch {
      w?.close()
      setAviso('No se pudo generar el PDF.')
    } finally {
      setTrabajando(null)
    }
  }

  async function descargar() {
    setTrabajando('bajar')
    setAviso(null)
    try {
      const url = URL.createObjectURL(await generarPdf(r))
      const a = document.createElement('a')
      a.href = url
      a.download = archivo
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setAviso('No se pudo generar el PDF.')
    } finally {
      setTrabajando(null)
    }
  }

  async function enviarWhatsApp() {
    if (!digitos) {
      setAviso('El cliente no tiene celular registrado.')
      return
    }
    const w = window.open('', '_blank')
    setTrabajando('wa')
    setAviso(null)
    setEnlace(null)
    try {
      const blob = await generarPdf(r)
      const ruta = `${orgId}/${numero}-${crypto.randomUUID()}.pdf`
      const supabase = createClient()

      const { error: errSubida } = await supabase.storage
        .from('constancias')
        .upload(ruta, blob, { contentType: 'application/pdf' })
      if (errSubida) throw errSubida

      const { data, error: errEnlace } = await supabase.storage
        .from('constancias')
        .createSignedUrl(ruta, 60 * 60 * 24 * 30)
      if (errEnlace || !data) throw errEnlace ?? new Error('No se pudo crear el enlace')

      const partes = [
        `Hola ${r.cliente.nombre}, tu ${r.vehiculo.modelo || 'vehículo'} (${r.vehiculo.placa}) ya está listo.`,
        `Aquí está tu constancia de servicio: ${data.signedUrl}`,
      ]
      if (r.vehiculo.kmProximo) {
        partes.push(`Tu próximo cambio es a los ${r.vehiculo.kmProximo.toLocaleString('es-PE')} km.`)
      }
      partes.push('Gracias por visitarnos.')

      const url = `https://wa.me/${numeroWa}?text=${encodeURIComponent(partes.join('\n\n'))}`
      if (w) w.location.href = url
      else setEnlace(url)
    } catch (e) {
      w?.close()
      setAviso(e instanceof Error ? e.message : 'No se pudo enviar la constancia.')
    } finally {
      setTrabajando(null)
    }
  }

  const botonSec =
    'flex flex-1 items-center justify-center gap-2 rounded-lg border border-borde py-2 text-sm font-semibold hover:border-acento disabled:opacity-60'

  return (
    <div className="space-y-3 rounded-lg border border-ok/40 bg-ok/10 p-4">
      <p className="text-sm font-semibold text-ok">Venta registrada por {soles(r.total)}</p>

      <div className="rounded-lg border border-borde bg-fondo p-3">
        <div className="flex items-center gap-3">
          <FileText size={28} className="shrink-0 text-acento" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{archivo}</p>
            <p className="text-xs text-suave">Constancia de servicio · {soles(r.total)}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={ver} disabled={trabajando !== null} className={botonSec}>
            <Eye size={16} aria-hidden="true" /> {trabajando === 'ver' ? 'Abriendo...' : 'Ver'}
          </button>
          <button type="button" onClick={descargar} disabled={trabajando !== null} className={botonSec}>
            <Download size={16} aria-hidden="true" /> {trabajando === 'bajar' ? 'Generando...' : 'Descargar'}
          </button>
        </div>
      </div>

      <button type="button" onClick={enviarWhatsApp} disabled={trabajando !== null || !digitos}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-acento py-3 text-sm font-bold text-fondo disabled:opacity-60">
        <MessageCircle size={18} aria-hidden="true" />
        {trabajando === 'wa' ? 'Preparando...' : 'Enviar constancia por WhatsApp'}
      </button>
      <p className="text-xs text-suave">
        {digitos
          ? `Se abrirá el chat con ${r.cliente.celular}, con el enlace al PDF listo para enviar.`
          : 'Este cliente no tiene celular registrado, así que no se puede enviar por WhatsApp.'}
      </p>

      {aviso && <p className="text-xs text-peligro">{aviso}</p>}
      {enlace && (
        <a href={enlace} target="_blank" rel="noopener noreferrer" className="block text-sm font-semibold text-acento underline">
          El navegador bloqueó la ventana: toca aquí para abrir WhatsApp
        </a>
      )}
    </div>
  )
}