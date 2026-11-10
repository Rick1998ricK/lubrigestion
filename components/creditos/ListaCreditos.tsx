'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import FilaDeuda from './FilaDeuda'
import { diasDesde, soles, type Deuda } from '@/lib/creditos'

function waLink(celular: string | null, texto: string) {
  const d = (celular ?? '').replace(/\D/g, '')
  if (!d) return null
  return `https://wa.me/${d.length === 9 ? '51' + d : d}?text=${encodeURIComponent(texto)}`
}

export default function ListaCreditos({ deudas, hoy }: { deudas: Deuda[]; hoy: string }) {
  const router = useRouter()
  const [q, setQ] = useState('')

  const grupos = useMemo(() => {
    const m = new Map<number, { id: number; nombre: string; celular: string | null; deudas: Deuda[] }>()
    for (const d of deudas) {
      const g = m.get(d.cliente_id) ?? { id: d.cliente_id, nombre: d.nombres_apellidos, celular: d.celular, deudas: [] }
      g.deudas.push(d)
      m.set(d.cliente_id, g)
    }
    return [...m.values()]
      .map((g) => ({
        ...g,
        saldo: g.deudas.reduce((s, d) => s + d.saldo, 0),
        vencida: g.deudas.some((d) => d.fecha_prometida && d.fecha_prometida < hoy),
        dias: Math.max(...g.deudas.map((d) => diasDesde(d.fecha_venta))),
      }))
      .sort((a, b) => Number(b.vencida) - Number(a.vencida) || b.saldo - a.saldo)
  }, [deudas, hoy])

  const t = q.trim().toLowerCase()
  const visibles = t
    ? grupos.filter((g) => g.nombre.toLowerCase().includes(t) || (g.celular ?? '').includes(t))
    : grupos
  const totalGeneral = grupos.reduce((s, g) => s + g.saldo, 0)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-borde bg-tarjeta p-5">
          <p className="text-xs uppercase tracking-wider text-suave">Por cobrar</p>
          <p className="mt-1 font-display text-4xl font-bold text-acento">{soles(totalGeneral)}</p>
        </div>
        <div className="rounded-xl border border-borde bg-tarjeta p-5">
          <p className="text-xs uppercase tracking-wider text-suave">Clientes con crédito</p>
          <p className="mt-1 font-display text-4xl font-bold">{grupos.length}</p>
          <p className="text-xs text-suave">{grupos.filter((g) => g.vencida).length} con pagos vencidos</p>
        </div>
      </div>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre o celular…"
        className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-texto outline-none focus:border-acento"
      />

      {visibles.length === 0 ? (
        <p className="py-8 text-center text-suave">
          {grupos.length === 0 ? 'Nadie debe nada. Todo está cobrado.' : 'Sin resultados.'}
        </p>
      ) : (
        <div className="space-y-4">
          {visibles.map((g) => {
            const href = waLink(
              g.celular,
              `Hola ${g.nombre}, te recordamos que tienes un saldo pendiente de ${soles(g.saldo)} en el lubricentro. ¿Cuándo podemos coordinar el pago? Gracias.`,
            )
            return (
              <section
                key={g.id}
                className={`rounded-xl border bg-tarjeta p-5 ${g.vencida ? 'border-peligro' : 'border-borde'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-2xl font-semibold">{g.nombre}</h2>
                    <p className="text-sm text-suave">
                      {g.celular ?? 'Sin celular'} · deuda más antigua hace {g.dias} d
                      {g.vencida ? ' · pagos vencidos' : ''}
                    </p>
                    <div className="mt-1 flex gap-3 text-sm">
                      <Link href={`/clientes/${g.id}`} className="font-semibold text-acento hover:underline">
                        Ver cliente
                      </Link>
                      {href && (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-ok hover:underline"
                        >
                          <MessageCircle size={14} aria-hidden="true" /> Recordar por WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                  <p className="font-display text-3xl font-bold tabular-nums">{soles(g.saldo)}</p>
                </div>
                <ul className="mt-3 divide-y divide-borde/60">
                  {g.deudas.map((d) => (
                    <FilaDeuda key={`${d.venta_id}-${d.saldo}`} d={d} onCobrado={() => router.refresh()} />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}