import { STOCK_BAJO } from '@/lib/constants'

export type CampoDef = {
  clave: string
  etiqueta: string
  opciones?: string[] // si existe, se muestra como lista desplegable
  placeholder?: string
  multilinea?: boolean // cuadro de texto grande
  enResumen?: boolean // false = no se muestra en tarjetas ni tablas
}

export type ConfigTipo = {
  usaViscosidad: boolean
  etiquetaCodigo: string
  placeholderNombre: string
  presentaciones: string[]
  presentacionFija?: boolean
  campos: CampoDef[]
}

const UNIDADES = ['Unidad', 'Par', 'Juego']

function filtro(placeholderNombre: string): ConfigTipo {
  return {
    usaViscosidad: false,
    etiquetaCodigo: 'Código del filtro',
    placeholderNombre,
    presentaciones: UNIDADES,
    campos: [
      {
        clave: 'codigo_alterno',
        etiqueta: 'Códigos compatibles (separados por coma)',
        placeholder: 'Ej. W712/75, PH5796, C-1234',
      },
      {
        clave: 'vehiculos',
        etiqueta: 'Vehículos compatibles (uno por línea: marca, modelo y años)',
        placeholder: 'Toyota Hilux 2005-2015\nHyundai Accent 2012-2018',
        multilinea: true,
        enResumen: false,
      },
    ],
  }
}

export const CAMPOS_POR_TIPO: Record<string, ConfigTipo> = {
  lubricante: {
    usaViscosidad: true,
    etiquetaCodigo: 'Código del fabricante',
    placeholderNombre: 'Ej. HIGHTEC SYNT RSi',
    presentaciones: ['1 L', '3.78 L', '4 L', '5 L', '20 L', '60 L', '200 L', '208 L'],
    presentacionFija: true,
    campos: [
      { clave: 'base', etiqueta: 'Base del aceite', opciones: ['Full sintético', 'Sintético', 'Semisintético', 'Mineral'] },
      {
        clave: 'uso',
        etiqueta: 'Uso',
        opciones: [
          'Motor gasolina', 'Motor diésel', 'Motor gasolina/diésel', 'Motor GNV/GLP',
          'Moto 4T', 'Moto 2T', 'Caja manual', 'Caja automática (ATF)', 'Diferencial',
          'Hidráulico', 'Grasa', 'Refrigerante', 'Líquido de frenos',
        ],
      },
      { clave: 'especificacion', etiqueta: 'Especificación', placeholder: 'API SN, ACEA C3, dexos1' },
    ],
  },
    refrigerante: {
    usaViscosidad: false,
    etiquetaCodigo: 'Código del fabricante',
    placeholderNombre: 'Ej. Refrigerante largo vida',
    presentaciones: ['1 L', '3.78 L', '4 L', '5 L', '20 L', '60 L', '200 L', '208 L'],
    campos: [
      { clave: 'mezcla', etiqueta: 'Mezcla', opciones: ['Concentrado', 'Premezclado 50/50'] },
      { clave: 'color', etiqueta: 'Color', opciones: ['Verde', 'Rojo', 'Naranja', 'Azul', 'Amarillo', 'Rosado'] },
      { clave: 'tecnologia', etiqueta: 'Tecnología', opciones: ['IAT', 'OAT', 'HOAT'] },
    ],
  },
  filtro_aceite: filtro('Ej. Filtro de aceite Hilux'),
  filtro_aire: filtro('Ej. Filtro de aire Hilux'),
  filtro_combustible: filtro('Ej. Filtro de combustible Hilux'),
  filtro_cabina: filtro('Ej. Filtro de cabina Hilux'),
  aditivo: {
    usaViscosidad: false,
    etiquetaCodigo: 'Código del fabricante',
    placeholderNombre: 'Ej. Limpia inyectores',
    presentaciones: ['250 ml', '354 ml', '500 ml', '1 L'],
    campos: [
      {
        clave: 'funcion',
        etiqueta: 'Función',
        opciones: [
          'Limpia inyectores', 'Limpia sistema de combustible', 'Tratamiento de aceite',
          'Antifricción', 'Sellador de fugas', 'Tratamiento de radiador',
          'Mejorador de octano/cetano', 'Limpiador de DPF', 'Otro',
        ],
      },
      {
        clave: 'aplica_a',
        etiqueta: 'Se aplica a',
        opciones: ['Gasolina', 'Diésel', 'Aceite de motor', 'Refrigerante', 'Transmisión', 'Otro'],
      },
    ],
  },
  accesorio_electrico: {
    usaViscosidad: false,
    etiquetaCodigo: 'Código / modelo',
    placeholderNombre: 'Ej. Foco H4',
    presentaciones: UNIDADES,
    campos: [
      {
        clave: 'subcategoria',
        etiqueta: 'Subcategoría',
        opciones: ['Luces', 'Relay', 'Bocina', 'Fusible', 'Batería', 'Sensor', 'Cable / conector', 'Otro'],
      },
      { clave: 'voltaje', etiqueta: 'Voltaje', opciones: ['12 V', '24 V', '12/24 V'] },
      { clave: 'modelo', etiqueta: 'Tipo o potencia', placeholder: 'H4, H7, LED 55 W' },
    ],
  },
  repuesto: {
    usaViscosidad: false,
    etiquetaCodigo: 'Código de parte / OEM',
    placeholderNombre: 'Ej. Pastillas de freno delanteras',
    presentaciones: UNIDADES,
    campos: [
      {
        clave: 'codigo_alterno',
        etiqueta: 'Códigos compatibles (separados por coma)',
        placeholder: 'Ej. 04465-0K240, DB1234',
      },
      {
        clave: 'vehiculos',
        etiqueta: 'Vehículos compatibles (uno por línea: marca, modelo y años)',
        placeholder: 'Toyota Hilux 2005-2015',
        multilinea: true,
        enResumen: false,
      },
    ],
  },
}

