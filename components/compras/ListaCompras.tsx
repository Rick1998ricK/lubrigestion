'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { DatosPedido } from './PedidoPDF'

type Compra = {
  id: number
  fecha_pedido: string
  condicion: string
  fecha_limite_pago: string | null
  pagado: boolean
  total: number
  documento: string | null
  proveedor: string
}

const NOMBRE_COND: Record<string, string> = {
  contado: 'Contado',
  credito: 'Crédito',
  contra_entrega: 'Contra entrega',
}

function diasPara(fecha: string) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const f = new Date(fecha + 'T00:00:00')
  return Math.round((f.getTime() - hoy.getTime()) / 86400000)
}

function Estado({ c }: { c: Compra }) {
  if (c.pagado)
    return <span className="rounded-full bg-[#3DDC97]/15 px-2 py-0.5 text-xs font-semibold text-[#3DDC97]">Pagada</span>
  if (!c.fecha_limite_pago) return null
  const d = diasPara(c.fecha_limite_pago)
  if (d < 0)
    return <span className="rounded-full bg-[#FF6B5E]/15 px-2 py-0.5 text-xs font-semibold text-[#FF6B5E]">Vencida hace {-d} d</span>
  if (d <= 3)
    return <span className="rounded-full bg-[#FFC107]/15 px-2 py-0.5 text-xs font-semibold text-[#FFC107]">{d === 0 ? 'Vence hoy' : `Vence en ${d} d`}</span>
  return <span className="rounded-full bg-[#17496B]/50 px-2 py-0.5 text-xs font-semibold text-[#9FB3C8]">Vence en {d} d</span>
}

