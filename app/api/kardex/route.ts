import { NextResponse, type NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type Mov = {
  producto_id: number
  fecha: string
  tipo: string
  documento: string | null
  tercero: string | null
  entrada: number
  salida: number
  costo_unitario: number | null
  motivo: string | null
}

type Fila = {
  fecha: string
  tipo: string
  documento: string
  tercero: string
  motivo: string
  ent: number; entCU: number; entTot: number
  sal: number; salCU: number; salTot: number
  qty: number; cu: number; val: number
}

type Estado = { qty: number; val: number; avg: number }

const ETIQUETA: Record<string, string> = {
  compra: 'Compra',
  venta: 'Venta',
  bonificacion: 'Bonificación (sin cobro)',
  anulacion: 'Anulación de venta',
  ajuste: 'Ajuste por conteo físico',
}

const OSCURO = 'FF1F2A2E'
const AMARILLO = 'FFFFC107'

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-PE', {
    timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
const fechaCorta = (iso: string) => iso.split('-').reverse().join('/')
const nombreProd = (p: any) =>
  [p.marcas?.nombre, p.nombre, p.viscosidad_codigo, p.presentacion].filter(Boolean).join(' ')

async function traerTodo(armar: (a: number, b: number) => any): Promise<any[]> {
  const out: any[] = []
  for (let i = 0; ; i += 1000) {
    const { data, error } = await armar(i, i + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

function calcular(p: any, movs: Mov[], desdeMs: number, hastaMs: number) {
  const neto = movs.reduce((s, m) => s + Number(m.entrada) - Number(m.salida), 0)
  const qty0 = Number(p.stock) - neto
  const primera = movs.find((m) => m.tipo === 'compra' && m.costo_unitario != null)
  const cu0 = Number(primera?.costo_unitario ?? p.precio_compra ?? 0)

  let qty = qty0
  let val = qty0 * cu0
  let avg = cu0
  let apertura: Estado | null = null
  const filas: Fila[] = []

  for (const m of movs) {
    const t = Date.parse(m.fecha)
    if (!apertura && t >= desdeMs) apertura = { qty, val, avg }
    if (t > hastaMs) break

    const e = Number(m.entrada)
    const s = Number(m.salida)
    let entCU = 0
    let salCU = 0
    if (e > 0) {
      entCU = m.tipo === 'compra' ? Number(m.costo_unitario ?? avg) : avg
      val += e * entCU
      qty += e
      avg = qty > 0 ? val / qty : avg
    }
    if (s > 0) {
      salCU = avg
      val -= s * salCU
      qty -= s
    }
    if (Math.abs(qty) < 1e-9) val = 0

    if (t >= desdeMs) {
      filas.push({
        fecha: fechaHora(m.fecha),
        tipo: ETIQUETA[m.tipo] ?? m.tipo,
        documento: m.documento ?? '',
        tercero: m.tercero ?? '',
        motivo: m.motivo ?? '',
        ent: e, entCU, entTot: e * entCU,
        sal: s, salCU, salTot: s * salCU,
        qty, cu: avg, val,
      })
    }
  }
  if (!apertura) apertura = { qty, val, avg }

  const tot = filas.reduce(
    (a, f) => ({
      entQty: a.entQty + f.ent, entVal: a.entVal + f.entTot,
      salQty: a.salQty + f.sal, salVal: a.salVal + f.salTot,
    }),
    { entQty: 0, entVal: 0, salQty: 0, salVal: 0 },
  )
  return { filas, apertura, cierre: { qty, val, avg } as Estado, tot, qty0 }
}

type Resultado = ReturnType<typeof calcular>

function pintar(cell: ExcelJS.Cell, fondo: string, color = 'FFFFFFFF') {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondo } }
  cell.font = { bold: true, color: { argb: color } }
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
}

function hojaProducto(wb: ExcelJS.Workbook, org: string, p: any, r: Resultado, desde: string, hasta: string) {
  const ws = wb.addWorksheet('Kardex', { views: [{ state: 'frozen', ySplit: 17 }] })
  ws.columns = [
    { width: 17 }, { width: 24 }, { width: 16 }, { width: 28 }, { width: 28 },
    { width: 10 }, { width: 11 }, { width: 13 },
    { width: 10 }, { width: 11 }, { width: 13 },
    { width: 10 }, { width: 11 }, { width: 13 },
  ]

  ws.mergeCells('A1:N1')
  ws.getCell('A1').value = 'KARDEX · REGISTRO DE INVENTARIO PERMANENTE VALORIZADO'
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.mergeCells('A2:N2')
  ws.getCell('A2').value = 'Método de valuación: promedio ponderado · Unidad de medida: unidad (UND)'
  ws.getCell('A2').font = { italic: true, color: { argb: 'FF55646A' } }

  const info: [string, string][] = [
    ['Empresa', org],
    ['Producto', nombreProd(p)],
    ['Códigos', `Tienda: ${p.codigo_tienda ?? '—'}  ·  EAN: ${p.ean ?? '—'}  ·  Producto: ${p.codigo ?? '—'}`],
    ['Presentación', p.presentacion ?? '—'],
    ['Período', `${fechaCorta(desde)} al ${fechaCorta(hasta)}`],
  ]
  info.forEach(([k, v], i) => {
    const row = 4 + i
    ws.getCell(`A${row}`).value = k
    ws.getCell(`A${row}`).font = { bold: true }
    ws.mergeCells(`B${row}:H${row}`)
    ws.getCell(`B${row}`).value = v
  })

  ;['RESUMEN', 'Cantidad', 'Valor (S/)'].forEach((t, i) => pintar(ws.getCell(10, 1 + i), OSCURO))
  ws.getCell('A10').value = 'RESUMEN'
  ws.getCell('B10').value = 'Cantidad'
  ws.getCell('C10').value = 'Valor (S/)'
  const resumen: [string, number, number][] = [
    ['Saldo inicial', r.apertura.qty, r.apertura.val],
    ['Entradas', r.tot.entQty, r.tot.entVal],
    ['Salidas', r.tot.salQty, r.tot.salVal],
    ['Saldo final', r.cierre.qty, r.cierre.val],
  ]
  resumen.forEach(([k, q, v], i) => {
    const row = 11 + i
    ws.getCell(`A${row}`).value = k
    ws.getCell(`A${row}`).font = { bold: true }
    ws.getCell(`B${row}`).value = q
    ws.getCell(`B${row}`).numFmt = '#,##0'
    ws.getCell(`C${row}`).value = v
    ws.getCell(`C${row}`).numFmt = '#,##0.00'
  })

  if (r.qty0 < 0) {
    ws.mergeCells('A15:N15')
    ws.getCell('A15').value =
      'Atención: el stock actual es menor que los movimientos registrados. Revisa los ajustes de inventario.'
    ws.getCell('A15').font = { italic: true, color: { argb: 'FFD64545' } }
  }

  // Encabezados
  ;['Fecha', 'Operación', 'Documento', 'Cliente / Proveedor', 'Motivo'].forEach((t, i) => {
    const col = String.fromCharCode(65 + i)
    ws.mergeCells(`${col}16:${col}17`)
    ws.getCell(`${col}16`).value = t
  })
  ws.mergeCells('F16:H16'); ws.getCell('F16').value = 'ENTRADAS'
  ws.mergeCells('I16:K16'); ws.getCell('I16').value = 'SALIDAS'
  ws.mergeCells('L16:N16'); ws.getCell('L16').value = 'SALDO'
  const sub = ['Cant.', 'C. unit.', 'Total']
  for (let g = 0; g < 3; g++) sub.forEach((t, i) => (ws.getCell(17, 6 + g * 3 + i).value = t))
  for (let c = 1; c <= 14; c++) {
    pintar(ws.getCell(16, c), c >= 6 ? (c <= 8 ? 'FF2E9E6B' : c <= 11 ? 'FFD64545' : 'FF1F6FA5') : OSCURO)
    pintar(ws.getCell(17, c), c >= 6 ? (c <= 8 ? 'FF2E9E6B' : c <= 11 ? 'FFD64545' : 'FF1F6FA5') : OSCURO)
  }

  // Saldo inicial del período
  const ini = 18
  ws.getCell(`A${ini}`).value = fechaCorta(desde)
  ws.getCell(`B${ini}`).value = 'Saldo inicial'
  ws.getCell(`L${ini}`).value = r.apertura.qty
  ws.getCell(`M${ini}`).value = r.apertura.avg
  ws.getCell(`N${ini}`).value = r.apertura.val
  ws.getRow(ini).font = { bold: true }

  r.filas.forEach((f, i) => {
    const row = ini + 1 + i
    ws.getCell(`A${row}`).value = f.fecha
    ws.getCell(`B${row}`).value = f.tipo
    ws.getCell(`C${row}`).value = f.documento
    ws.getCell(`D${row}`).value = f.tercero
    ws.getCell(`E${row}`).value = f.motivo
    if (f.ent > 0) {
      ws.getCell(`F${row}`).value = f.ent
      ws.getCell(`G${row}`).value = f.entCU
      ws.getCell(`H${row}`).value = f.entTot
    }
    if (f.sal > 0) {
      ws.getCell(`I${row}`).value = f.sal
      ws.getCell(`J${row}`).value = f.salCU
      ws.getCell(`K${row}`).value = f.salTot
    }
    ws.getCell(`L${row}`).value = f.qty
    ws.getCell(`M${row}`).value = f.cu
    ws.getCell(`N${row}`).value = f.val
  })

  const ultima = ini + r.filas.length
  const tot = ultima + 1
  ws.mergeCells(`A${tot}:E${tot}`)
  ws.getCell(`A${tot}`).value = 'TOTALES DEL PERÍODO'
  const sumar = (col: string, resultado: number) => {
    ws.getCell(`${col}${tot}`).value =
      r.filas.length > 0
        ? { formula: `SUM(${col}${ini + 1}:${col}${ultima})`, result: resultado }
        : 0
  }
  sumar('F', r.tot.entQty); sumar('H', r.tot.entVal)
  sumar('I', r.tot.salQty); sumar('K', r.tot.salVal)
  ws.getCell(`L${tot}`).value = r.cierre.qty
  ws.getCell(`M${tot}`).value = r.cierre.avg
  ws.getCell(`N${tot}`).value = r.cierre.val
  ws.getRow(tot).font = { bold: true }
  for (let c = 1; c <= 14; c++) {
    ws.getCell(tot, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMARILLO } }
  }

  for (let row = ini; row <= tot; row++) {
    for (const c of ['F', 'I', 'L']) ws.getCell(`${c}${row}`).numFmt = '#,##0;[Red]-#,##0'
    for (const c of ['G', 'H', 'J', 'K', 'M', 'N']) ws.getCell(`${c}${row}`).numFmt = '#,##0.00;[Red]-#,##0.00'
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: perfil } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo el administrador puede exportar el kardex' }, { status: 403 })
  }

  const sp = req.nextUrl.searchParams
  const FECHA = /^\d{4}-\d{2}-\d{2}$/
  const desde = sp.get('desde') ?? ''
  const hasta = sp.get('hasta') ?? ''
  if (!FECHA.test(desde) || !FECHA.test(hasta) || desde > hasta) {
    return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 })
  }
  const desdeMs = Date.parse(`${desde}T00:00:00-05:00`)
  const hastaMs = Date.parse(`${hasta}T23:59:59.999-05:00`)
  const idProd = sp.get('producto')
  const marca = sp.get('marca') ?? ''

  try {
    const { data: org } = await supabase.from('organizaciones').select('nombre').single()
    const orgNombre = org?.nombre ?? 'Lubricentro'
    const wb = new ExcelJS.Workbook()
    wb.creator = orgNombre

    const colsProd =
      'id, nombre, viscosidad_codigo, codigo, codigo_tienda, ean, presentacion, stock, precio_compra, precio_venta, marcas(nombre)'
    const colsMov =
      'producto_id, fecha, tipo, documento, tercero, entrada, salida, costo_unitario, motivo'

    let archivo = ''

    if (idProd) {
      const { data: p } = await supabase.from('productos').select(colsProd).eq('id', idProd).single()
      if (!p) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
      const movs = (await traerTodo((a, b) =>
        supabase.from('movimientos_inventario').select(colsMov)
          .eq('producto_id', idProd).order('fecha').order('tipo').order('ref_id').range(a, b),
      )) as Mov[]
      hojaProducto(wb, orgNombre, p, calcular(p, movs, desdeMs, hastaMs), desde, hasta)
      archivo = `kardex-${p.codigo_tienda ?? p.id}-${desde}_${hasta}.xlsx`
    } else {
      const productos = (
        await traerTodo((a, b) =>
          supabase.from('productos').select(colsProd).order('id').range(a, b),
        )
      ).filter((p: any) => !marca || p.marcas?.nombre === marca)
      const movs = (await traerTodo((a, b) =>
        supabase.from('movimientos_inventario').select(colsMov)
          .order('fecha').order('tipo').order('ref_id').range(a, b),
      )) as Mov[]
      const porProducto = new Map<number, Mov[]>()
      movs.forEach((m) => porProducto.set(m.producto_id, [...(porProducto.get(m.producto_id) ?? []), m]))

      // Hoja 1: valorizado
      const wsV = wb.addWorksheet('Valorizado', { views: [{ state: 'frozen', ySplit: 4 }] })
      wsV.mergeCells('A1:N1')
      wsV.getCell('A1').value = `KARDEX VALORIZADO · ${orgNombre}${marca ? ` · ${marca}` : ''} · ${fechaCorta(desde)} al ${fechaCorta(hasta)}`
      wsV.getCell('A1').font = { bold: true, size: 14 }
      wsV.mergeCells('A2:N2')
      wsV.getCell('A2').value = 'Método de valuación: promedio ponderado. P. venta y margen son datos internos: no compartir.'
      wsV.getCell('A2').font = { italic: true, color: { argb: 'FF55646A' } }
      const cab = ['Cód. tienda', 'EAN', 'Cód. producto', 'Producto', 'Presentación',
        'Saldo inicial', 'Entradas', 'Salidas', 'Saldo final', 'Costo prom.', 'Valor final',
        'P. venta', 'Margen S/', 'Margen %']
      cab.forEach((t, i) => {
        const c = wsV.getCell(4, i + 1)
        c.value = t
        pintar(c, OSCURO)
      })
      const anchos = [13, 16, 15, 38, 14, 11, 10, 10, 11, 11, 13, 10, 10, 10]
      anchos.forEach((w, i) => (wsV.getColumn(i + 1).width = w))

      // Hoja 2: movimientos
      const wsM = wb.addWorksheet('Movimientos', { views: [{ state: 'frozen', ySplit: 1 }] })
      const cabM = ['Fecha', 'Cód. tienda', 'Producto', 'Operación', 'Documento', 'Cliente / Proveedor',
        'Motivo', 'Entrada', 'Salida', 'C. unit.', 'Total']
      cabM.forEach((t, i) => {
        const c = wsM.getCell(1, i + 1)
        c.value = t
        pintar(c, OSCURO)
      })
      ;[17, 13, 38, 24, 14, 28, 28, 10, 10, 11, 13].forEach((w, i) => (wsM.getColumn(i + 1).width = w))

      let filaV = 5
      let filaM = 2
      for (const p of productos) {
        const r = calcular(p, porProducto.get(p.id) ?? [], desdeMs, hastaMs)
        const margen = Number(p.precio_venta) - r.cierre.avg
        const fila = [
          p.codigo_tienda ?? '', p.ean ?? '', p.codigo ?? '', nombreProd(p), p.presentacion ?? '',
          r.apertura.qty, r.tot.entQty, r.tot.salQty, r.cierre.qty, r.cierre.avg, r.cierre.val,
          Number(p.precio_venta), margen,
          Number(p.precio_venta) > 0 ? margen / Number(p.precio_venta) : null,
        ]
        fila.forEach((v, i) => (wsV.getCell(filaV, i + 1).value = v as any))
        for (const c of [6, 7, 8, 9]) wsV.getCell(filaV, c).numFmt = '#,##0;[Red]-#,##0'
        for (const c of [10, 11, 12, 13]) wsV.getCell(filaV, c).numFmt = '#,##0.00;[Red]-#,##0.00'
        wsV.getCell(filaV, 14).numFmt = '0%'
        filaV++

        for (const f of r.filas) {
          const unit = f.ent > 0 ? f.entCU : f.salCU
          const total = f.ent > 0 ? f.entTot : f.salTot
          ;[f.fecha, p.codigo_tienda ?? '', nombreProd(p), f.tipo, f.documento, f.tercero, f.motivo,
            f.ent || null, f.sal || null, unit, total].forEach((v, i) => (wsM.getCell(filaM, i + 1).value = v as any))
          wsM.getCell(filaM, 10).numFmt = '#,##0.00'
          wsM.getCell(filaM, 11).numFmt = '#,##0.00'
          filaM++
        }
      }

      // Totales de la hoja Valorizado
      if (filaV > 5) {
        const tot = filaV
        wsV.getCell(tot, 1).value = 'TOTALES'
        for (const [col, letra] of [[7, 'G'], [8, 'H'], [9, 'I'], [11, 'K']] as const) {
          wsV.getCell(tot, col).value = { formula: `SUM(${letra}5:${letra}${tot - 1})` }
          wsV.getCell(tot, col).numFmt = col === 11 ? '#,##0.00' : '#,##0'
        }
        for (let c = 1; c <= 14; c++) {
          wsV.getCell(tot, c).font = { bold: true }
          wsV.getCell(tot, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMARILLO } }
        }
      }
      archivo = `kardex-general${marca ? `-${marca.replace(/[^\w-]+/g, '_')}` : ''}-${desde}_${hasta}.xlsx`
    }

    const buffer = await wb.xlsx.writeBuffer()
    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${archivo}"`,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'No se pudo generar el kardex' },
      { status: 500 },
    )
  }
}