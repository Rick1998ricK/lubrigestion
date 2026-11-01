import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

export type DatosPedido = {
  numero: number
  fecha: string
  orgNombre: string
  proveedor: {
    razon_social: string
    ruc: string | null
    direccion: string | null
    telefono: string | null
    asesor: string | null
  }
  condicion: string
  fechaLimite: string | null
  medioPago: string | null
  documento: string | null
  items: { nombre: string; cantidad: number; precio: number }[]
  total: number
}

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: 'Helvetica', color: '#1F2A2E' },
  banda: { backgroundColor: '#FFC107', padding: 14, borderRadius: 4, marginBottom: 16 },
  titulo: { fontSize: 20, fontFamily: 'Helvetica-Bold' },
  sub: { fontSize: 10, marginTop: 2 },
  bloque: { marginBottom: 14 },
  h: { fontSize: 9, color: '#52606D', textTransform: 'uppercase', marginBottom: 3, fontFamily: 'Helvetica-Bold' },
  fila: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#C9D1D6', paddingVertical: 5 },
  cab: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: '#1F2A2E', paddingBottom: 4 },
  cProd: { flex: 1 },
  cCant: { width: 50, textAlign: 'right' },
  cPrec: { width: 70, textAlign: 'right' },
  cSub: { width: 80, textAlign: 'right' },
  total: { marginTop: 10, alignSelf: 'flex-end', fontSize: 14, fontFamily: 'Helvetica-Bold' },
  pie: { position: 'absolute', bottom: 28, left: 36, right: 36, fontSize: 8, color: '#52606D' },
})

const money = (n: number) => 'S/ ' + n.toFixed(2)
const COND: Record<string, string> = { contado: 'Contado', credito: 'Crédito', contra_entrega: 'Contra entrega' }
const MEDIO: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', yape_plin: 'Yape / Plin',
}

export default function PedidoPDF({ datos: d }: { datos: DatosPedido }) {
  return (
    <Document title={`Pedido ${d.numero}`}>
      <Page size="A4" style={s.page}>
        <View style={s.banda}>
          <Text style={s.titulo}>Pedido de productos N° {String(d.numero).padStart(5, '0')}</Text>
          <Text style={s.sub}>{d.orgNombre} · Fecha: {d.fecha}</Text>
        </View>

        <View style={s.bloque}>
          <Text style={s.h}>Proveedor</Text>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 12 }}>{d.proveedor.razon_social}</Text>
          {d.proveedor.ruc && <Text>RUC: {d.proveedor.ruc}</Text>}
          {d.proveedor.direccion && <Text>Dirección: {d.proveedor.direccion}</Text>}
          {d.proveedor.telefono && <Text>Teléfono: {d.proveedor.telefono}</Text>}
          {d.proveedor.asesor && <Text>Asesor comercial: {d.proveedor.asesor}</Text>}
        </View>

        <View style={s.bloque}>
          <Text style={s.h}>Condiciones</Text>
          <Text>Condición de compra: {COND[d.condicion] ?? d.condicion}</Text>
          {d.fechaLimite && <Text>Fecha límite de pago: {d.fechaLimite}</Text>}
          {d.medioPago && <Text>Medio de pago: {MEDIO[d.medioPago] ?? d.medioPago}</Text>}
          {d.documento && <Text>Documento: {d.documento}</Text>}
        </View>

        <View style={s.cab}>
          <Text style={[s.cProd, { fontFamily: 'Helvetica-Bold' }]}>Producto</Text>
          <Text style={[s.cCant, { fontFamily: 'Helvetica-Bold' }]}>Cant.</Text>
          <Text style={[s.cPrec, { fontFamily: 'Helvetica-Bold' }]}>P. unit.</Text>
          <Text style={[s.cSub, { fontFamily: 'Helvetica-Bold' }]}>Subtotal</Text>
        </View>
        {d.items.map((it, i) => (
          <View key={i} style={s.fila} wrap={false}>
            <Text style={s.cProd}>{it.nombre}</Text>
            <Text style={s.cCant}>{it.cantidad}</Text>
            <Text style={s.cPrec}>{money(it.precio)}</Text>
            <Text style={s.cSub}>{money(it.cantidad * it.precio)}</Text>
          </View>
        ))}
        <Text style={s.total}>Total: {money(d.total)}</Text>

        <Text style={s.pie} fixed>
          Documento de pedido generado por LubriGestión. No es comprobante de pago.
        </Text>
      </Page>
    </Document>
  )
}