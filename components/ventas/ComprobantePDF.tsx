import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { ResumenVenta } from './tipos'
import type { MedicionResumen } from '@/lib/mediciones'

const C = { acento: '#FFC107', tinta: '#1F2A2E', suave: '#55646A', linea: '#C3CBC6' }
const COL: Record<string, string> = { bueno: '#2E9E6B', regular: '#E0A100', malo: '#D64545' }
const ETQ: Record<string, string> = {
  bueno: 'Bueno', regular: 'Regular', malo: 'Malo', no_revisado: 'No se realizó',
}

const s = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 10, color: C.tinta },
  barra: { height: 5, backgroundColor: C.acento, marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  org: { fontFamily: 'Helvetica-Bold', fontSize: 20 },
  num: { fontFamily: 'Helvetica-Bold', fontSize: 14 },
  suave: { color: C.suave, marginTop: 2 },
  fila2: { flexDirection: 'row', gap: 24, marginBottom: 16 },
  bloque: { flex: 1 },
  titulo: { fontFamily: 'Helvetica-Bold', fontSize: 11, marginBottom: 5 },
  linea: { marginBottom: 2 },
  thead: { flexDirection: 'row', backgroundColor: C.tinta, color: '#FFFFFF', padding: 6, fontFamily: 'Helvetica-Bold' },
  tr: { flexDirection: 'row', padding: 6, borderBottomWidth: 0.5, borderBottomColor: C.linea },
  cDesc: { flex: 1 },
  cCant: { width: 40, textAlign: 'right' },
  cPrecio: { width: 70, textAlign: 'right' },
  cSub: { width: 70, textAlign: 'right' },
  totalFila: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  totalTxt: { fontFamily: 'Helvetica-Bold', fontSize: 15 },
  ficha: { marginTop: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  celda: { width: '50%', marginBottom: 3 },
  stickerWrap: { marginTop: 20, width: 230, backgroundColor: C.acento, padding: 6, borderRadius: 8 },
  sticker: { borderWidth: 1.5, borderColor: C.tinta, borderStyle: 'dashed', borderRadius: 5, padding: 10 },
  stickerKm: { fontFamily: 'Helvetica-Bold', fontSize: 30, marginVertical: 2 },
  pie: { marginTop: 24, fontSize: 8, color: C.suave },
})

const soles = (n: number) => `S/ ${n.toFixed(2)}`
const fechaCorta = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}