export default function ListaCompras({
  compras,
  orgId,
  orgNombre,
}: {
  compras: Compra[]
  orgId: string
  orgNombre: string
}) {
  const router = useRouter()
  const [trabajando, setTrabajando] = useState<number | null>(null)
  const [error, setError] = useState('')

  const alertas = compras.filter(
    (c) => !c.pagado && c.fecha_limite_pago && diasPara(c.fecha_limite_pago) <= 3,
  )

  async function marcarPagada(id: number) {
    setTrabajando(id)
    setError('')
    const { error } = await createClient()
      .from('compras')
      .update({ pagado: true, fecha_pago: new Date().toISOString().slice(0, 10) })
      .eq('id', id)
    setTrabajando(null)
    if (error) return setError(error.message)
    router.refresh()
  }

  // Trae proveedor + items y arma los datos del PDF
  async function cargarPedido(id: number): Promise<DatosPedido> {
    const { data, error } = await createClient()
      .from('compras')
      .select(
        'id, fecha_pedido, condicion, fecha_limite_pago, medio_pago, documento, total, proveedores(razon_social, ruc, direccion, telefono, asesor_comercial), detalle_compra(cantidad, precio_compra, productos(nombre, viscosidad_codigo, marcas(nombre)))',
      )
      .eq('id', id)
      .single()
    if (error || !data) throw new Error(error?.message ?? 'No se encontró la compra')
    const c: any = data
    return {
      numero: c.id,
      fecha: c.fecha_pedido,
      orgNombre,
      proveedor: {
        razon_social: c.proveedores?.razon_social ?? 'Sin proveedor',
        ruc: c.proveedores?.ruc ?? null,
        direccion: c.proveedores?.direccion ?? null,
        telefono: c.proveedores?.telefono ?? null,
        asesor: c.proveedores?.asesor_comercial ?? null,
      },
      condicion: c.condicion,
      fechaLimite: c.fecha_limite_pago,
      medioPago: c.medio_pago,
      documento: c.documento,
      total: Number(c.total),
      items: (c.detalle_compra ?? []).map((d: any) => ({
        nombre: [d.productos?.marcas?.nombre, d.productos?.nombre, d.productos?.viscosidad_codigo]
          .filter(Boolean)
          .join(' · '),
        cantidad: Number(d.cantidad),
        precio: Number(d.precio_compra),
      })),
    }
  }

  async function generarPdf(datos: DatosPedido): Promise<Blob> {
    const { pdf } = await import('@react-pdf/renderer')
    const { default: PedidoPDF } = await import('./PedidoPDF')
    return pdf(<PedidoPDF datos={datos} /> as any).toBlob()
  }

  async function descargar(id: number) {
    setTrabajando(id)
    setError('')
    try {
      const datos = await cargarPedido(id)
      const blob = await generarPdf(datos)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pedido-${String(id).padStart(5, '0')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setTrabajando(null)
    }
  }

  async function enviar(id: number) {
    setError('')
    // Abrir la ventana ANTES del trabajo asíncrono evita el bloqueo de popups
    const ventana = window.open('', '_blank')
    setTrabajando(id)
    try {
      const datos = await cargarPedido(id)
      const tel = (datos.proveedor.telefono ?? '').replace(/\D/g, '')
      if (!tel) throw new Error('Este proveedor no tiene teléfono. Agrégalo en Proveedores.')

      const blob = await generarPdf(datos)
      const supabase = createClient()
      const ruta = `${orgId}/pedidos/pedido-${id}-${Date.now()}.pdf`
      const { error: e1 } = await supabase.storage
        .from('constancias')
        .upload(ruta, blob, { contentType: 'application/pdf' })
      if (e1) throw e1
      const { data: firmada, error: e2 } = await supabase.storage
        .from('constancias')
        .createSignedUrl(ruta, 60 * 60 * 24 * 30)
      if (e2 || !firmada) throw e2 ?? new Error('No se pudo crear el enlace')

      const saludo = datos.proveedor.asesor ? `Hola ${datos.proveedor.asesor}` : 'Hola'
      const msg = `${saludo}, te enviamos el pedido N° ${String(id).padStart(5, '0')} de ${orgNombre}. Puedes ver el detalle aquí: ${firmada.signedUrl}`
      const num = tel.length === 9 ? '51' + tel : tel
      const link = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
      if (ventana) ventana.location.href = link
      else window.location.href = link
    } catch (e: any) {
      ventana?.close()
      setError(e.message)
    } finally {
      setTrabajando(null)
    }
  }

  const btn =
    'inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold disabled:opacity-50'

  return (
    <section className="space-y-4">
      {alertas.length > 0 && (
        <div className="rounded-2xl border border-[#FFC107] bg-[#FFC107]/10 p-4 text-[#F1F5F9]">
          <p className="font-display text-xl uppercase tracking-wide text-[#FFC107]">
            {alertas.length} crédito{alertas.length > 1 ? 's' : ''} por pagar pronto
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {alertas.map((c) => (
              <li key={c.id}>
                {c.proveedor} — S/ {c.total.toFixed(2)} — {c.fecha_limite_pago}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="font-display text-2xl uppercase tracking-wide text-[#F1F5F9]">Últimas compras</h2>
      {error && <p className="text-sm text-[#FF6B5E]">{error}</p>}

      <div className="space-y-3">
        {compras.length === 0 && <p className="text-sm text-[#9FB3C8]">Aún no hay compras registradas.</p>}
        {compras.map((c) => (
          <div key={c.id} className="space-y-3 rounded-xl border border-[#17496B] bg-[#09243B] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#F1F5F9]">{c.proveedor}</p>
                <p className="text-xs text-[#9FB3C8]">
                  N° {String(c.id).padStart(5, '0')} · {c.fecha_pedido} · {NOMBRE_COND[c.condicion]}
                  {c.documento ? ` · ${c.documento}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Estado c={c} />
                <span className="font-display text-2xl text-[#FFC107]">S/ {c.total.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => descargar(c.id)}
                disabled={trabajando === c.id}
                className={`${btn} border-[#17496B] text-[#F1F5F9] hover:border-[#FFC107]`}
              >
                <Download size={15} /> {trabajando === c.id ? '…' : 'PDF del pedido'}
              </button>
              <button
                onClick={() => enviar(c.id)}
                disabled={trabajando === c.id}
                className={`${btn} border-[#3DDC97] text-[#3DDC97] hover:bg-[#3DDC97] hover:text-[#061626]`}
              >
                <MessageCircle size={15} /> Enviar al proveedor
              </button>
              {!c.pagado && (
                <button
                  onClick={() => marcarPagada(c.id)}
                  disabled={trabajando === c.id}
                  className={`${btn} border-[#FFC107] text-[#FFC107] hover:bg-[#FFC107] hover:text-[#061626]`}
                >
                  Marcar pagada
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}