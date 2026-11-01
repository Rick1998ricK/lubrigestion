import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'
import { cargarTipos } from '@/lib/tipos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TIPOS: Record<string, string> = {
  lubricante: 'Lubricante', filtro_aceite: 'Filtro de aceite', filtro_aire: 'Filtro de aire',
  filtro_combustible: 'Filtro de combustible', filtro_cabina: 'Filtro de cabina',
  aditivo: 'Aditivo', accesorio_electrico: 'Accesorio eléctrico', repuesto: 'Repuesto',
}
const COND: Record<string, string> = { contado: 'Contado', credito: 'Crédito', contra_entrega: 'Contra entrega' }
const MEDIO: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', yape_plin: 'Yape / Plin',
}
const GASTO: Record<string, string> = { alquiler: 'Alquiler', agua: 'Agua', luz: 'Luz', flete: 'Flete', otro: 'Otro' }

type Col = { header: string; key: string; width: number; tipo?: 'dinero' | 'fecha' | 'fechahora' | 'entero' }
const FMT = { dinero: '#,##0.00', fecha: 'dd/mm/yyyy', fechahora: 'dd/mm/yyyy hh:mm', entero: '0' }

const err = (m: string, status: number) => Response.json({ error: m }, { status })
const re = /^\d{4}-\d{2}-\d{2}$/
const iso = (d: Date) => d.toISOString().slice(0, 10)
const sumarDia = (f: string) => {
  const d = new Date(f + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return iso(d)
}
// Excel guarda fechas "sin zona": desplazamos para que se vea la hora de Perú
const dFecha = (s?: string | null) => (s ? new Date(s + 'T00:00:00Z') : null)
const dHora = (ts: string) => new Date(new Date(ts).getTime() - 5 * 3600e3)
const nombreProd = (p: any) => [p?.marcas?.nombre, p?.nombre, p?.viscosidad_codigo].filter(Boolean).join(' · ')

// PostgREST devuelve máximo 1000 filas por consulta: se pagina
async function traer(build: (a: number, b: number) => PromiseLike<{ data: any[] | null; error: any }>) {
  const out: any[] = []
  for (let i = 0; ; i += 1000) {
    const { data, error } = await build(i, i + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

function hoja(wb: ExcelJS.Workbook, nombre: string, cols: Col[], filas: Record<string, any>[]) {
  const ws = wb.addWorksheet(nombre, { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width }))
  const cab = ws.getRow(1)
  cab.font = { bold: true, color: { argb: 'FF061626' } }
  cab.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC107' } }
  filas.forEach((f) => {
    const row = ws.addRow(f)
    cols.forEach((c, i) => {
      if (c.tipo) row.getCell(i + 1).numFmt = FMT[c.tipo]
    })
  })
  if (filas.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } }
  return ws
}

export async function GET(req: Request, { params }: { params: Promise<{ tipo: string }> }) {
  try {
    const { tipo } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return err('No autenticado', 401)
    const { data: perfil } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
    const admin = perfil?.rol === 'admin'
    if (['compras', 'gastos', 'resumen'].includes(tipo) && !admin)
      return err('Solo el administrador puede exportar esto', 403)
    if (!['inventario', 'ventas', 'clientes', 'compras', 'gastos', 'resumen'].includes(tipo))
      return err('Tipo de exportación no válido', 404)

    const q = new URL(req.url).searchParams
    const hoy = iso(new Date(Date.now() - 5 * 3600e3))
    const desde = re.test(q.get('desde') ?? '') ? q.get('desde')! : hoy.slice(0, 8) + '01'
    const hasta = re.test(q.get('hasta') ?? '') ? q.get('hasta')! : hoy
    if (desde > hasta) return err('La fecha inicial es mayor que la final', 400)
    const ini = `${desde}T00:00:00-05:00`
    const fin = `${sumarDia(hasta)}T00:00:00-05:00`

    const wb = new ExcelJS.Workbook()
    wb.creator = 'LubriGestión'
    let archivo = `${tipo}.xlsx`

    // ------------------------------------------------ INVENTARIO
    if (tipo === 'inventario') {
      const nombresTipo: Record<string, string> = {
        ...TIPOS,
        ...Object.fromEntries((await cargarTipos(supabase)).map((t) => [t.clave, t.nombre])),
      }
      const filas = admin
        ? (await traer((a, b) =>
            supabase.from('productos')
              .select('nombre, tipo, viscosidad_codigo, stock, precio_compra, precio_venta, marcas(nombre)')
              .order('tipo').order('nombre').range(a, b))).map((p: any) => ({
            nombre: p.nombre, tipo: nombresTipo[p.tipo] ?? p.tipo, marca: p.marcas?.nombre ?? '',
            codigo: p.viscosidad_codigo ?? '', stock: p.stock,
            compra: Number(p.precio_compra), venta: Number(p.precio_venta),
            margen: Number(p.precio_venta) - Number(p.precio_compra),
            valor: p.stock * Number(p.precio_compra),
          }))
        : (await traer((a, b) =>
            supabase.from('productos_publico')
              .select('nombre, tipo, marca, viscosidad_codigo, stock, precio_venta')
              .order('tipo').order('nombre').range(a, b))).map((p: any) => ({
            nombre: p.nombre, tipo: nombresTipo[p.tipo] ?? p.tipo, marca: p.marca ?? '',
            codigo: p.viscosidad_codigo ?? '', stock: p.stock, venta: Number(p.precio_venta),
          }))
      const cols: Col[] = [
        { header: 'Producto', key: 'nombre', width: 38 }, { header: 'Tipo', key: 'tipo', width: 22 },
        { header: 'Marca', key: 'marca', width: 16 }, { header: 'Viscosidad / código', key: 'codigo', width: 18 },
        { header: 'Stock', key: 'stock', width: 9, tipo: 'entero' },
      ]
      if (admin) cols.push({ header: 'Precio compra', key: 'compra', width: 14, tipo: 'dinero' })
      cols.push({ header: 'Precio venta', key: 'venta', width: 14, tipo: 'dinero' })
      if (admin) {
        cols.push({ header: 'Margen unitario', key: 'margen', width: 15, tipo: 'dinero' })
        cols.push({ header: 'Valor del stock (al costo)', key: 'valor', width: 22, tipo: 'dinero' })
      }
      hoja(wb, 'Inventario', cols, filas)
      archivo = `inventario_${hoy}.xlsx`
    }

    // ------------------------------------------------ CLIENTES
    if (tipo === 'clientes') {
      const data = await traer((a, b) =>
        supabase.from('clientes')
          .select('nombres_apellidos, celular, correo, visitas_count, cliente_frecuente, vehiculos(placa, vehiculo_modelo, kilometraje_actual, proximo_cambio_km)')
          .order('nombres_apellidos').range(a, b))
      const filas: any[] = []
      data.forEach((c: any) => {
        const base = {
          nombre: c.nombres_apellidos, celular: c.celular ?? '', correo: c.correo ?? '',
          visitas: c.visitas_count, frecuente: c.cliente_frecuente ? 'Sí' : 'No',
        }
        const vs: any[] = c.vehiculos?.length ? c.vehiculos : [null]
        vs.forEach((v) =>
          filas.push({ ...base, placa: v?.placa ?? '', modelo: v?.vehiculo_modelo ?? '', km: v?.kilometraje_actual ?? null, prox: v?.proximo_cambio_km ?? null }))
      })
      hoja(wb, 'Clientes', [
        { header: 'Cliente', key: 'nombre', width: 30 }, { header: 'Celular', key: 'celular', width: 14 },
        { header: 'Correo', key: 'correo', width: 28 }, { header: 'Visitas', key: 'visitas', width: 9, tipo: 'entero' },
        { header: 'Frecuente', key: 'frecuente', width: 11 }, { header: 'Placa', key: 'placa', width: 11 },
        { header: 'Vehículo', key: 'modelo', width: 24 }, { header: 'Km actual', key: 'km', width: 11, tipo: 'entero' },
        { header: 'Próximo cambio (km)', key: 'prox', width: 19, tipo: 'entero' },
      ], filas)
      archivo = `clientes_${hoy}.xlsx`
    }

    // ------------------------------------------------ VENTAS
    if (tipo === 'ventas') {
      const data = await traer((a, b) =>
        supabase.from('ventas')
          .select('id, fecha_venta, total, medio_pago, anulada, motivo_anulacion, clientes(nombres_apellidos, celular), mantenimientos(vehiculos(placa, vehiculo_modelo)), detalle_venta(cantidad, precio_venta, es_bonificacion, tipo_item, costo_unitario, productos(nombre, viscosidad_codigo, marcas(nombre)), servicios(nombre))')
          .gte('fecha_venta', ini).lt('fecha_venta', fin)
          .order('fecha_venta').order('id').range(a, b))

      const ventas: any[] = []
      const detalle: any[] = []
      data.forEach((v: any) => {
        const estado = v.anulada ? 'ANULADA' : 'Válida'
        const desc = (d: any) => (d.tipo_item === 'servicio' ? d.servicios?.nombre ?? 'Servicio' : nombreProd(d.productos))
        ventas.push({
          id: v.id, fecha: dHora(v.fecha_venta), cliente: v.clientes?.nombres_apellidos ?? '',
          celular: v.clientes?.celular ?? '', placa: v.mantenimientos?.vehiculos?.placa ?? '',
          vehiculo: v.mantenimientos?.vehiculos?.vehiculo_modelo ?? '',
          medio: MEDIO[v.medio_pago] ?? v.medio_pago, total: Number(v.total),
          valido: v.anulada ? 0 : Number(v.total), estado, motivo: v.motivo_anulacion ?? '',
          detalle: (v.detalle_venta ?? []).map((d: any) => `${d.cantidad} × ${desc(d)}${d.es_bonificacion ? ' (bonif.)' : ''}`).join(' | '),
        })
        ;(v.detalle_venta ?? []).forEach((d: any) => {
          const sub = d.es_bonificacion ? 0 : Number(d.precio_venta) * Number(d.cantidad)
          const costo = d.tipo_item === 'producto' ? Number(d.costo_unitario ?? 0) * Number(d.cantidad) : 0
          detalle.push({
            id: v.id, fecha: dHora(v.fecha_venta), cliente: v.clientes?.nombres_apellidos ?? '',
            tipo: d.tipo_item === 'servicio' ? 'Servicio' : 'Producto', desc: desc(d),
            cant: Number(d.cantidad), precio: Number(d.precio_venta), sub,
            bonif: d.es_bonificacion ? 'Sí' : 'No', estado, costo, gan: sub - costo,
          })
        })
      })

      hoja(wb, 'Ventas', [
        { header: 'N°', key: 'id', width: 8, tipo: 'entero' }, { header: 'Fecha y hora', key: 'fecha', width: 18, tipo: 'fechahora' },
        { header: 'Cliente', key: 'cliente', width: 28 }, { header: 'Celular', key: 'celular', width: 13 },
        { header: 'Placa', key: 'placa', width: 10 }, { header: 'Vehículo', key: 'vehiculo', width: 22 },
        { header: 'Medio de pago', key: 'medio', width: 15 }, { header: 'Total', key: 'total', width: 12, tipo: 'dinero' },
        { header: 'Total válido', key: 'valido', width: 13, tipo: 'dinero' }, { header: 'Estado', key: 'estado', width: 10 },
        { header: 'Motivo de anulación', key: 'motivo', width: 24 }, { header: 'Detalle', key: 'detalle', width: 60 },
      ], ventas)

      const colsDet: Col[] = [
        { header: 'N° venta', key: 'id', width: 9, tipo: 'entero' }, { header: 'Fecha y hora', key: 'fecha', width: 18, tipo: 'fechahora' },
        { header: 'Cliente', key: 'cliente', width: 26 }, { header: 'Tipo', key: 'tipo', width: 10 },
        { header: 'Descripción', key: 'desc', width: 40 }, { header: 'Cant.', key: 'cant', width: 7, tipo: 'entero' },
        { header: 'Precio unit.', key: 'precio', width: 12, tipo: 'dinero' }, { header: 'Subtotal', key: 'sub', width: 12, tipo: 'dinero' },
        { header: 'Bonificación', key: 'bonif', width: 12 }, { header: 'Estado', key: 'estado', width: 10 },
      ]
      if (admin) {
        colsDet.push({ header: 'Costo', key: 'costo', width: 11, tipo: 'dinero' })
        colsDet.push({ header: 'Ganancia', key: 'gan', width: 11, tipo: 'dinero' })
      }
      hoja(wb, 'Detalle', colsDet, detalle)
      archivo = `ventas_${desde}_a_${hasta}.xlsx`
    }

    // ------------------------------------------------ COMPRAS
    if (tipo === 'compras') {
      const data = await traer((a, b) =>
        supabase.from('compras')
          .select('id, fecha_pedido, condicion, fecha_limite_pago, pagado, fecha_pago, medio_pago, documento, total, proveedores(razon_social, ruc), detalle_compra(cantidad, precio_compra, productos(nombre, viscosidad_codigo, marcas(nombre)))')
          .gte('fecha_pedido', desde).lte('fecha_pedido', hasta)
          .order('fecha_pedido').order('id').range(a, b))
      const compras: any[] = []
      const detalle: any[] = []
      data.forEach((c: any) => {
        compras.push({
          id: c.id, fecha: dFecha(c.fecha_pedido), prov: c.proveedores?.razon_social ?? '', ruc: c.proveedores?.ruc ?? '',
          cond: COND[c.condicion] ?? c.condicion, limite: dFecha(c.fecha_limite_pago), pagado: c.pagado ? 'Sí' : 'No',
          fpago: dFecha(c.fecha_pago), medio: MEDIO[c.medio_pago] ?? '', doc: c.documento ?? '', total: Number(c.total),
        })
        ;(c.detalle_compra ?? []).forEach((d: any) =>
          detalle.push({
            id: c.id, fecha: dFecha(c.fecha_pedido), prov: c.proveedores?.razon_social ?? '', prod: nombreProd(d.productos),
            cant: Number(d.cantidad), precio: Number(d.precio_compra), sub: Number(d.cantidad) * Number(d.precio_compra),
          }))
      })
      hoja(wb, 'Compras', [
        { header: 'N°', key: 'id', width: 8, tipo: 'entero' }, { header: 'Fecha pedido', key: 'fecha', width: 13, tipo: 'fecha' },
        { header: 'Proveedor', key: 'prov', width: 30 }, { header: 'RUC', key: 'ruc', width: 13 },
        { header: 'Condición', key: 'cond', width: 14 }, { header: 'Límite de pago', key: 'limite', width: 14, tipo: 'fecha' },
        { header: 'Pagada', key: 'pagado', width: 9 }, { header: 'Fecha de pago', key: 'fpago', width: 13, tipo: 'fecha' },
        { header: 'Medio de pago', key: 'medio', width: 14 }, { header: 'Documento', key: 'doc', width: 16 },
        { header: 'Total', key: 'total', width: 12, tipo: 'dinero' },
      ], compras)
      hoja(wb, 'Detalle', [
        { header: 'N° compra', key: 'id', width: 10, tipo: 'entero' }, { header: 'Fecha', key: 'fecha', width: 12, tipo: 'fecha' },
        { header: 'Proveedor', key: 'prov', width: 28 }, { header: 'Producto', key: 'prod', width: 40 },
        { header: 'Cant.', key: 'cant', width: 7, tipo: 'entero' }, { header: 'Precio unit.', key: 'precio', width: 12, tipo: 'dinero' },
        { header: 'Subtotal', key: 'sub', width: 12, tipo: 'dinero' },
      ], detalle)
      archivo = `compras_${desde}_a_${hasta}.xlsx`
    }

    // ------------------------------------------------ GASTOS
    if (tipo === 'gastos') {
      const data = await traer((a, b) =>
        supabase.from('gastos')
          .select('fecha, tipo, proveedor_beneficiario, ruc, documento, medio_pago, monto, descripcion, anulado')
          .gte('fecha', desde).lte('fecha', hasta).order('fecha').order('id').range(a, b))
      hoja(wb, 'Gastos', [
        { header: 'Fecha', key: 'fecha', width: 12, tipo: 'fecha' }, { header: 'Tipo', key: 'tipo', width: 12 },
        { header: 'Beneficiario', key: 'ben', width: 28 }, { header: 'RUC', key: 'ruc', width: 13 },
        { header: 'Documento', key: 'doc', width: 16 }, { header: 'Medio de pago', key: 'medio', width: 14 },
        { header: 'Monto', key: 'monto', width: 12, tipo: 'dinero' },
        { header: 'Monto válido', key: 'valido', width: 13, tipo: 'dinero' },
        { header: 'Estado', key: 'estado', width: 11 },
        { header: 'Descripción', key: 'desc', width: 36 },
      ], data.map((g: any) => ({
        fecha: dFecha(g.fecha), tipo: GASTO[g.tipo] ?? g.tipo, ben: g.proveedor_beneficiario ?? '', ruc: g.ruc ?? '',
        doc: g.documento ?? '', medio: MEDIO[g.medio_pago] ?? '', monto: Number(g.monto),
        valido: g.anulado ? 0 : Number(g.monto), estado: g.anulado ? 'CANCELADO' : 'Válido',
        desc: g.descripcion ?? '',
      })))
      archivo = `gastos_${desde}_a_${hasta}.xlsx`
    }

    // ------------------------------------------------ RESUMEN
    if (tipo === 'resumen') {
      const [vs, det, gs, cs] = await Promise.all([
        traer((a, b) => supabase.from('ventas').select('id, total, medio_pago').eq('anulada', false)
          .gte('fecha_venta', ini).lt('fecha_venta', fin).order('id').range(a, b)),
        traer((a, b) => supabase.from('detalle_venta')
          .select('id, cantidad, precio_venta, costo_unitario, es_bonificacion, tipo_item, productos(nombre, viscosidad_codigo, marcas(nombre)), ventas!inner(fecha_venta, anulada)')
          .eq('ventas.anulada', false).gte('ventas.fecha_venta', ini).lt('ventas.fecha_venta', fin)
          .order('id').range(a, b)),
        traer((a, b) => supabase.from('gastos').select('id, monto').eq('anulado', false).gte('fecha', desde).lte('fecha', hasta).order('id').range(a, b)),
        traer((a, b) => supabase.from('compras').select('id, total').gte('fecha_pedido', desde).lte('fecha_pedido', hasta).order('id').range(a, b)),
      ])
      const suma = (arr: any[], k: string) => arr.reduce((s, x) => s + Number(x[k]), 0)
      const ventas = suma(vs, 'total')
      const costo = det.reduce((s: number, d: any) => s + (d.tipo_item === 'producto' ? Number(d.cantidad) * Number(d.costo_unitario ?? 0) : 0), 0)
      const gastos = suma(gs, 'monto')
      const compras = suma(cs, 'total')
      const neta = ventas - costo - gastos

      const porMedio: Record<string, number> = {}
      vs.forEach((v: any) => (porMedio[v.medio_pago] = (porMedio[v.medio_pago] ?? 0) + Number(v.total)))

      const filas: any[] = [
        { c: 'Ventas', v: ventas }, { c: 'Costo de lo vendido', v: costo },
        { c: 'Ganancia bruta', v: ventas - costo }, { c: 'Gastos', v: gastos },
        { c: 'GANANCIA NETA', v: neta }, { c: 'Margen neto (%)', v: ventas > 0 ? Math.round((neta / ventas) * 1000) / 10 : 0 },
        { c: '', v: null }, { c: 'Compras del período (informativo)', v: compras },
        { c: 'Flujo de caja (ventas − compras − gastos)', v: ventas - compras - gastos },
        { c: '', v: null }, { c: 'Ventas por medio de pago', v: null },
        ...Object.entries(porMedio).map(([k, v]) => ({ c: `   ${MEDIO[k] ?? k}`, v })),
      ]
      const ws = hoja(wb, 'Resumen', [
        { header: `Período: ${desde} al ${hasta}`, key: 'c', width: 46 },
        { header: 'Monto (S/)', key: 'v', width: 16, tipo: 'dinero' },
      ], filas)
      ws.getRow(6).font = { bold: true }

      const rot: Record<string, { u: number; ing: number; gan: number }> = {}
      det.forEach((d: any) => {
        if (d.tipo_item !== 'producto' || !d.productos) return
        const n = nombreProd(d.productos)
        const r = (rot[n] ??= { u: 0, ing: 0, gan: 0 })
        const sub = d.es_bonificacion ? 0 : Number(d.precio_venta) * Number(d.cantidad)
        r.u += d.es_bonificacion ? 0 : Number(d.cantidad)
        r.ing += sub
        r.gan += sub - Number(d.cantidad) * Number(d.costo_unitario ?? 0)
      })
      hoja(wb, 'Rotación', [
        { header: 'Producto', key: 'n', width: 44 }, { header: 'Unidades vendidas', key: 'u', width: 18, tipo: 'entero' },
        { header: 'Ingresos', key: 'ing', width: 14, tipo: 'dinero' }, { header: 'Ganancia', key: 'gan', width: 14, tipo: 'dinero' },
      ], Object.entries(rot).sort((a, b) => b[1].u - a[1].u).map(([n, r]) => ({ n, ...r })))
      archivo = `resumen_${desde}_a_${hasta}.xlsx`
    }

    const buf = await wb.xlsx.writeBuffer()
    return new Response(new Uint8Array(buf as ArrayBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${archivo}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Error al generar el archivo', 500)
  }
}