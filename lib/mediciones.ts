export type EstadoMed = 'bueno' | 'regular' | 'malo'
export type EstadoGuardado = EstadoMed | 'no_revisado'
export type Zona = { desde: number; hasta: number; estado: EstadoMed }

export type MedicionDef = {
  campo: 'bateria' | 'alternador' | 'frenos' | 'refrigerante'
  label: string
  unidad: string
  min: number
  max: number
  paso: number
  ayuda: string
  leyenda: string
  zonas: Zona[]
}

export type MedicionResumen = {
  label: string
  valor: number | null
  unidad: string
  min: number
  max: number
  zonas: Zona[]
  estado: EstadoGuardado
}

export const ETIQUETA_ESTADO: Record<string, string> = {
  bueno: 'Bueno',
  regular: 'Regular',
  malo: 'Malo',
  no_revisado: 'No se realizó',
}

export const COLOR_ESTADO: Record<string, string> = {
  bueno: '#3DDC97',
  regular: '#FFC107',
  malo: '#FF6B5E',
}

export const MEDICIONES: MedicionDef[] = [
  {
    campo: 'bateria',
    label: 'Batería',
    unidad: 'V',
    min: 9,
    max: 14,
    paso: 0.1,
    ayuda: 'Voltaje en reposo, motor apagado',
    leyenda: 'Malo < 12.2 V · Regular 12.2–12.6 V · Bueno ≥ 12.6 V',
    zonas: [
      { desde: 9, hasta: 12.2, estado: 'malo' },
      { desde: 12.2, hasta: 12.6, estado: 'regular' },
      { desde: 12.6, hasta: 14, estado: 'bueno' },
    ],
  },
  {
    campo: 'alternador',
    label: 'Alternador',
    unidad: 'V',
    min: 11,
    max: 16,
    paso: 0.1,
    ayuda: 'Voltaje con el motor encendido',
    leyenda: 'Bueno 13.7–14.7 V · Regular 13.0–13.7 o 14.7–15.0 V · Malo fuera de ese rango',
    zonas: [
      { desde: 11, hasta: 13, estado: 'malo' },
      { desde: 13, hasta: 13.7, estado: 'regular' },
      { desde: 13.7, hasta: 14.7, estado: 'bueno' },
      { desde: 14.7, hasta: 15, estado: 'regular' },
      { desde: 15, hasta: 16, estado: 'malo' },
    ],
  },
  {
    campo: 'frenos',
    label: 'Líquido de frenos',
    unidad: '% humedad',
    min: 0,
    max: 5,
    paso: 0.1,
    ayuda: 'Porcentaje de agua en el líquido (máx. 5%)',
    leyenda: 'Bueno < 2% · Regular 2–3% · Malo ≥ 3%',
    zonas: [
      { desde: 0, hasta: 2, estado: 'bueno' },
      { desde: 2, hasta: 3, estado: 'regular' },
      { desde: 3, hasta: 5, estado: 'malo' },
    ],
  },
  {
    campo: 'refrigerante',
    label: 'Refrigerante',
    unidad: '% concentración',
    min: 0,
    max: 100,
    paso: 1,
    ayuda: 'Concentración de anticongelante en la mezcla',
    leyenda: 'Bueno 40–60% · Regular 30–40 o 60–70% · Malo < 30 o ≥ 70%',
    zonas: [
      { desde: 0, hasta: 30, estado: 'malo' },
      { desde: 30, hasta: 40, estado: 'regular' },
      { desde: 40, hasta: 60, estado: 'bueno' },
      { desde: 60, hasta: 70, estado: 'regular' },
      { desde: 70, hasta: 100, estado: 'malo' },
    ],
  },
]

export function estadoDe(def: MedicionDef, valor: number): EstadoMed {
  if (Number.isNaN(valor)) return 'bueno'
  const z = def.zonas.find((z) => valor >= z.desde && valor < z.hasta)
  if (z) return z.estado
  return valor >= def.max ? def.zonas[def.zonas.length - 1].estado : def.zonas[0].estado
}