export const CONFIG_POR_DEFECTO: ConfigTipo = {
  usaViscosidad: false,
  etiquetaCodigo: 'Código',
  placeholderNombre: 'Nombre del producto',
  presentaciones: UNIDADES,
  campos: [],
}

export function configDeTipo(tipo: string): ConfigTipo {
  return CAMPOS_POR_TIPO[tipo] ?? CONFIG_POR_DEFECTO
}

export type DatosExtra = {
  ean: string
  codigo: string
  presentacion: string
  stock_minimo: string // vacío = usar el mínimo general
  ubicacion: string
  atributos: Record<string, string>
}

export const EXTRA_VACIO: DatosExtra = {
  ean: '',
  codigo: '',
  presentacion: '',
  stock_minimo: '',
  ubicacion: '',
  atributos: {},
}

export function limpiarAtributos(a: Record<string, string>) {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(a)) {
    if (v && v.trim()) out[k] = v.trim()
  }
  return out
}

// Texto corto con los datos propios del tipo (para tarjetas y tablas)
export function resumenAtributos(tipo: string, atributos: Record<string, unknown> | null | undefined) {
  if (!atributos) return ''
  return configDeTipo(tipo)
    .campos.filter((c) => c.enResumen !== false)
    .map((c) => atributos[c.clave])
    .filter((v) => typeof v === 'string' && v)
    .join(' · ')
}

// Stock mínimo del producto; si no tiene uno propio, se usa el general
export function minimoDe(stockMinimo: number | null | undefined) {
  return stockMinimo ?? STOCK_BAJO
}

// Todos los valores de los atributos en un solo texto (para buscar)
export function textoAtributos(atributos: Record<string, unknown> | null | undefined, incluirVehiculos = true) {
  if (!atributos) return ''
  return Object.entries(atributos)
    .filter(([k, v]) => (incluirVehiculos || k !== 'vehiculos') && typeof v === 'string' && v)
    .map(([, v]) => v as string)
    .join(' ')
}