function Barra({ m }: { m: MedicionResumen }) {
  const rango = m.max - m.min
  const pct =
    m.valor == null ? null : Math.min(100, Math.max(0, ((m.valor - m.min) / rango) * 100))
  return (
    <View style={{ marginBottom: 9 }} wrap={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>
          {m.label}{m.valor != null ? `: ${m.valor} ${m.unidad}` : ''}
        </Text>
        <Text style={{ fontFamily: 'Helvetica-Bold', color: COL[m.estado] ?? C.suave }}>
          {ETQ[m.estado]}
        </Text>
      </View>
      {pct !== null && (
        <View style={{ height: 14, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', height: 7 }}>
            {m.zonas.map((z, i) => (
              <View
                key={i}
                style={{ width: `${((z.hasta - z.desde) / rango) * 100}%`, backgroundColor: COL[z.estado] }}
              />
            ))}
          </View>
          <View
            style={{ position: 'absolute', left: `${pct}%`, top: 0, width: 2, height: 14, backgroundColor: C.tinta }}
          />
        </View>
      )}
    </View>
  )
}

export default function ComprobantePDF({ r }: { r: ResumenVenta }) {
  const numero = String(r.ventaId).padStart(5, '0')

  return (
    <Document title={`Constancia de servicio ${numero}`}>
      <Page size="A4" style={s.page}>
        <View style={s.barra} />

        <View style={s.header}>
          <View>
            <Text style={s.org}>{r.org}</Text>
            <Text style={s.suave}>Constancia de servicio</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.num}>N.º {numero}</Text>
            <Text style={s.suave}>{fechaCorta(r.fecha)}</Text>
          </View>
        </View>

        <View style={s.fila2}>
          <View style={s.bloque}>
            <Text style={s.titulo}>Cliente</Text>
            <Text style={s.linea}>{r.cliente.nombre}</Text>
            {r.cliente.celular ? <Text style={s.linea}>Cel. {r.cliente.celular}</Text> : null}
            {r.cliente.correo ? <Text style={s.linea}>{r.cliente.correo}</Text> : null}
          </View>
          <View style={s.bloque}>
            <Text style={s.titulo}>Vehículo</Text>
            <Text style={s.linea}>{r.vehiculo.modelo || '—'}</Text>
            <Text style={s.linea}>Placa {r.vehiculo.placa}</Text>
            {r.vehiculo.kmActual != null ? (
              <Text style={s.linea}>Kilometraje: {r.vehiculo.kmActual.toLocaleString('es-PE')} km</Text>
            ) : null}
          </View>
        </View>

        <View style={s.thead}>
          <Text style={s.cDesc}>Descripción</Text>
          <Text style={s.cCant}>Cant.</Text>
          <Text style={s.cPrecio}>P. unit.</Text>
          <Text style={s.cSub}>Subtotal</Text>
        </View>
        {r.lineas.map((l, i) => (
          <View key={i} style={s.tr} wrap={false}>
            <Text style={s.cDesc}>{l.nombre}{l.bonificacion ? ' (bonificación)' : ''}</Text>
            <Text style={s.cCant}>{l.cantidad}</Text>
            <Text style={s.cPrecio}>{l.bonificacion ? '—' : soles(l.precio)}</Text>
            <Text style={s.cSub}>{soles(l.bonificacion ? 0 : l.precio * l.cantidad)}</Text>
          </View>
        ))}
        <View style={s.totalFila}>
          <Text style={s.totalTxt}>Total {soles(r.total)}</Text>
        </View>

        <View style={s.ficha} wrap={false}>
          <Text style={s.titulo}>Ficha de mantenimiento</Text>
          <View style={s.grid}>
            <Text style={s.celda}>Aceite: {[r.ficha.marcaAceite, r.ficha.viscosidad].filter(Boolean).join(' ') || '—'}</Text>
            {r.ficha.filtros.map((f) => (
              <Text key={f.label} style={s.celda}>{f.label}: {f.valor}</Text>
            ))}
            {r.ficha.estados.map((e) => (
              <Text key={e.label} style={s.celda}>{e.label}: {e.valor}</Text>
            ))}
          </View>
          {r.ficha.mediciones && r.ficha.mediciones.some((m) => m.estado !== 'no_revisado') ? (
            <View style={{ marginTop: 10 }}>
              <Text style={s.titulo}>Revisión de componentes</Text>
              {r.ficha.mediciones
                .filter((m) => m.estado !== 'no_revisado')
                .map((m) => <Barra key={m.label} m={m} />)}
            </View>
          ) : null}
          {r.ficha.comentarios ? (
            <Text style={{ marginTop: 6 }}>Recomendaciones: {r.ficha.comentarios}</Text>
          ) : null}
        </View>

        {r.fotos && r.fotos.length > 0 ? (
          <View style={{ marginTop: 18 }}>
            <Text style={s.titulo}>Fotos del vehículo</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {r.fotos.map((src, i) => (
                <Image
                  key={i}
                  src={src}
                  style={{ width: '48.5%', height: 160, objectFit: 'cover', borderRadius: 4 }}
                />
              ))}
            </View>
          </View>
        ) : null}

        {r.vehiculo.kmProximo ? (
          <View style={s.stickerWrap} wrap={false}>
            <View style={s.sticker}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11 }}>Próximo cambio de aceite</Text>
              <Text style={s.stickerKm}>{r.vehiculo.kmProximo.toLocaleString('es-PE')} km</Text>
              <Text>Placa {r.vehiculo.placa} · {fechaCorta(r.fecha)}</Text>
            </View>
          </View>
        ) : null}

        <Text style={s.pie}>
          Constancia de servicio del lubricentro. No reemplaza a la boleta o factura electrónica.
        </Text>
      </Page>
    </Document>
  )
}